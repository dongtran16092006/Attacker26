/**
 * Máy chủ tĩnh tối giản cho lúc phát triển.
 *
 * Cần có vì trình duyệt chặn ES module khi mở tệp bằng giao thức file://.
 * Không dùng thư viện ngoài để giữ dự án ở mức không phụ thuộc.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const relative = url.pathname === '/' ? '/index.html' : url.pathname;

  // Chặn đi ngược ra ngoài thư mục gốc
  const target = join(ROOT, normalize(relative).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy tệp');
  }
}).listen(PORT, () => {
  console.log(`DeciFin đang chạy tại http://localhost:${PORT}`);
});
