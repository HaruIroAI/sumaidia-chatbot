/**
 * Metrics Collection Endpoint
 * Receives and logs expression usage metrics for visibility
 */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust as needed for security
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    
    // Validate expected format
    const { t, id, source, ts } = body;
    
    if (t !== 'expr' || !id || !source || !ts) {
      console.warn('[Metrics] Invalid payload:', body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payload format' })
      };
    }

    // Log the metric for visibility
    const timestamp = new Date(ts).toISOString();
    console.log(`[Metrics] Expression: id=${id} source=${source} ts=${timestamp}`);
    
    // Log additional context for debugging
    console.log(JSON.stringify({
      type: t,
      emotionId: id,
      source: source,
      timestamp: timestamp,
      userAgent: event.headers['user-agent'] || 'unknown',
      referer: event.headers.referer || 'direct'
    }, null, 2));

    // Return success (no content)
    return {
      statusCode: 204,
      headers
    };

  } catch (error) {
    console.error('[Metrics] Error processing request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};