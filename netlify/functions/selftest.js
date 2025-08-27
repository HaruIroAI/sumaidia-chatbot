export async function handler(event) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: 'Missing OPENAI_API_KEY' 
      })
    };
  }

  // Extract text from various response formats
  function extractText(data) {
    // Responses API format
    const t1 = data?.output?.[0]?.content?.find(c => c.type === 'output_text')?.text;
    // Chat compatible wrap format (what /chat returns)
    const t2 = data?.choices?.[0]?.message?.content;
    // Legacy field fallback
    const t3 = data?.output_text;
    return (t1 ?? t2 ?? t3 ?? '').trim();
  }

  // Responses API compatible request
  const payload = {
    model: model,
    input: [
      { 
        role: 'system', 
        content: [{ type: 'input_text', text: '「pong」と1語だけ返す' }] 
      },
      { 
        role: 'user', 
        content: [{ type: 'input_text', text: 'ping' }] 
      }
    ],
    max_output_tokens: 16
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const openaiJson = await response.json();
    const text = extractText(openaiJson);
    
    // Check if we want debug info
    const url = new URL(event.rawUrl || event.url || 'http://localhost');
    const includeDebug = url.searchParams.get('debug') === '1';

    return {
      statusCode: 200,
      headers: { 
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'x-model': openaiJson?.model || model
      },
      body: JSON.stringify({
        ok: !!text,
        model: openaiJson?.model || model,
        sample: text,
        ...(includeDebug && { 
          debug: {
            status: response.status,
            raw: openaiJson
          }
        })
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: 'Selftest exception', 
        message: error.message 
      })
    };
  }
}