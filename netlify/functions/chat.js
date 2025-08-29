const { extractText } = require("./_extractText.js");
const { join } = require('path');
const { pathToFileURL } = require('url');

// Quick response will be loaded dynamically when needed

// === add: forbidden key sanitizer =========================
const FORBIDDEN_KEYS = new Set([
  'temperature', 'top_p', 'presence_penalty', 'frequency_penalty',
  'response_format', 'logit_bias', 'seed'
]);

function deepDeleteKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) { obj.forEach(deepDeleteKeys); return obj; }
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(k)) delete obj[k];
    else deepDeleteKeys(obj[k]);
  }
  return obj;
}

function sanitizeResponsesPayload(p) {
  return deepDeleteKeys(p);
}

// ---- ESM の絶対URL生成（Lambda/ローカル両対応）-----------------
function esmUrlFromSrc(...segmentsFromSrc) {
  const isLambda = !!process.env.LAMBDA_TASK_ROOT;
  const base = isLambda ? process.env.LAMBDA_TASK_ROOT : __dirname;
  // Lambda: /var/task/src/...
  // Local/Preview: <project>/netlify/functions/../../src/...
  const abs = isLambda
    ? join(base, 'src', ...segmentsFromSrc)
    : join(base, '..', '..', 'src', ...segmentsFromSrc);
  return pathToFileURL(abs).href; // import() に渡せる file:// URL
}

/**
 * Cached ESM module loaders with lazy loading
 */
let _intentMod, _routerMod, _promptMod;

async function loadIntent() {
  if (!_intentMod) {
    _intentMod = await import(esmUrlFromSrc('intent', 'intent-classifier.mjs'));
  }
  return _intentMod;
}

async function loadRouter() {
  if (!_routerMod) {
    _routerMod = await import(esmUrlFromSrc('agent', 'router.mjs'));
  }
  return _routerMod;
}

async function loadPrompt() {
  if (!_promptMod) {
    _promptMod = await import(esmUrlFromSrc('prompt', 'build-system-prompt.mjs'));
  }
  return _promptMod;
}

/**
 * Convert messages array to Responses API input format
 */
function toResponsesInputFromMessages(messages = []) {
  return messages.map(m => ({
    role: m.role,
    content: [{ type: 'input_text', text: String(m.content ?? '') }]
  }));
}

/**
 * Safe JSON parse helper
 */
function parseJson(str) {
  try {
    return JSON.parse(str || '{}');
  } catch {
    return {};
  }
}

/**
 * Retry function for handling transient errors
 */
