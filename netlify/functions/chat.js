const { extractText } = require("./_extractText.js");
const path = require('path');
const { join } = path;
const { pathToFileURL } = require('url');

// --- sanitize: OpenAI Responses API に非対応のキーを根こそぎ除去 ---
function deepDeleteKeys(obj, keys = []) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) {
      delete obj[k];
    } else {
      deepDeleteKeys(obj[k], keys);
    }
  }
  return obj;
}

// Responses API へ投げる最終 payload をここで確定させる
function sanitizeResponsesPayload(payload) {
  // 代表的な非対応・問題児キーを網羅削除
  const BAN = [
    'temperature',
    'top_p',
    'frequency_penalty',
    'presence_penalty',
    'stop',
    'seed',
    'response_format' // ← Responses API では text.format に移行
  ];
  // ネスト側（text.temperature 等）もケア
  return deepDeleteKeys(structuredClone(payload), BAN);
}

// ESM 動的 import を安定化（CommonJS からの import）
const ROOT = process.env.LAMBDA_TASK_ROOT || process.cwd();
async function loadEsm(relFromRoot) {
  const full = join(ROOT, relFromRoot);
  return import(pathToFileURL(full).href);
}

// 使い方例：
let _intentMod, _routerMod, _promptMod;
async function loadIntent() { return _intentMod ??= await loadEsm('src/intent/intent-classifier.mjs'); }
async function loadRouter() { return _routerMod ??= await loadEsm('src/agent/router.mjs'); }
async function loadPrompt() { return _promptMod ??= await loadEsm('src/prompt/build-system-prompt.mjs'); }

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
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07';
  const sessionId = event.headers?.['x-session-id'] || 
                   event.headers?.['X-Session-Id'] || 
                   `session-${Date.now()}`;
  
  // Parse URL for modes
  const url = new URL(event.rawUrl || event.url || 'http://localhost');
  const isRaw = url.searchParams.get('raw') === '1';
  const bypass = url.searchParams.get('bypass') === '1';
  const debug = url.searchParams.get('debug') === '1';
  const selftest = url.pathname?.includes('selftest');
  
  // Initialize common headers with x-domain always set
  const headers = new Headers({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'x-model': model,
    'x-session-id': sessionId,
    'x-domain': 'general',  // Default domain
    'x-backend': 'openai',
    'x-deploy-id': process.env.DEPLOY_ID || '',
    'x-commit': process.env.COMMIT_REF || ''
  });

  try {
    const body = parseJson(event.body);
    
    // Initialize variables
    let domain = 'general';
    let systemPrompt = '';
    let userText = '';
    let input;

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
      
      // Just convert messages to Responses API format
      input = toResponsesInputFromMessages(body.messages || []);
    } 
    // Handle raw mode (no routing, direct input)
    else if (isRaw) {
      headers.set('x-domain', 'raw');
      // raw=1 でもサニタイズを適用（重要）
      input = body.input || [];
    }
    // === NORMAL MODE - requires ESM modules ===
    else if (body.messages) {
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
      
      const messages = body.messages || [];
      const userMessages = messages.filter(m => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];
      userText = latestUserMessage?.content || '';
      
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
        
        // No FAQ match, proceed with AI generation
        // Get session state for filled slots
        const sessionState = router.getSession(sessionId, domain);
        
        // Build system prompt
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
          model: model
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
    
    // Create unified OpenAI payload (Responses API) - 絶対に temperature を書き足さない
    const payload = sanitizeResponsesPayload({
      model: model,
      input: input,
      max_output_tokens: Math.max(16, Number(body?.max_output_tokens || 512)),
      text: { format: { type: 'text' }, verbosity: 'low' },
      reasoning: { effort: 'low' }
    });

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

    // Extract text
    const text = extractText(data);

    // Handle empty output
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
    
    // Debug mode: return diagnostic info
    if (debug) {
      return {
        statusCode: 200,
        headers: Object.fromEntries(headers),
        body: JSON.stringify({
          ok: true,
          debug: {
            payload_keys: Object.keys(payload)  // temperature が含まれないことを見える化
          },
          payload: {
            model: payload.model,
            input_type: Array.isArray(payload.input) ? 'array' : typeof payload.input,
            max_output_tokens: payload.max_output_tokens
          },
          openai: {
            status: data?.status || 'unknown',
            incomplete_details: data?.incomplete_details || null,
            usage: data?.usage || null,
            first_item_type: data?.output?.item?.[0]?.type || data?.choices?.[0]?.message ? 'message' : 'unknown'
          },
          response: {
            text: text,
            domain: headers.get('x-domain')
          },
          choices: [{
            message: {
              role: 'assistant',
              content: text
            },
            finish_reason: 'stop'
          }]
        })
      };
    }

    // Extract emotion tag if present
    const emoMatch = text.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
    let cleanText = text;
    
    if (emoMatch) {
      const emotionId = emoMatch[1];
      cleanText = text.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
      headers.set('x-emo', emotionId);
    }
    
    // Return UI-compatible format
    return {
      statusCode: 200,
      headers: Object.fromEntries(headers),
      body: JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: cleanText
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