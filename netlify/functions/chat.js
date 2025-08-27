import OpenAI from "openai";

export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "x-backend": "openai"
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    // Responses API で呼ぶ（messages配列をシンプルに連結して input に渡す）
    const input = messages.map(m => `${m.role}: ${m.content}`).join("\n");

    const r = await client.responses.create({
      model,
      input,
      temperature: 0.7,
      max_completion_tokens: 300,
      presence_penalty: 0.3
    });

    // 出力テキストを安全に取り出す
    const text =
      r.output_text ??
      (r.output?.[0]?.content?.[0]?.text ?? "") ??
      "";

    // フロント互換の形に整形（choices[0].message.content）
    const payload = { choices: [{ message: { content: text } }] };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": r.model || model },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    console.error("chat fn error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: String(err?.message || err)
      })
    };
  }
}