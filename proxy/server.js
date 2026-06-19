/**
 * Cloud School Proxy Server
 * 
 * يخفي مفتاح Gemini API من الواجهة الأمامية.
 * جميع طلبات الذكاء الاصطناعي تمر عبر هذا الخادم.
 */

require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('⚠️ GEMINI_API_KEY not set in .env');
  console.error('⚠️ انسخ .env.example إلى .env وأضف مفتاح Gemini');
  process.exit(1);
}

const MODELS = {
  text: 'gemini-2.5-flash-preview-09-2025',
  vision: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-2.5-flash-preview-09-2025',
};

async function proxyToGemini(modelName, payload, res) {
  const model = MODELS[modelName];
  if (!model) {
    return res.status(400).json({ error: `Unknown model: ${modelName}` });
  }

  // TTS endpoint returns audio — different API structure
  if (modelName === 'tts') {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    // Return the full response including audio data as base64
    return res.status(response.status).json(data);
  }

  // Standard generateContent endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}

// ====== Routes ======

// نص — أسئلة، تلخيص، تقييم، توليد اختبار، قصة
app.post('/api/gemini/text', async (req, res) => {
  try {
    await proxyToGemini('text', req.body, res);
  } catch (err) {
    console.error('Proxy text error:', err);
    res.status(500).json({ error: 'Proxy text error', details: err.message });
  }
});

// رؤية — وصف الصور
app.post('/api/gemini/vision', async (req, res) => {
  try {
    await proxyToGemini('vision', req.body, res);
  } catch (err) {
    console.error('Proxy vision error:', err);
    res.status(500).json({ error: 'Proxy vision error', details: err.message });
  }
});

// تحويل النص إلى كلام (TTS)
app.post('/api/gemini/tts', async (req, res) => {
  try {
    await proxyToGemini('tts', req.body, res);
  } catch (err) {
    console.error('Proxy TTS error:', err);
    res.status(500).json({ error: 'Proxy TTS error', details: err.message });
  }
});

// تفريغ الصوت إلى نص
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    await proxyToGemini('transcribe', req.body, res);
  } catch (err) {
    console.error('Proxy transcribe error:', err);
    res.status(500).json({ error: 'Proxy transcribe error', details: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔒 Proxy server running on http://localhost:${PORT}`);
  console.log(`🔒 CORS origin: ${CORS_ORIGIN}`);
  console.log(`🔒 Gemini API key: ${GEMINI_API_KEY.substring(0, 8)}... (hidden)`);
});
