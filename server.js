/**
 * TestEra — Local Dev Server
 * Serves static files + proxies NVIDIA API requests to avoid CORS issues.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies (large limit for PDF text)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path} — Body size: ${JSON.stringify(req.body || {}).length} chars`);
  }
  next();
});

// ===== API PROXY =====
app.post('/api/ai/generate', async (req, res) => {
  console.log('[AI] Proxying request to NVIDIA API...');
  console.log('[AI] Model:', req.body?.model);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    console.log('[AI] NVIDIA response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('[AI] NVIDIA error:', JSON.stringify(data).substring(0, 200));
      return res.status(response.status).json(data);
    }

    console.log('[AI] ✅ Success! Response received.');
    res.json(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[AI] ❌ Request timed out after 2 minutes');
      return res.status(504).json({ error: { message: 'Request timed out. Try with a shorter PDF.' } });
    }
    console.error('[AI] ❌ Proxy error:', error.message);
    res.status(500).json({ error: { message: 'Proxy error: ' + error.message } });
  }
});

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname)));

// SPA fallback
app.get('/{*path}', (req, res) => {
  if (req.path.includes('.')) {
    res.status(404).send('Not found');
  } else {
    const htmlFile = req.path === '/app' || req.path === '/app.html' 
      ? 'app.html' 
      : 'index.html';
    res.sendFile(path.join(__dirname, htmlFile));
  }
});

app.listen(PORT, () => {
  console.log(`\n  🚀 TestEra dev server running at:`);
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log(`  ➜  http://localhost:${PORT}/app\n`);
});
