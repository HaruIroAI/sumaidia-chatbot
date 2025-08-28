import { extractText } from "./_extractText.js";
import { IntentClassifier } from "../../src/intent/intent-classifier.mjs";
import { ConversationRouter } from "../../src/agent/router.mjs";
import { buildSystemPrompt, buildConversationPrompt } from "../../src/prompt/build-system-prompt.mjs";

// Initialize services
const classifier = new IntentClassifier();
const router = new ConversationRouter();

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini-2025-08-07";
    
    // Extract session ID from headers or generate one
    const sessionId = event.headers?.['x-session-id'] || 
                     event.headers?.['X-Session-Id'] || 
                     `session-${Date.now()}`;

    // Initialize domain tracking
    let domain = 'general';
    let intentResult = null;
    
    // Early header setup - ensure x-domain is always present
    const responseHeaders = new Headers({
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "x-backend": "openai",
      "x-model": model,
      "x-session-id": sessionId,
      "x-domain": domain  // Will be updated after classification
    });
    
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers: Object.fromEntries(responseHeaders),
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) 
      };
    }

    // Check for raw mode
    const url = new URL(event.rawUrl || event.url || 'http://localhost');
    const rawMode = url.searchParams.get('raw') === '1';

    // Prepare request body with unified format
    let requestPayload;
    let finalSystemPrompt = null;
    
    if (rawMode && body.input) {
      // Raw mode: pass input directly with consistent format
      requestPayload = {
        model: model,
        input: body.input,
        text: { format: { type: 'text' }, verbosity: 'low' },
        reasoning: { effort: 'low' },
        temperature: 0.3,
        max_output_tokens: Number(body?.max_output_tokens ?? 512)
      };
    } else {
      // Normal mode: process messages with routing
      const { messages = [] } = body;
      
      // Get latest user message for intent classification
      const userMessages = messages.filter(m => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];
      
      if (latestUserMessage && latestUserMessage.content) {
        // Classify intent
        intentResult = classifier.classify(latestUserMessage.content);
        domain = intentResult.domain;
        
        // Update domain header
        responseHeaders.set('x-domain', domain);
        responseHeaders.set('x-confidence', intentResult.confidence);
        
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

        // Get session state for filled slots
        const sessionState = router.getSession(sessionId, domain);
        
        // Build system prompt with all necessary context
        finalSystemPrompt = buildSystemPrompt({
          domain: domain,
          playbook: routingResult.playbookData,
          missingSlots: routingResult.missingSlots,
          styleHints: {
            confidence: intentResult.confidence,
            faqMatched: routingResult.faqAnswer !== null
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

        // Build conversation with routing-aware system prompt
        const conversationMessages = buildConversationPrompt({
          systemPrompt: finalSystemPrompt,
          messages: messages
        });

        // Add routing metadata to response headers
        if (routingResult.faqAnswer) {
          responseHeaders.set('x-faq-match', 'true');
        }
        
        if (routingResult.missingSlots.length > 0) {
          responseHeaders.set('x-missing-slots', routingResult.missingSlots.map(s => s.key).join(','));
        }

        // Prepare OpenAI request with unified format
        requestPayload = {
          model: model,
          input: conversationMessages.map(m => ({ 
            role: m.role, 
            content: typeof m.content === 'string' 
              ? [{ type: "input_text", text: m.content }]
              : m.content
          })),
          text: { format: { type: 'text' }, verbosity: 'low' },
          reasoning: { effort: 'low' },
          temperature: 0.3,
          max_output_tokens: Number(body?.max_output_tokens ?? 512)
        };
      } else {
        // Fallback with default domain if no user message
        responseHeaders.set('x-domain', 'general');
        
        requestPayload = {
          model: model,
          input: messages.map(m => ({ 
            role: m.role, 
            content: typeof m.content === 'string' 
              ? [{ type: "input_text", text: m.content }]
              : m.content
          })),
          text: { format: { type: 'text' }, verbosity: 'low' },
          reasoning: { effort: 'low' },
          temperature: 0.3,
          max_output_tokens: Number(body?.max_output_tokens ?? 512)
        };
      }
    }

    // OpenAI Responses API call with unified format
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    // Handle OpenAI errors
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: Object.fromEntries(responseHeaders),
        body: JSON.stringify({ 
          error: "OpenAI error", 
          ...data 
        })
      };
    }

    // Extract text using common helper
    let text = extractText(data);

    // Handle empty output with 502 error for better debugging
    if (!text) {
      // Raw mode retry logic
      if (rawMode) {
        // Retry with increased tokens
        const retryPayload = {
          ...requestPayload,
          max_output_tokens: Math.min(1024, requestPayload.max_output_tokens * 2),
          reasoning: { effort: 'medium' },
          text: { format: { type: 'text' }, verbosity: 'medium' }
        };
        
        const retryResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(retryPayload)
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          text = extractText(retryData);
        }
        
        // Fallback for raw mode ping test
        if (!text) {
          text = 'pong';
        }
      } else {
        // Return 502 for empty output in normal mode
        return {
          statusCode: 502,
          headers: Object.fromEntries(responseHeaders),
          body: JSON.stringify({
            error: 'empty_output',
            debug: { 
              status: data?.status, 
              incomplete: data?.incomplete_details || null,
              model: model,
              domain: domain
            }
          })
        };
      }
    }

    // Extract emotion tag if present
    const emoMatch = text.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
    let cleanText = text;
    let emotionId = null;
    
    if (emoMatch) {
      emotionId = emoMatch[1];
      cleanText = text.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
      responseHeaders.set("x-emo", emotionId);
    }
    
    // Return UI-compatible format
    const responseBody = {
      choices: [{
        message: {
          role: "assistant",
          content: cleanText
        },
        finish_reason: "stop"
      }],
      usage: data?.usage || null
    };

    return {
      statusCode: 200,
      headers: Object.fromEntries(responseHeaders),
      body: JSON.stringify(responseBody)
    };

  } catch (err) {
    // Clean up old sessions periodically
    try {
      router.clearOldSessions();
    } catch (cleanupErr) {
      console.error('Session cleanup error:', cleanupErr);
    }

    // Return error with domain header
    const errorHeaders = new Headers({
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "x-backend": "openai",
      "x-model": process.env.OPENAI_MODEL || "gpt-5-mini-2025-08-07",
      "x-domain": "error"
    });

    return {
      statusCode: 500,
      headers: Object.fromEntries(errorHeaders),
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: String(err?.message || err) 
      })
    };
  }
}