async function withRetry(fn, { tries = 3, base = 250 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { 
      return await fn(); 
    } catch (e) {
      lastErr = e;
      const msg = e?.message || '';
      const is5xx = /5\d\d/.test(e?.status?.toString?.() || '');
      const serverErr = msg.includes('server_error');
      
      if (i < tries - 1 && (is5xx || serverErr)) {
        await new Promise(r => setTimeout(r, base * (i + 1) + Math.random() * 200));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

exports.handler = async function handler(event, context) {
  // Extract common variables upfront
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const sessionId = event.headers?.['x-session-id'] || 
                   event.headers?.['X-Session-Id'] || 
                   `session-${Date.now()}`;
  
  // Parse URL for modes
  const url = new URL(event.rawUrl || event.url || 'http://localhost');
  const isRaw = url.searchParams.get('raw') === '1';
  const bypass = url.searchParams.get('bypass') === '1';
  const debug = url.searchParams.get('debug') === '1';
  const selftest = url.pathname?.includes('selftest');
  
  // Smaichan mode control (default: enabled, can be disabled via env var)
  const enableSmaichan = process.env.DISABLE_SMAICHAN !== 'true';
  
  // Initialize common headers with x-domain always set
  const headers = new Headers({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'x-model': model,
    'x-session-id': sessionId,
    'x-domain': 'general',  // Default domain
    'x-backend': 'openai',
    'x-smaichan': enableSmaichan ? 'enabled' : 'disabled',
    'x-deploy-id': process.env.DEPLOY_ID || '',
    'x-commit': process.env.COMMIT_REF || ''
  });

    // --- CORS preflight (OPTIONS) early return ---
  if (event.httpMethod === 'OPTIONS') {
    headers.set('access-control-allow-origin', '*');
    headers.set('access-control-allow-headers', 'Content-Type, X-Session-Id, Authorization');
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    return {
      statusCode: 200,
      headers: Object.fromEntries(headers),
      body: ''
    };
  }
  // --- end preflight ---

  try {
    const body = parseJson(event.body);
    
    // Initialize variables
    let domain = 'general';
    let systemPrompt = '';
    let userText = '';
    let input;
    let messageComplexity = null; // Move to outer scope

    // === EARLY RETURN PATHS (no ESM loading) ===
    
    // Handle selftest mode
    if (selftest) {
      headers.set('x-domain', 'selftest');
      return {
        statusCode: 200,
        headers: Object.fromEntries(headers),
        body: JSON.stringify({
          status: 'ok',
          mode: 'selftest',
          timestamp: new Date().toISOString()
        })
      };
    }

// Handle bypass mode (skip router, no ESM loading)
if (bypass) {
  headers.set('x-domain', 'bypass');
  headers.set('x-backend', 'openai-bypass');

  // messages → Responses API 形式へ
  input = toResponsesInputFromMessages(body.messages || []);

  // 入力ガード：最低1メッセージ必要
  if (!Array.isArray(input) || input.length === 0) {
    headers.set('x-error','bad_bypass_input');
    return {
      statusCode: 400,
      headers: Object.fromEntries(headers),
      body: JSON.stringify({
        error: 'bad_bypass_input',
        hint: 'body.messages must contain at least one message'
      })
    };
  }
}

// Handle raw mode (no routing, direct input)
else if (isRaw) {
  headers.set('x-domain', 'raw');
  input = body.input;

  // 入力ガード：配列で最低1件必要
  if (!Array.isArray(input) || input.length === 0) {
    headers.set('x-error','bad_raw_input');
    return {
      statusCode: 400,
      headers: Object.fromEntries(headers),
      body: JSON.stringify({
        error: 'bad_raw_input',
        hint: 'body.input must be a non-empty array'
      })
    };
  }
}
  
    // === NORMAL MODE - requires ESM modules ===
    else if (body.messages) {
      // Extract user message for quick response check
      const messages = body.messages || [];
      const userMessages = messages.filter(m => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];
      const userMessageText = latestUserMessage?.content || '';
      
      // Analyze message complexity first
      try {
        const optimizerMod = await import(esmUrlFromSrc('utils', 'response-optimizer.mjs'));
        const { preprocessMessage } = optimizerMod;
        const analysis = preprocessMessage(userMessageText);
        messageComplexity = analysis.complexity; // Use outer scope variable
        headers.set('x-complexity', String(messageComplexity));
        
        // If message is simple enough, check quick responses
        if (analysis.skipAI) {
          headers.set('x-optimization', 'skip-ai');
        }
      } catch (optimizerError) {
        console.error('Optimizer error:', optimizerError);
      }
      
      // Check for quick response first (skip AI for simple greetings)
      try {
        const quickResponseMod = await import(esmUrlFromSrc('utils', 'enhanced-quick-response.mjs'));
        const { getQuickResponse } = quickResponseMod;
        
        const quickResponse = getQuickResponse(userMessageText);
        if (quickResponse && quickResponse.skipAI) {
          // Extract emotion tag from quick response
          let quickMessage = quickResponse.message;
          const quickEmoMatch = quickMessage.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
          if (quickEmoMatch) {
            const emotionId = quickEmoMatch[1];
            quickMessage = quickMessage.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
            headers.set('x-emo', emotionId);
          } else {
            // Default emotion for quick responses
            headers.set('x-emo', 'friendly');
          }
          
          // Return instant response without AI
          headers.set('x-quick-response', 'true');
          headers.set('x-response-time', '0');
          
          return {
            statusCode: 200,
            headers: Object.fromEntries(headers),
            body: JSON.stringify({
              choices: [{
                message: {
                  role: 'assistant',
                  content: quickMessage
                },
                finish_reason: 'stop'
              }],
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            })
          };
        }
      } catch (quickResponseError) {
        // If quick response fails, continue with normal flow
        console.error('Quick response error:', quickResponseError);
      }
      
      // Load ESM modules only when absolutely needed
      let IntentClassifier, ConversationRouter, buildSystemPrompt, buildConversationPrompt;
      
      try {
        // Load all ESM modules with caching
        const intentMod = await loadIntent();
        const routerMod = await loadRouter();
        const promptMod = await loadPrompt();
        
        // Extract what we need from modules
        IntentClassifier = intentMod.IntentClassifier || intentMod.default;
        ConversationRouter = routerMod.ConversationRouter || routerMod.default;
        buildSystemPrompt = promptMod.buildSystemPrompt;
        buildConversationPrompt = promptMod.buildConversationPrompt;
        
      } catch (importError) {
        // ESM import failed
        headers.set('x-error', 'esm_import_failed');
        return {
          statusCode: 500,
          headers: Object.fromEntries(headers),
          body: JSON.stringify({
            error: 'esm_import_failed',
            message: String(importError?.message || importError),
            details: {
              module: importError?.url || 'unknown',
              type: 'ESM import failure'
            }
          })
        };
      }

      // Initialize services with loaded modules
      const classifier = new IntentClassifier();
      const router = new ConversationRouter();
      
      // Reuse already extracted message data
      userText = userMessageText;
      
      if (latestUserMessage && latestUserMessage.content) {
        // Classify intent
        const intentResult = classifier.classify(latestUserMessage.content);
        domain = intentResult.domain;
        headers.set('x-domain', domain);  // Update domain in headers
        
        // Route conversation
        const routingResult = router.route({
          domain: domain,
          text: latestUserMessage.content,
          sessionId: sessionId,
          context: {
            confidence: intentResult.confidence,
            scores: intentResult.scores
          }
        });

        // Check for FAQ match first (priority response)
        if (routingResult.faqAnswer && routingResult.faqAnswer.score >= 0.7) {
          // Load emotion mapper for FAQ responses
          try {
            const emotionMapperMod = await import(esmUrlFromSrc('utils', 'emotion-mapper.mjs'));
            const { ensureEmotionTag, analyzeEmotion } = emotionMapperMod;
            
            // Ensure emotion tag for FAQ answer
            let faqAnswer = ensureEmotionTag(routingResult.faqAnswer.answer);
            const faqEmoMatch = faqAnswer.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
            
            if (faqEmoMatch) {
              const emotionId = faqEmoMatch[1];
              faqAnswer = faqAnswer.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
              headers.set('x-emo', emotionId);
            } else {
              // Default emotion for FAQ
              headers.set('x-emo', 'explaining');
            }
            
            // Update headers for FAQ response
            headers.set('x-backend', 'faq');
            headers.set('x-faq-match', 'true');
            headers.set('x-faq-score', String(routingResult.faqAnswer.score || 1.0));
            headers.set('x-faq-type', routingResult.faqAnswer.matchType || 'partial');
            
            // Return FAQ answer directly
            return {
              statusCode: 200,
              headers: Object.fromEntries(headers),
              body: JSON.stringify({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: faqAnswer
                  },
                  finish_reason: 'stop'
                }],
                usage: {
                  prompt_tokens: 0,
                  completion_tokens: 0,
                  total_tokens: 0
                }
              })
            };
          } catch (faqEmotionError) {
            console.error('FAQ emotion mapper error:', faqEmotionError);
            // Continue with FAQ response without emotion tag
            headers.set('x-emo', 'explaining');
            headers.set('x-backend', 'faq');
            headers.set('x-faq-match', 'true');
            headers.set('x-faq-score', String(routingResult.faqAnswer.score || 1.0));
            headers.set('x-faq-type', routingResult.faqAnswer.matchType || 'partial');
            
            return {
              statusCode: 200,
              headers: Object.fromEntries(headers),
              body: JSON.stringify({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: routingResult.faqAnswer.answer
                  },
                  finish_reason: 'stop'
                }],
                usage: {
                  prompt_tokens: 0,
                  completion_tokens: 0,
                  total_tokens: 0
                }
              })
            };
          }
        }
        
        // No FAQ match, proceed with AI generation
        // Get session state for filled slots
        const sessionState = router.getSession(sessionId, domain);
        
        // Build system prompt with Smaichan personality enabled
        systemPrompt = buildSystemPrompt({
          domain: domain,
          playbook: routingResult.playbookData,
          missingSlots: routingResult.missingSlots,
          styleHints: {
            confidence: intentResult.confidence,
            faqMatched: false
          },
          routingResult: routingResult,
          userContext: {
            sessionId: sessionId,
            timestamp: Date.now(),
            previousMessages: messages.slice(0, -1),
            session: sessionState
          },
          model: model,
          enableSmaichan: enableSmaichan,  // Use environment-controlled setting
          pricingInfo: routingResult.pricingInfo,  // Pass pricing information
          quote: routingResult.quote,  // Pass quote calculation
          userMessage: userText  // Pass user message for response length analysis
        });

        // Build input for Responses API
        input = [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt || 'You are a helpful assistant.' }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userText || '' }]
          }
        ];
      } else {
        // No user message, use default
        input = toResponsesInputFromMessages(messages);
      }

      // Clean up old sessions periodically
      try {
        router.clearOldSessions();
      } catch (cleanupErr) {
        console.error('Session cleanup error:', cleanupErr);
      }
    } else {
      // No messages provided
      input = [];
    }

