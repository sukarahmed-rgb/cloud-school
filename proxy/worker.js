/**
 * Cloud School Proxy — Cloudflare Worker version
 *
 * لاستخدام:
 * 1. سجل في Cloudflare (مجاني)
 * 2. اذهب إلى Workers & Pages > Create Worker
 * 3. الصق هذا الكود
 * 4. اذهب إلى Settings > Variables
 *    - أضف GEMINI_API_KEY كـ Secret
 * 5. انشر 😎
 *
 * النطاق الافتراضي بعد النشر:
 *   https://cloud-school-proxy.your-subdomain.workers.dev
 * 
 * ضع هذا الرابط في واجهة الإدارة ← إعدادات الخادم الوسيط
 */

// اسم الموديل المستخدم لكل endpoint
const MODELS = {
  text: 'gemini-2.5-flash-preview-09-2025',
  vision: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-2.5-flash-preview-09-2025',
};

// رأس CORS المسموح به
const ALLOWED_ORIGINS = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://cloud-school.github.io',  // غير حسب رابط GitHub Pages الفعلي
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(origin);
    }

    // Health check (بدون مفتاح API)
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json',
        },
      });
    }

    // فقط POST مسموح لـ Gemini
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    // تحديد المسار
    const endpoint = url.pathname.replace('/api/gemini/', '');
    const model = MODELS[endpoint];

    if (!model) {
      return new Response(JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }), {
        status: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    try {
      const payload = await request.json();

      // TTS له نفس الـ endpoint
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await geminiResponse.json();

      return new Response(JSON.stringify(data), {
        status: geminiResponse.status,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  },
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCORS(origin) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      'Access-Control-Allow-Origin': corsHeaders(origin)['Access-Control-Allow-Origin'],
    },
  });
}
