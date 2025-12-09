const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const mime = require('mime');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const cache = new Map();

// Middleware (from Interstellar)
app.use(cors());
app.use(express.json());
app.use(express.static('static')); // Serve UI if you add one

// Interstellar-style cloaking: Fake initial page
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Google Search</title></head>
    <body style="margin:0;height:100vh;background:#fff">
      <iframe id="cloak" src="about:blank" style="width:100%;height:100%;border:none"></iframe>
      <script>
        setTimeout(() => {
          document.getElementById('cloak').src = '/proxy';
          document.title = 'Google';
        }, 500);
      </script>
    </body></html>
  `);
});

// Proxy route: Hardcoded to fetch https://v2.rhythm-plus.com/ (Interstellar /e/* logic adapted)
app.get('/proxy', async (req, res) => {
  const targetUrl = 'https://v2.rhythm-plus.com/';
  const cacheKey = targetUrl;

  // Check cache (Interstellar-style)
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', cached.contentType);
    return res.send(cached.data);
  }

  try {
    // Fetch external site (node-fetch like Interstellar)
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let data = await response.text();
    
    // Basic rewriting (mimic Interstellar link proxying: prefix relative links)
    // Note: For full site, you'd use Cheerio; this is simple regex for demo
    data = data.replace(/(href|src)=["']([^"']+)["']/g, (match, attr, url) => {
      if (url.startsWith('http')) return match; // Absolute external: leave (or proxy further)
      return `${attr}="/proxy${url.startsWith('/') ? '' : '/'}${url}"`; // Relative → /proxy/...
    });

    // Set MIME (from Interstellar)
    const contentType = response.headers.get('content-type') || mime.getType(targetUrl) || 'text/html';

    // Cache & serve (hides original domain)
    cache.set(cacheKey, { data, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).send('<h1>Error loading resource</h1><p>' + error.message + '</p>');
  }
});

// Handle proxied assets (e.g., /proxy/css/style.css → fetch from target)
app.get('/proxy/*', async (req, res) => {
  const subPath = req.path.replace('/proxy', '');
  const targetUrl = 'https://v2.rhythm-plus.com' + subPath;
  // Reuse fetch/cache logic from above (simplified)
  // ... (implement similar to /proxy for images/JS/CSS)
  const cached = cache.get(targetUrl);
  if (cached) {
    res.set('Content-Type', cached.contentType);
    return res.send(cached.data);
  }
  // Fetch and cache (omitted for brevity; copy from /proxy)
  res.status(404).send('Asset not found');
});

// Error pages (from Interstellar)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'static/404.html')); // Add a 404.html if needed
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
