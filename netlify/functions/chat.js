import { extractText } from "./_extractText.js";

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

    // Prepare request body
    let requestBody;
    
    if (rawMode && body.input) {
      // Raw mode: pass input directly
      requestBody = {
        model: model,
        input: body.input,
        text: { format: { type: 'text' }, verbosity: 'medium' },
        reasoning: { effort: "low" },
        max_output_tokens: Math.max(64, Number(body?.max_output_tokens || 500))
      };
    } else {
      // Normal mode: process messages
      const { messages = [] } = body;
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
    const text = extractText(data);

    // ガード: output抽出失敗時の明示メッセージ
    if (!text) {
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

    // 正常な返却形式
    const responseBody = {
      choices: [{
        message: {
          role: "assistant",
          content: text
        },
        finish_reason: "stop"
      }],
      usage: data.usage || {}
    };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
      body: JSON.stringify(responseBody)
    };

  } catch (err) {
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