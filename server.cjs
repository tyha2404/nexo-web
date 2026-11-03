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

// Sent with every app response (not with proxied API responses).
// style-src needs 'unsafe-inline' for the <style> tags react-select/emotion
// inject. Supabase is used for Realtime (wss) and receipt images/uploads.
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
// HSTS only makes sense when the site is served over HTTPS (by whatever
// terminates TLS in front of this server).
if (process.env.ENABLE_HSTS === 'true') {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
}

// Hop-by-hop headers describe this connection only and must not be forwarded.
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function withoutHopByHop(headers) {
  const out = { ...headers };
  const listed = String(headers.connection || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const h of [...HOP_BY_HOP_HEADERS, ...listed]) delete out[h];
  return out;
}

function sendError(res, status, message) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
  res.end(message);
}

function proxyToApi(req, res, parsedUrl) {
  const targetUrl = new URL(parsedUrl.pathname + parsedUrl.search, BACKEND_API_URL);
  const client = targetUrl.protocol === 'https:' ? https : http;

  const headers = withoutHopByHop(req.headers);
  // The API trusts the right-most X-Forwarded-For entry from a loopback peer,
  // so overwrite whatever the client sent; X-Real-IP is its fallback.
  delete headers['x-real-ip'];
  headers.host = targetUrl.host;
  headers['x-forwarded-for'] = req.socket.remoteAddress;
  headers['x-forwarded-proto'] = 'http';

  const proxyReq = client.request(targetUrl, { method: req.method, headers }, (proxyRes) => {
    proxyRes.on('error', (err) => {
      // Backend reset mid-response (e.g. API reload during a chat stream).
      console.error('API Proxy response error:', err.message);
      res.destroy();
    });
    res.writeHead(proxyRes.statusCode, withoutHopByHop(proxyRes.headers));
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('API Proxy Error:', err.message);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway: Cannot connect to API backend' }));
  });

  req.on('error', () => proxyReq.destroy());
  // Client went away (e.g. closed a chat stream): stop the upstream request
  // so the API stops streaming (and spending AI tokens) for nobody.
  res.on('close', () => {
    if (!res.writableFinished) proxyReq.destroy();
  });

  req.pipe(proxyReq, { end: true });
}

function handleRequest(req, res) {
  // Fixed base: the Host header is client-controlled and only the path is used.
  const parsedUrl = new URL(req.url, 'http://localhost');

  // 1. REVERSE PROXY FOR API CALLS (/api/*)
  if (parsedUrl.pathname.startsWith('/api/')) {
    proxyToApi(req, res, parsedUrl);
    return;
  }

  // 2. STATIC FILES & SPA FALLBACK
  let reqPath;
  try {
    reqPath = decodeURI(parsedUrl.pathname);
  } catch {
    return sendError(res, 400, 'Bad Request');
  }
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR + path.sep)) {
    return sendError(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Missing hashed assets must 404, otherwise index.html gets cached as JS for a year
      if (reqPath.startsWith('/assets/')) {
        return sendError(res, 404, 'Not Found');
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        return sendError(res, 500, 'Server Error');
      }

      const headers = { ...SECURITY_HEADERS, 'Content-Type': contentType, Vary: 'Accept-Encoding' };
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
}

const server = http.createServer((req, res) => {
  // One malformed request must never take the whole process down.
  try {
    handleRequest(req, res);
  } catch (err) {
    console.error('Request handling error:', err.message);
    sendError(res, 400, 'Bad Request');
  }
});

// Malformed request lines/headers are rejected by Node's parser; answer 400
// instead of leaving the socket hanging.
server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  else socket.destroy();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexo Web + API Proxy running at http://0.0.0.0:${PORT}`);
});
