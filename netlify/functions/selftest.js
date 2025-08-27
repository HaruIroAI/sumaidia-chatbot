export async function handler(event) {
  try {
    // Determine the base URL
    const base = process.env.URL || `https://${event.headers.host}`;
    
    // Prepare the request body
    const body = {
      input: [
        { role: 'system', content: [{ type: 'input_text', text: '「pong」と1語だけ返す' }] },
        { role: 'user', content: [{ type: 'input_text', text: 'ping' }] }
      ],
      max_output_tokens: 32
    };

    // Call our own chat function in raw mode
    const res = await fetch(`${base}/.netlify/functions/chat?raw=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Extract model from headers
    const model = res.headers.get('x-model') || process.env.OPENAI_MODEL || 'gpt-5-mini';
    
    // Parse response
    const data = await res.json().catch(() => ({}));

    // Extract text from chat response (choices format)
    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    const ok = !!text;

    // Build response payload
    const payload = {
      ok,
      model,
      sample: text
    };

    // Add debug info if requested
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path || ''}`);
    if (url.searchParams.get('debug') === '1') {
      payload.raw = data;
    }

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'x-model': model
      },
      body: JSON.stringify(payload)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: String(e.message || e) 
      })
    };
  }
}