export async function handler() {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*"
  };

  try {
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Missing OPENAI_API_KEY",
          hint: "環境変数 OPENAI_API_KEY が設定されていません。"
        })
      };
    }

    // Create test input
    const input = [
      {
        role: "system",
        content: [{ type: "input_text", text: "『pong』と1語だけ返す" }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: "ping" }]
      }
    ];

    // Call OpenAI Responses API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: input,
        max_output_tokens: 30
      })
    });

    // Parse response
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          model: model,
          status: response.status,
          message: data?.error?.message || data,
          hint: "API エラーが発生しました。TROUBLESHOOTING.md を参照してください。"
        })
      };
    }

    // Extract output text
    let text = data.output_text || "";
    if (!text && Array.isArray(data.output)) {
      text = data.output
        .flatMap(p => p?.content ?? [])
        .filter(c => c?.type === "output_text")
        .map(c => c.text)
        .join("")
        .trim();
    }

    // Check if response is correct
    const isCorrect = text.trim().toLowerCase() === "pong";

    // Return test result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: isCorrect,
        model: data.model || model,
        sample: text,
        hint: isCorrect ? "API は正常に動作しています。" : `期待値 'pong' に対して '${text}' が返されました。`
      })
    };

  } catch (err) {
    // Handle unexpected errors
    console.error("selftest error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: String(err?.message || err),
        hint: "予期しないエラーが発生しました。Functions logs を確認してください。"
      })
    };
  }
}