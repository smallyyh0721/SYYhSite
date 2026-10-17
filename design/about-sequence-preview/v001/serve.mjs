import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.SEQUENCE_PREVIEW_PORT || 8897);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, '.' + name);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !mime[path.extname(file)]) { response.writeHead(404).end(); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Content-Length': body.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Independent sequence preview: http://localhost:${port}/`));
