export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*", // TODO: 本番は自ドメインに限定
    "x-backend": "openai",
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;
    const model  = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error:"Missing OPENAI_API_KEY" }) };
    }

    // Responses API の input（構造化）
    const input = (messages || []).map(m => ({
      role: m.role,
      content: [{ type: "input_text", text: String(m.content ?? "") }]
    }));

    // OpenAI 呼び出し（最小パラメータのみ）
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 300
      }),
    });

    const data = await r.json().catch(() => ({}));

    // デバッグ: ?debug=1 なら生レス返却
    if (event.queryStringParameters?.debug === "1") {
      return { statusCode: r.status, headers, body: JSON.stringify(data) };
    }

    if (!r.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error:"OpenAI error", status:r.status, message: msg })
      };
    }

    // 出力抽出（output_text 優先 → output[*].content[*].text(type=output_text)）
    let text = typeof data.output_text === "string" ? data.output_text : "";
    if (!text && Array.isArray(data.output)) {
      const parts = data.output.flatMap(p => p?.content ?? []);
      const outTexts =
        parts.filter(c => c?.type === "output_text").map(c => c.text)
             .concat(parts.filter(c => c?.type === "text").map(c => c.text)); // 保険
      text = outTexts.join("").trim();
    }
    // 最終ガード：空文字は安全文に
    if (!text || !text.trim()) {
      text = "了解だよー！少し混雑してるかも。要件をもう一度だけ教えてくれる？";
    }

    const payload = {
      choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: data.usage
    };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
      body: JSON.stringify(payload),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error:"Internal server error", message:String(err?.message || err) })
    };
  }
}