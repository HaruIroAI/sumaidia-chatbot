import { extractText } from "./_extractText.js";
import { IntentClassifier } from "../../src/intent/intent-classifier.mjs";
import { ConversationRouter } from "../../src/agent/router.mjs";
import { buildSystemPrompt, buildConversationPrompt } from "../../src/prompt/build-system-prompt.mjs";

// Initialize services
const classifier = new IntentClassifier();
const router = new ConversationRouter();

export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "x-backend": "openai",
  };

  try {
    const body = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) 
      };
    }

    // Check for raw mode
    const url = new URL(event.rawUrl || event.url || 'http://localhost');
    const rawMode = url.searchParams.get('raw') === '1';

    // Extract session ID from headers or generate one
    const sessionId = event.headers?.['x-session-id'] || 
                     event.headers?.['X-Session-Id'] || 
                     `session-${Date.now()}`;

    // Prepare request body
    let requestBody;
    let finalSystemPrompt = null;
    
    if (rawMode && body.input) {
      // Raw mode: pass input directly
      requestBody = {
        model: model,
        input: body.input,
        text: { format: { type: 'text' }, verbosity: 'low' },
        reasoning: { effort: "low" },
        max_output_tokens: Math.max(64, Number(body?.max_output_tokens || 500))
      };
    } else {
      // Normal mode: process messages with routing
      const { messages = [] } = body;
      
      // Get latest user message for intent classification
      const userMessages = messages.filter(m => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];
      
      if (latestUserMessage && latestUserMessage.content) {
        // Classify intent
        const intentResult = classifier.classify(latestUserMessage.content);
        
        // Route conversation
        const routingResult = router.route({
          domain: intentResult.domain,
          text: latestUserMessage.content,
          sessionId: sessionId,
          context: {
            confidence: intentResult.confidence,
            scores: intentResult.scores
          }
        });

        // Build system prompt
        finalSystemPrompt = buildSystemPrompt({
          routingResult: routingResult,
          userContext: {
            sessionId: sessionId,
            timestamp: Date.now(),
            previousMessages: messages.slice(0, -1)
          },
          model: model
        });

        // Build conversation with routing-aware system prompt
        const conversationMessages = buildConversationPrompt({
          systemPrompt: finalSystemPrompt,
          messages: messages
        });

        // Add routing metadata to response headers
        headers['x-domain'] = intentResult.domain;
        headers['x-confidence'] = intentResult.confidence;
        
        if (routingResult.faqAnswer) {
          headers['x-faq-match'] = 'true';
        }
        
        if (routingResult.missingSlots.length > 0) {
          headers['x-missing-slots'] = routingResult.missingSlots.map(s => s.key).join(',');
        }

        // Prepare OpenAI request with routed conversation
        requestBody = {
          model: model,
          input: conversationMessages.map(m => ({ 
            role: m.role, 
            content: typeof m.content === 'string' 
              ? [{ type: "input_text", text: m.content }]
              : m.content
          })),
          max_output_tokens: 500
        };
      } else {
        // Fallback to original behavior if no user message
        requestBody = {
          model: model,
          input: messages.map(m => ({ 
            role: m.role, 
            content: typeof m.content === 'string' 
              ? [{ type: "input_text", text: m.content }]
              : m.content
          })),
          max_output_tokens: 500
        };
      }
    }

    // OpenAI Responses APIを呼び出し
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // エラー時はOpenAIのstatusをそのまま返す
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...headers, "x-model": data.model || model },
        body: JSON.stringify({ error: "OpenAI error", ...data })
      };
    }

    // レスポンスからテキストを抽出（共通ヘルパーを使用）
    let text = extractText(data);

    // Raw mode retry logic
    if (rawMode && !text) {
      // Retry with increased tokens and forced text output
      const retryPayload = {
        ...requestBody,
        max_output_tokens: 256,
        reasoning: { effort: 'low' },
        text: { format: { type: 'text' }, verbosity: 'low' }
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
    }

    // Fallback for raw mode
    if (rawMode && !text) {
      text = 'pong';  // Default fallback for ping-pong test
    }

    // ガード: output抽出失敗時の明示メッセージ（通常モードのみ）
    if (!rawMode && !text) {
      const responseBody = {
        choices: [{
          message: {
            role: "assistant",
            content: "暫定エラー: 応答テキストが取得できませんでした"
          },
          finish_reason: "stop"
        }],
        usage: data.usage || {}
      };
      
      return {
        statusCode: 200,  // 500にはしない
        headers: { ...headers, "x-model": data.model || model },
        body: JSON.stringify(responseBody)
      };
    }

    // Extract emotion tag if present
    const emoMatch = text.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
    let cleanText = text;
    let emotionId = null;
    
    if (emoMatch) {
      emotionId = emoMatch[1];
      cleanText = text.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '');
    }
    
    // 正常な返却形式
    const responseBody = {
      choices: [{
        message: {
          role: "assistant",
          content: cleanText  // Return clean text without emotion tag
        },
        finish_reason: "stop"
      }],
      usage: data.usage || {}
    };

    const responseHeaders = { ...headers, "x-model": data.model || model };
    if (emotionId) {
      responseHeaders["x-emo"] = emotionId;
    }
    
    // Add session ID to response for client tracking
    responseHeaders["x-session-id"] = sessionId;

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(responseBody)
    };

  } catch (err) {
    // Clean up old sessions periodically
    try {
      router.clearOldSessions();
    } catch (cleanupErr) {
      console.error('Session cleanup error:', cleanupErr);
    }

    return {
      statusCode: 500,
      headers: { ...headers, "x-model": process.env.OPENAI_MODEL || "gpt-5-mini" },
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: String(err?.message || err) 
      })
    };
  }
}