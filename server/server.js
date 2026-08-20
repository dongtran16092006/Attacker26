/** Tạo http.Server đã gắn đủ route. Tách khỏi index.js để test gọi được trực tiếp, không cần bind cổng thật. */

import { createServer as createHttpServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb } from './db.js';
import { createStore } from './store.js';
import { buildRoutes, HttpError } from './routes.js';
import { sendJson } from './http.js';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const DEMO_HTML_PATH = join(SERVER_DIR, 'demo.html');
const APP_HTML_PATH = join(SERVER_DIR, '..', 'DeciFin_UX_Polished_Financial_Intelligence_v3_NavFixed__2_ (5).html');

export function createApp({ dbPath } = {}) {
  const db = openDb(dbPath);
  const store = createStore(db);
  // Tài khoản demo phục vụ MVP; có thể tắt ở production bằng DECIFIN_SEED_DEMO=false.
  if (process.env.DECIFIN_SEED_DEMO !== 'false') {
    try { store.createUser('demo@decifin.vn', 'Demo@12345'); } catch (error) {
      if (error.status !== 409) throw error;
    }
  }
  const router = buildRoutes(store);
  const allowedOrigin = process.env.DECIFIN_CORS_ORIGIN || '*';

  const server = createHttpServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    // Giao diện chính phục vụ cùng API trên Render; /demo giữ lại trang test backend.
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/demo')) {
      const html = readFileSync(url.pathname === '/demo' ? DEMO_HTML_PATH : APP_HTML_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api-config.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('window.DECIFIN_API_BASE = "";');
      return;
    }

    const route = router.match(req.method, url.pathname);
    if (!route) {
      sendJson(res, 404, { error: 'Không tìm thấy đường dẫn.' });
      return;
    }

    try {
      const { status, body } = await route.handler(req, res, url);
      if (status === 204) {
        res.writeHead(204);
        res.end();
        return;
      }
      sendJson(res, status, body);
    } catch (err) {
      if (err instanceof HttpError || typeof err.status === 'number') {
        sendJson(res, err.status, { error: err.message });
        return;
      }
      // eslint-disable-next-line no-console
      console.error(err);
      sendJson(res, 500, { error: 'Lỗi máy chủ.' });
    }
  });

  server.close = ((originalClose) => (...args) => {
    db.close();
    return originalClose.apply(server, args);
  })(server.close.bind(server));

  return { server, db, store };
}

export function startServer(port = process.env.PORT || 8787) {
  const { server } = createApp();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`DeciFin API đang chạy tại http://localhost:${port}`);
  });
  return server;
}