// === OPENAI API CALL (common path) ===

// Optimize token count based on message complexity
let MIN_TOKENS = 1024;  // Default
let optimizedTokens = MIN_TOKENS;

// Adjust tokens based on complexity if available
if (messageComplexity !== null && messageComplexity !== undefined) {
  try {
    const optimizerMod = await import(esmUrlFromSrc('utils', 'response-optimizer.mjs'));
    const { getOptimizedModelParams } = optimizerMod;
    const params = getOptimizedModelParams(messageComplexity);
    optimizedTokens = params.max_tokens || MIN_TOKENS;
    MIN_TOKENS = Math.min(optimizedTokens, MIN_TOKENS);
  } catch (e) {
    console.error('Failed to optimize params:', e);
  }
}

const wanted = Number(body?.max_output_tokens);

const payload = {
  model,
  input,
  text: { format: { type: 'text' } },
  max_output_tokens: Number.isFinite(wanted) && wanted > 0
    ? Math.max(MIN_TOKENS, wanted)
    : optimizedTokens  // Use optimized tokens instead of fixed MIN_TOKENS
};

// 通常チャットでは推論モードを使わない（reasoning トークンを食いにくくする）
if (isRaw) {
  payload.reasoning = { effort: 'low' };       // raw の時だけ付ける
}

