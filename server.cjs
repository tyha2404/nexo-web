const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
  '.txt': 'text/plain',
};

const COMPRESSIBLE_EXTS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.svg',
  '.webmanifest',
  '.txt',
]);
// Compressed copies of static files, keyed by path + encoding. dist/ is immutable per deploy.
const compressedCache = new Map();

function pickEncoding(acceptEncoding = '') {
  if (/\bbr\b/.test(acceptEncoding)) return 'br';
  if (/\bgzip\b/.test(acceptEncoding)) return 'gzip';
  return null;
}

function compress(filePath, content, encoding) {
  const key = `${filePath}:${encoding}`;
  if (!compressedCache.has(key)) {
    const compressed =
      encoding === 'br'
        ? zlib.brotliCompressSync(content, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 },
          })
        : zlib.gzipSync(content, { level: 9 });
    compressedCache.set(key, compressed);
  }
  return compressedCache.get(key);
}

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
      // Missing hashed assets must 404, otherwise index.html gets cached as JS for a year
      if (reqPath.startsWith('/assets/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        return res.end('Not Found');
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Server Error');
      }

      const headers = { 'Content-Type': contentType, Vary: 'Accept-Encoding' };
      if (reqPath.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else {
        headers['Cache-Control'] = 'no-cache';
      }

      let body = content;
      const encoding = COMPRESSIBLE_EXTS.has(ext)
        ? pickEncoding(req.headers['accept-encoding'])
        : null;
      if (encoding && content.length > 1024) {
        body = compress(filePath, content, encoding);
        headers['Content-Encoding'] = encoding;
      }
      headers['Content-Length'] = body.length;

      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexo Web + API Proxy running at http://0.0.0.0:${PORT}`);
});
