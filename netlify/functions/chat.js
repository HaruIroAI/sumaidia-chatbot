// netlify/functions/chat.js
import OpenAI from "openai";

export async function handler(event) {
  const baseHeaders = {
    "content-type": "application/json",
    "access-control-allow-origin": "*", // 必要に応じて自ドメインに絞る
    "x-backend": "openai",
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // モデルは環境変数を優先（Netlifyで OPENAI_MODEL=gpt-5-mini を設定済み）
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    // Responses API 用に、会話履歴をシンプル連結して input へ
    const input = (messages || [])
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const r = await client.responses.create({
      model,
      input,
      temperature: 0.7,
      max_completion_tokens: 300,   // ← GPT-5系は max_tokens ではなくこちら
      presence_penalty: 0.3,
    });

    // 出力を安全に取り出す
    const text =
      r.output_text ??
      (r.output?.[0]?.content?.[0]?.text ?? "") ??
      "";

    // フロント互換の形に整形（choices[0].message.content で読める）
    const payload = { choices: [{ message: { content: text } }] };

    return {
      statusCode: 200,
      headers: { ...baseHeaders, "x-model": r.model || model },
      body: JSON.stringify(payload),
    };
  } catch (err) {
    console.error("chat fn error:", err);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: String(err?.message || err),
      }),
    };
  }
}
