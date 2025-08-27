import { extractText } from "./_extractText.js";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(event) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify({ ok: false, error: 'Missing OPENAI_API_KEY' })
      };
    }

    // Check debug mode
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path || ''}`);
    const debug = url.searchParams.get('debug') === '1';

    // Prepare the request body
    const requestBody = {
      model: model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: '「pong」と1語だけ返す' }] },
        { role: 'user', content: [{ type: 'input_text', text: 'ping' }] }
      ],
      text: { format: { type: 'text' }, verbosity: 'low' },
      reasoning: { effort: 'low' },
      max_output_tokens: 8
    };

    let data = null;
    let text = '';
    const maxRetries = 3;

    // Retry logic: max 3 attempts
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        await sleep(200); // 200ms delay between retries
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          statusCode: response.status,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
          body: JSON.stringify({ ok: false, error: 'OpenAI error', details: errorData })
        };
      }

      data = await response.json();
      
      // Check if response is complete and has output_text
      if (data?.status !== 'incomplete' && data?.output) {
        text = extractText(data);
        if (text) break; // Success, exit retry loop
      }
    }

    // Strict check: must be exactly 'pong'
    const ok = text === 'pong';
    
    // Build response payload
    const payload = {
      ok,
      expected: 'pong',
      sample: text,
      model: data?.model || model
    };

    // Add debug info if requested
    if (debug && data) {
      payload.debug = {
        status: data?.status,
        incomplete: data?.incomplete_details,
        usage: data?.usage
      };
    }

    return {
      statusCode: ok ? 200 : 500,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'x-model': data?.model || model
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