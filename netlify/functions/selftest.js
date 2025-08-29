// netlify/functions/selftest.js
exports.handler = async (event) => {
  // Deploy Preview / 本番 どちらでも「今まさに開いているオリジン」を使う
  const host  = event.headers['x-forwarded-host'] || event.headers.host;
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const endpoint = `${proto}://${host}/.netlify/functions/chat?raw=1`;

  // 念のため：OpenAI の応答からテキストを抜く軽量版
  const pluckText = (json) => {
    if (!json) return '';
    if (typeof json.output_text === 'string') return json.output_text;
    const c = json.choices?.[0]?.message?.content;
    return typeof c === 'string' ? c : '';
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: [
          { role: 'system', content: [{ type:'input_text', text:'「pong」と1語だけ返す' }] },
          { role: 'user',   content: [{ type:'input_text', text:'ping' }] }
        ],
        // 小さすぎると incomplete になるので最低 256
        max_output_tokens: 256
      })
    });

    const json  = await res.json().catch(() => ({}));
    const text  = pluckText(json).trim();
    const ok    = text === 'pong';

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        ok,
        expected: 'pong',
        sample: text,
        endpoint,
        status_from_chat: res.status,
        signature: 'selftest-v3' // ← これが返ってくれば新コードが動いてます
      })
    };
  } catch (e) {
    return {
      statusCode: 200, // 自己診断なので 200 で返し、中身で失敗を示す
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        ok: false,
        error: String(e),
        endpoint,
        signature: 'selftest-v3'
      })
    };
  }
};
