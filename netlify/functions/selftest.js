// netlify/functions/selftest.js
exports.handler = async () => {
  try {
    const res = await fetch(process.env.URL + '/.netlify/functions/chat?raw=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: [
          { role: 'system', content: [{ type:'input_text', text:'「pong」と1語だけ返す' }] },
          { role: 'user',   content: [{ type:'input_text', text:'ping' }] }
        ],
        // ← 小さすぎると不完全になるので最低 256 を投げる
        max_output_tokens: 256
      })
    });

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? json?.output_text ?? '';

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ ok: text.trim() === 'pong', expected: 'pong', sample: text, model: 'gpt-5-mini' })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ ok:false, error: String(e) })
    };
  }
};
