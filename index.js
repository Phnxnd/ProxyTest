const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const mime = require('mime');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const cache = new Map();

// Middleware (Interstellar-style)
app.use(cors());
app.use(express.json());
app.use(express.static('static')); // Optional: Add a /static folder for custom assets if needed

// Interstellar-style cloaking: Fake initial page with about:blank
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Google Search</title></head>
    <body style="margin:0;height:100vh;background:#fff">
      <iframe id="cloak" src="about:blank" style="width:100%;height:100%;border:none" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation" allowfullscreen></iframe>
      <script>
        setTimeout(() => {
          document.getElementById('cloak').src = '/proxy';
          document.title = 'Google';
        }, 500);
      </script>
    </body></html>
  `);
});

// Proxy route: Hardcoded to https://v2.rhythm-plus.com/ (Interstellar /e/* logic)
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
    
    // Full rewriting with Cheerio (Interstellar link proxying: prefix all relative/absolute links)
    const $ = cheerio.load(data);
    $('a[href], link[href], script[src], img[src], [style*="url("]').each((i, el) => {
      let attr = $(el).attr('href') || $(el).attr('src');
      if (!attr) return;
      if (attr.startsWith('http')) {
        // Absolute: Proxy further if needed (for this single site, rewrite to /proxy/full-path)
        attr = attr.replace('https://v2.rhythm-plus.com', '/proxy');
      } else if (attr.startsWith('/')) {
        attr = '/proxy' + attr;
      } else {
        attr = '/proxy/' + attr;
      }
      if ($(el).attr('href')) $(el).attr('href', attr);
      if ($(el).attr('src')) $(el).attr('src', attr);
    });
    data = $.html();

    // Set MIME (from Interstellar)
    const contentType = response.headers.get('content-type') || mime.getType(targetUrl) || 'text/html';

    // Cache & serve (hides original domain)
    cache.set(cacheKey, { data, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><title>Error</title></head>
      <body style="text-align:center;padding:50px">
        <h1>Failed to load resource</h1>
        <p>${error.message}</p>
      </body></html>
    `);
  }
});

// Handle proxied assets (e.g., /proxy/css/style.css → fetch from target; Interstellar /e/* extension)
app.get('/proxy/*', async (req, res) => {
  const subPath = req.path.replace('/proxy', '');
  const targetUrl = `https://v2.rhythm-plus.com${subPath}`;
  const cacheKey = targetUrl;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', cached.contentType);
    return res.send(cached.data);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || mime.getType(targetUrl);

    // Cache as buffer for binary
    cache.set(cacheKey, { data: buffer, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    res.status(404).send('Asset not found');
  }
});

// 404 fallback (from Interstellar)
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html><head><title>404</title></head>
    <body style="text-align:center;padding:50px">
      <h1>Not Found</h1>
    </body></html>
  `);
});

// Vercel Serverless Export (THIS IS WHAT WAS MISSING)
export default async function handler(req, res) {
  return app(req, res);
}
