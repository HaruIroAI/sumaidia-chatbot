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
    const model  = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    // ✅ Responses APIは messages で渡すのが安定
    const msgs = (messages || []).map(m => ({
      role: m.role,
      content: [{ type: "text", text: m.content }]
    }));

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: msgs,
        max_output_tokens: 300      // ← 必須最小セットのみ
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "OpenAI error", status: r.status, message: data?.error?.message || JSON.stringify(data) })
      };
    }

    // ✅ 出力を堅牢に取り出す（output_text 優先 → output配列 → 最後に空対策）
    let text = data.output_text || "";
    if (!text && Array.isArray(data.output)) {
      // output[*].content[*].text にテキストが入るケースをケア
      text = data.output
        .flatMap(p => p?.content ?? [])
        .filter(c => c && (c.type === "output_text" || c.type === "text"))
        .map(c => c.text)
        .join("")
        .trim();
    }
    if (!text) text = ""; // 最終フォールバック（空のままでもOK）

    const payload = { choices: [{ message: { content: text } }] };
    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
      body: JSON.stringify(payload)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: String(err?.message || err) })
    };
  }
}
