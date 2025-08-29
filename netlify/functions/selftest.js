// netlify/functions/selftest.js
exports.handler = async (event) => {
  try {
    // ← ここがポイント：プレビューなら DEPLOY_URL、なければ URL、さらに最終手段で現在ホスト
    const base = process.env.DEPLOY_URL || process.env.URL || (`https://${event.headers.host}`);
    const endpoint = `${base}/.netlify/functions/chat?raw=1`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: [
          { role: 'system', content: [{ type:'input_text', text:'「pong」と1語だけ返す' }] },
          { role: 'user',   content: [{ type:'input_text', text:'ping' }] }
        ],
        // 小さすぎると未完了になりやすいので十分大きく
        max_output_tokens: 256
      })
    });

    const j = await res.json();
    // Responses API の返りは .choices[0].message.content または .output_text
    const text = (j?.choices?.[0]?.message?.content ?? j?.output_text ?? '').trim();

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        ok: text === 'pong',
        expected: 'pong',
        sample: text,
        model: res.headers.get('x-model') || 'unknown',
        status_from_chat: res.status // デバッグ用
      })
    };
  } catch (e) {
    // ここも 200 で返して中身で状態を見る方がデバッグしやすいです
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ ok:false, error: String(e) })
    };
  }
};
