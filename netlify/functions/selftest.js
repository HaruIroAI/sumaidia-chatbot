const { extractText } = require('./_extractText.js');

exports.handler = async function handler(event) {
  try {
    // いま実行中のオリジン（Deploy Preview / 本番どちらでも OK）
    const origin = new URL(event.rawUrl || event.url || 'http://localhost').origin;
    const u = new URL(event.rawUrl || event.url || 'http://localhost');
    const isDebug = u.searchParams.get('debug') === '1';

    // /chat?raw=1 へ最小ボディで POST
    const debugParam = isDebug ? '&debug=1' : '';
    const res = await fetch(`${origin}/.netlify/functions/chat?raw=1${debugParam}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: [
          { role:'system', content:[{ type:'input_text', text:'「pong」と1語だけ返す' }] },
          { role:'user',   content:[{ type:'input_text', text:'ping' }] }
        ],
        max_output_tokens: 16
      })
    });

    const model = res.headers.get('x-model') || process.env.OPENAI_MODEL || 'gpt-5-mini';
    const data  = await res.json().catch(() => ({}));

    // _extractText() で本文を取り出し
    const text = extractText(data)?.trim() || '';
    const ok   = text === 'pong';  // 完全一致なら 200、それ以外は 500

    const body = {
      ok,
      expected: 'pong',
      sample: text,
      model
    };

    // ?debug=1 の時は、chat のデバッグ payload_keys をそのまま透過
    if (isDebug) {
      body.raw = data;
      if (data?.debug?.payload_keys) {
        body.debug = { payload_keys: data.debug.payload_keys };
      }
    }

    return {
      statusCode: ok ? 200 : 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err) })
    };
  }
};