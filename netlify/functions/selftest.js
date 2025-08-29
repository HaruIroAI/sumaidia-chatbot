// netlify/functions/selftest.js
const { extractText } = require('./_extractText.js');

exports.handler = async (event) => {
  try {
    // ★いま開いているデプロイ自身を必ず叩く（本番でもプレビューでもOK）
    const host  = event.headers['x-forwarded-host'] || event.headers.host;
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const endpoint = `${proto}://${host}/.netlify/functions/chat?raw=1`;

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

    const json = await res.json();
    const text = (extractText(json) || '').trim();

    return {
      statusCode: 200, // ← 失敗しても 200 にして中身で判断できるようにするのも可
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        ok: text === 'pong',
        expected: 'pong',
        sample: text,
        endpoint,
        status_from_chat: res.status
      })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ ok:false, error: String(e) })
    };
  }
};
