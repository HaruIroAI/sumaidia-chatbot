export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "x-backend": "openai",
  };

  try {
    // Parse request body
    const { messages = [] } = JSON.parse(event.body || "{}");
    
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Missing OPENAI_API_KEY",
          hint: "環境変数 OPENAI_API_KEY が設定されていません。Netlify の Environment variables で設定してください。"
        })
      };
    }

    // Get model from environment or use default
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    // Convert messages to structured input format (recommended for Responses API)
    const structured = messages.map(m => ({
      role: m.role,
      content: [{ type: "input_text", text: String(m.content ?? "") }]
    }));

    // Call OpenAI Responses API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: structured,
        max_output_tokens: 300
      })
    });

    // Parse response
    const data = await response.json().catch(() => ({}));

    // Handle errors
    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      
      // Generate helpful hints based on error message
      const hint =
        /max_tokens/i.test(msg) ? "Responses APIでは max_output_tokens を使います。" :
        /max_completion_tokens/i.test(msg) ? "パラメータ名は max_output_tokens に変更してください。" :
        /Unsupported parameter:\s*temperature/i.test(msg) ? "このモデルでは temperature は非対応です。削除してください。" :
        /(presence|frequency)_penalty/i.test(msg) ? "presence/frequency_penalty は Responses API 非対応です。削除してください。" :
        /Unsupported parameter:\s*messages/i.test(msg) ? "Responses API は messages ではなく input を使用します。" :
        /Invalid value:\s*'text'/i.test(msg) ? "content[].type は 'input_text'（出力は 'output_text'）を使用してください。" :
        /do not have access to model/i.test(msg) ? "モデル権限/有効化を確認してください。暫定で gpt-4o-mini へ切替可能です。" :
        "OpenAIのエラーを確認してください（TROUBLESHOOTING.md 参照）。";

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "OpenAI API error",
          status: response.status,
          message: msg,
          hint: hint
        })
      };
    }

    // Extract output text (with fallback logic)
    let text = data.output_text || "";
    if (!text && Array.isArray(data.output)) {
      // Fallback: extract from structured output
      text = data.output
        .flatMap(p => p?.content ?? [])
        .filter(c => c && c.type === "output_text")
        .map(c => c.text)
        .join("")
        .trim();
    }

    // Format response for frontend compatibility (Chat Completions format)
    const payload = {
      choices: [{
        message: {
          role: "assistant",
          content: text || ""
        },
        finish_reason: "stop"
      }],
      usage: data.usage
    };

    // Return success response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "x-model": data.model || model
      },
      body: JSON.stringify(payload)
    };

  } catch (err) {
    // Handle unexpected errors
    console.error("chat function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: String(err?.message || err),
        hint: "予期しないエラーが発生しました。Functions logs を確認してください。"
      })
    };
  }
}