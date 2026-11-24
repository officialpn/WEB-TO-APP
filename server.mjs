import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Web2APK Maker listening on ${port}`));
