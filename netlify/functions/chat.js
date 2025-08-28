const { extractText } = require("./_extractText.js");

/**
 * Dynamic import helpers for ESM modules
 */
async function importIntentClassifier() {
  const m = await import('../../src/intent/intent-classifier.mjs');
  return m.IntentClassifier || m.default;
}

async function importRouter() {
  const m = await import('../../src/agent/router.mjs');
  return m.ConversationRouter || m.default;
}

async function importPromptBuilder() {
  const m = await import('../../src/prompt/build-system-prompt.mjs');
  return {
    buildSystemPrompt: m.buildSystemPrompt,
    buildConversationPrompt: m.buildConversationPrompt
  };
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
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07';
  const sessionId = event.headers?.['x-session-id'] || 
                   event.headers?.['X-Session-Id'] || 
                   `session-${Date.now()}`;
  
  // Parse URL for modes
  const url = new URL(event.rawUrl || event.url || 'http://localhost');
  const isRaw = url.searchParams.get('raw') === '1';
  const bypass = url.searchParams.get('bypass') === '1';
  const debug = url.searchParams.get('debug') === '1';
  
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
    
    // Initialize domain
    let domain = 'general';
    let systemPrompt = '';
    let userText = '';
    let input;

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
      input = body.input;
    }
    // Normal mode - load ESM modules and process routing
    else if (body.messages) {
      // Load ESM modules only when needed
      let IntentClassifier, ConversationRouter, promptBuilders;
      
      try {
        // Dynamic imports for ESM modules
        IntentClassifier = await importIntentClassifier();
        ConversationRouter = await importRouter();
        promptBuilders = await importPromptBuilder();
      } catch (importError) {
        // ESM import failed
        headers.set('x-error', 'esm_import_failed');
        return {
          statusCode: 502,
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

      // Initialize services
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
        systemPrompt = promptBuilders.buildSystemPrompt({
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

    // Create unified OpenAI payload (Responses API)
    const payload = {
      model: model,
      input: input,
      text: { format: { type: 'text' }, verbosity: 'low' },
      reasoning: { effort: 'low' },
      temperature: 0.3,
      max_output_tokens: Math.max(256, Number(body?.max_output_tokens || 500))
    };

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
          }
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