// 最終サニタイズ（禁止キー除去）
sanitizeResponsesPayload(payload);
// ▲ここまで置き換え
// payload を作った直後あたりに追加
if (!isRaw && 'reasoning' in payload) {
  delete payload.reasoning;          // 通常チャットでは推論モードを完全に外す
}

    // Check for API key
    if (!apiKey) {
      headers.set('x-error', 'missing_api_key');
      return { 
        statusCode: 500, 
        headers: Object.fromEntries(headers),
        body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' }) 
      };
    }

    // Call OpenAI Responses API with retry
    let response, data;
    try {
      const result = await withRetry(async () => {
        const res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });
        
        const json = await res.json();
        
        // Throw error for retry on 5xx
        if (!res.ok && res.status >= 500) {
          const error = new Error(`OpenAI error: ${res.status}`);
          error.status = res.status;
          throw error;
        }
        
        return { response: res, data: json };
      });
      
      response = result.response;
      data = result.data;
    } catch (retryError) {
      // After all retries failed
      headers.set('x-error', 'openai_unavailable');
      return {
        statusCode: 503,
        headers: Object.fromEntries(headers),
        body: JSON.stringify({ 
          error: 'Service temporarily unavailable',
          message: String(retryError?.message || retryError)
        })
      };
    }

    // Handle non-5xx OpenAI errors
    if (!response.ok) {
      headers.set('x-error', `openai_${response.status}`);
      return {
        statusCode: response.status,
        headers: Object.fromEntries(headers),
        body: JSON.stringify({ 
          error: 'OpenAI error', 
          ...data 
        })
      };
    }

