/** Tiện ích HTTP tối giản: đọc JSON body, gửi JSON response, router theo (method, path). */

const MAX_BODY_BYTES = 1024 * 1024; // 1MB, đủ cho hồ sơ tài chính + vài phương án

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload quá lớn.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('JSON không hợp lệ.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function createRouter() {
  const routes = [];
  const api = {
    get(path, handler) {
      routes.push({ method: 'GET', path, handler });
      return api;
    },
    post(path, handler) {
      routes.push({ method: 'POST', path, handler });
      return api;
    },
    put(path, handler) {
      routes.push({ method: 'PUT', path, handler });
      return api;
    },
    del(path, handler) {
      routes.push({ method: 'DELETE', path, handler });
      return api;
    },
    match(method, pathname) {
      return routes.find((r) => r.method === method && r.path === pathname);
    },
  };
  return api;
}
