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
    // Check all output items for text content
    if (data?.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        // Direct text property
        if (item?.text && typeof item.text === 'string') {
          return item.text.trim();
        }
        // Content array
        if (item?.content && Array.isArray(item.content)) {
          const textContent = item.content.find(c => c.type === 'output_text' || c.type === 'text');
          if (textContent?.text) {
            return textContent.text.trim();
          }
        }
      }
    }
    
    // Chat compatible wrap format (what /chat returns)
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    
    // Legacy field fallback
    if (typeof data?.output_text === 'string') {
      return data.output_text.trim();
    }
    
    // Text field in response
    if (data?.text?.value) {
      return data.text.value.trim();
    }
    
    return '';
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
    max_output_tokens: 100
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