export async function handler(event) {
  try {
    // いま実行中のオリジン（Deploy Preview / 本番どちらでも OK）
    const origin = new URL(event.rawUrl).origin;

    // /chat?raw=1 を同一オリジンで叩く（本番と同一パイプライン）
    const payload = {
      input: [
        { role: 'system', content: [{ type: 'input_text', text: '「pong」と1語だけ返す' }] },
        { role: 'user',   content: [{ type: 'input_text', text: 'ping' }] }
      ],
      max_output_tokens: 16
    };

    const res = await fetch(`${origin}/.netlify/functions/chat?raw=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const model = res.headers.get('x-model') || process.env.OPENAI_MODEL || 'gpt-5-mini';
    const data  = await res.json().catch(() => ({}));

    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    const ok   = text === 'pong';

    const body = {
      ok,
      expected: 'pong',
      sample: text,
      model
    };

    // デバッグ時は raw を同梱
    const u = new URL(event.rawUrl);
    if (u.searchParams.get('debug') === '1') {
      body.raw = data;
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
}