// Extract text（最初の試行）
let text = extractText(data);

// max_output_tokens が小さすぎて未完了 → 一度だけ増やして再試行
if (!text && (data?.status === 'incomplete' || data?.incomplete_details?.reason === 'max_output_tokens')) {
  const current = payload.max_output_tokens || MIN_TOKENS;
  payload.max_output_tokens = Math.max(2048, Math.ceil(current * 2));  // 2回目は最低2048
  sanitizeResponsesPayload(payload);

  const res2 = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  const data2 = await res2.json();
  if (res2.ok) {
    text = extractText(data2);
    // debug で usage などを最新にしたいので、data も差し替えておく
    data = data2;
  }
}

// ▼ ここを empty_output より前に！ text が空でも必ず 200 を返す
if (debug) {
  const payload_keys = Object.keys(payload);
  return {
    statusCode: 200,
    headers: Object.fromEntries(headers),
    body: JSON.stringify({
      ok: true,
      payload: {
        model: payload.model,
        input_type: Array.isArray(payload.input) ? 'array' : typeof payload.input,
        max_output_tokens: payload.max_output_tokens,
        payload_keys
      },
      openai: {
        status: data?.status || 'unknown',
        incomplete_details: data?.incomplete_details || null,
        usage: data?.usage || null
      },
      response: {
        text: text ?? '',
        domain: headers.get('x-domain')
      }
    })
  };
}

// Handle empty output（それでも空ならエラー返し）
if (!text) {
  headers.set('x-error', 'empty_output');
  return {
    statusCode: 502,
    headers: Object.fromEntries(headers),
    body: JSON.stringify({
      error: 'empty_output',
      hints: { 
        domain: headers.get('x-domain'),
        prompt_len: JSON.stringify(payload.input).length,
        usage: data?.usage || null,
        status: data?.status,
        incomplete: data?.incomplete_details || null
      }
    })
  };
}

    // Import emotion mapper and ensure emotion tag is present
    let finalText = text;
    let emotionId = null;
    
    try {
      const emotionMapperMod = await import(esmUrlFromSrc('utils', 'emotion-mapper.mjs'));
      const { ensureEmotionTag, analyzeEmotion } = emotionMapperMod;
      
      // Ensure emotion tag is present
      finalText = ensureEmotionTag(text);
      
      // Extract emotion tag for header
      const emoMatch = finalText.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
      if (emoMatch) {
        emotionId = emoMatch[1];
        // Remove tag from user-visible text
        finalText = finalText.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
      } else {
        // Fallback: analyze text if no tag found
        emotionId = analyzeEmotion(text, 'assistant');
      }
      
      headers.set('x-emo', emotionId);
    } catch (emotionError) {
      console.error('Emotion mapper error:', emotionError);
      // Fallback to neutral emotion
      emotionId = 'neutral';
      headers.set('x-emo', emotionId);
      finalText = text; // Use original text if emotion processing fails
    }
    
    // Return UI-compatible format
    return {
      statusCode: 200,
      headers: Object.fromEntries(headers),
      body: JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: finalText
          },
          finish_reason: 'stop'
        }],
        usage: data?.usage || null
      })
    };

  } catch (err) {
    // Update headers for error response
    headers.set('x-domain', 'error');
    headers.set('x-error', 'internal_error');

    return {
      statusCode: 500,
      headers: Object.fromEntries(headers),
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: String(err?.message || err) 
      })
    };
  }
};
