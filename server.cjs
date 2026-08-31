const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:3001';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // 1. REVERSE PROXY FOR API CALLS (/api/*)
  if (parsedUrl.pathname.startsWith('/api/')) {
    const targetUrl = new URL(parsedUrl.pathname + parsedUrl.search, BACKEND_API_URL);
    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
          'x-forwarded-for': req.socket.remoteAddress,
          'x-forwarded-proto': 'http',
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('API Proxy Error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway: Cannot connect to API backend' }));
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  // 2. STATIC FILES & SPA FALLBACK
  let reqPath = decodeURI(parsedUrl.pathname);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Server Error');
      }

      const headers = { 'Content-Type': contentType };
      if (reqPath.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else {
        headers['Cache-Control'] = 'no-cache';
      }

      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexo Web + API Proxy running at http://0.0.0.0:${PORT}`);
});
