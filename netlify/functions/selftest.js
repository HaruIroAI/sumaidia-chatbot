exports.handler = async function handler(event) {
  try {
    // Get the origin from the current request
    const origin = new URL(event.rawUrl || event.url || 'http://localhost').origin;

    // Call /chat?raw=1 with a simple ping-pong test
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

    // Include debug info if requested
    const u = new URL(event.rawUrl || event.url || 'http://localhost');
    if (u.searchParams.get('debug') === '1') {
      body.debug = {
        raw_response: data,
        status: res.status,
        headers: {
          'x-domain': res.headers.get('x-domain'),
          'x-model': res.headers.get('x-model'),
          'x-commit': res.headers.get('x-commit')
        }
      };
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
      body: JSON.stringify({ 
        ok: false, 
        error: String(err?.message || err),
        expected: 'pong',
        sample: null
      })
    };
  }
};