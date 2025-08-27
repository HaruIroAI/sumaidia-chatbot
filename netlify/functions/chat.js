// netlify/functions/chat.js
export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "x-backend": "openai",
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    // Chat履歴を Responses API 用の input に変換（シンプル連結）
    const input = (messages || []).map(m => `${m.role}: ${m.content}`).join("\n");

    // ★ SDKを使わずにHTTPで直接叩く
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        temperature: 0.7,
        max_completion_tokens: 300,   // ← gpt-5系は max_tokens ではなくこちら
        presence_penalty: 0.3,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      // OpenAI側のエラーをそのまま見える化
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "OpenAI error", status: r.status, message: data?.error?.message || JSON.stringify(data) }),
      };
    }

    const text =
      data.output_text ??
      (data.output?.[0]?.content?.[0]?.text ?? "") ??
      "";

    const payload = { choices: [{ message: { content: text } }] };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
      body: JSON.stringify(payload),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: String(err?.message || err) }),
    };
  }
}
