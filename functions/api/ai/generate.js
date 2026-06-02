/**
 * TestEra — NVIDIA API Proxy (Cloudflare Function)
 * Proxies requests to NVIDIA API to avoid CORS issues.
 * Deployed as: /api/ai/generate
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Get API key from environment variable or request header
  const apiKey = env.NVIDIA_API_KEY || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'API key not configured' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: 'Proxy error: ' + error.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
