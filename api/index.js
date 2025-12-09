import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import mime from 'mime';
import * as cheerio from 'cheerio';

const app = express();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const cache = new Map();

app.use(cors());
app.use(express.json());

// Proxy route: Hardcoded Rhythm Plus
app.get('/proxy', async (req, res) => {
  const targetUrl = 'https://v2.rhythm-plus.com/';
  const cacheKey = targetUrl;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', cached.contentType);
    return res.send(cached.data);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let data = await response.text();
    
    const $ = cheerio.load(data);
    $('a[href], link[href], script[src], img[src], [style*="url("]').each((i, el) => {
      let attr = $(el).attr('href') || $(el).attr('src');
      if (!attr) return;
      if (attr.startsWith('http') && attr.includes('v2.rhythm-plus.com')) {
        attr = attr.replace('https://v2.rhythm-plus.com', '/api/proxy');
      } else if (attr.startsWith('/')) {
        attr = '/api/proxy' + attr;
      } else {
        attr = '/api/proxy/' + attr;
      }
      if ($(el).attr('href')) $(el).attr('href', attr);
      if ($(el).attr('src')) $(el).attr('src', attr);
    });
    data = $.html();

    const contentType = response.headers.get('content-type') || mime.getType(targetUrl) || 'text/html';

    cache.set(cacheKey, { data, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Proxied assets
app.get('/proxy/*', async (req, res) => {
  const subPath = req.path.replace('/proxy', '');
  const targetUrl = `https://v2.rhythm-plus.com${subPath}`;
  const cacheKey = targetUrl;

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

    cache.set(cacheKey, { data: buffer, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    res.status(404).send('Not found');
  }
});

// Vercel export
const handler = app;

export default async function (req, res) {
  return handler(req, res);
}
