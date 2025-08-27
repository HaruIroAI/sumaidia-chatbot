export async function handler(event) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing OPENAI_API_KEY' })
      };
    }

    const payload = {
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: '「pong」と1語だけ返す' }] },
        { role: 'user', content: [{ type: 'input_text', text: 'ping' }] }
      ],
      text: { format: { type: 'text' }, verbosity: 'low' },
      reasoning: { effort: 'low' },
      max_output_tokens: 256
    };

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Extract text from various response formats
    const text =
      data?.output?.[0]?.content?.find(c => c.type === 'output_text')?.text ??
      data?.choices?.[0]?.message?.content ??
      data?.output_text ?? '';

    const body = {
      ok: !!text.trim(),
      model: data?.model || model,
      sample: text.trim(),
    };

    // Include debug info if requested
    if (event?.queryStringParameters?.debug === '1') {
      body.debug = {
        status: data?.status,
        incomplete: data?.incomplete_details,
        usage: data?.usage,
        raw: JSON.stringify(data)
      };
    }

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'x-model': data?.model || model
      },
      body: JSON.stringify(body)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ ok: false, error: String(e) })
    };
  }
}