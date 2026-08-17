/**
 * Định tuyến API. Route chỉ lo xác thực đầu vào và gọi store/engine — không có
 * logic tài chính nào lặp lại ở đây, toàn bộ nằm trong src/engine (tái sử dụng
 * đúng như kiến trúc tách lớp đã mô tả ở mục 5.1.1 của bản kế hoạch).
 */

import { validate as validateProfile, EMPTY_PROFILE } from '../src/engine/profile.js';
import { evaluate, rank, makeEvent, ASSUMPTIONS, ASSUMPTION_NOTES } from '../src/engine/index.js';
import { createRouter, readJsonBody } from './http.js';
import { createBankLink, importProfileFromBank } from './bankLink.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireAuth(req, store) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Thiếu token đăng nhập.');
  }
  const userId = store.userIdForToken(token);
  if (!userId) {
    throw new HttpError(401, 'Token không hợp lệ hoặc đã hết hạn.');
  }
  return { userId, token };
}

function normaliseProfile(input) {
  if (!input || typeof input !== 'object') {
    throw new HttpError(400, 'Thiếu hồ sơ tài chính.');
  }
  const profile = {
    ...EMPTY_PROFILE,
    ...input,
    debts: Array.isArray(input.debts) ? input.debts : [],
    goals: Array.isArray(input.goals) ? input.goals : [],
  };
  const errors = validateProfile(profile);
  if (errors.length > 0) {
    throw new HttpError(422, errors.join(' '));
  }
  return profile;
}

function requireEvent(input) {
  if (!input || typeof input !== 'object' || typeof input.label !== 'string' || !input.label.trim()) {
    throw new HttpError(400, 'Phương án cần có nhãn (label).');
  }
  return makeEvent(input.label, input);
}

export function buildRoutes(store) {
  const router = createRouter();

  router.get('/api/health', async () => ({ status: 200, body: { status: 'ok' } }));

  router.get('/api/assumptions', async () => ({
    status: 200,
    body: { assumptions: ASSUMPTIONS, notes: ASSUMPTION_NOTES },
  }));

  router.post('/api/auth/register', async (req) => {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email không hợp lệ.');
    if (password.length < 8) throw new HttpError(400, 'Mật khẩu cần ít nhất 8 ký tự.');
    const userId = store.createUser(email, password);
    const token = store.createSession(userId);
    return { status: 201, body: { token, userId } };
  });

  router.post('/api/auth/login', async (req) => {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const userId = store.verifyLogin(email, password);
    if (!userId) throw new HttpError(401, 'Email hoặc mật khẩu không đúng.');
    const token = store.createSession(userId);
    return { status: 200, body: { token, userId } };
  });

  router.post('/api/auth/logout', async (req) => {
    const { token } = requireAuth(req, store);
    store.deleteSession(token);
    return { status: 204 };
  });

  router.del('/api/account', async (req) => {
    const { userId } = requireAuth(req, store);
    store.deleteAccount(userId);
    return { status: 204 };
  });

  router.get('/api/profile', async (req) => {
    const { userId } = requireAuth(req, store);
    const profile = store.loadProfile(userId) || EMPTY_PROFILE;
    return { status: 200, body: { profile } };
  });

  router.put('/api/profile', async (req) => {
    const { userId } = requireAuth(req, store);
    const body = await readJsonBody(req);
    const profile = normaliseProfile(body.profile);
    store.saveProfile(userId, profile);
    return { status: 200, body: { profile } };
  });

  router.post('/api/bank-link', async (req) => {
    const { userId } = requireAuth(req, store);
    const body = await readJsonBody(req);
    const provider = typeof body.provider === 'string' && body.provider.trim() ? body.provider.trim() : 'mock-bank';
    const link = createBankLink(userId, provider);
    return {
      status: 201,
      body: {
        ...link,
        disclaimer: 'Liên kết mô phỏng cho mục đích demo — không phải kết nối ngân hàng thật.',
      },
    };
  });

  router.post('/api/profile/import-bank', async (req) => {
    const { userId } = requireAuth(req, store);
    const body = await readJsonBody(req);
    if (typeof body.linkId !== 'string' || !body.linkId) {
      throw new HttpError(400, 'Thiếu linkId. Gọi /api/bank-link trước để lấy linkId.');
    }
    const draft = await importProfileFromBank(userId, body.linkId, { months: body.months });
    return { status: 200, body: { draft } };
  });

  router.post('/api/decisions/evaluate', async (req) => {
    const { userId } = requireAuth(req, store);
    const body = await readJsonBody(req);
    const profile = store.loadProfile(userId);
    if (!profile) throw new HttpError(422, 'Chưa có hồ sơ tài chính. Hãy lưu hồ sơ trước.');
    const event = requireEvent(body.event);
    const result = evaluate(profile, event, body.extras || {});
    return { status: 200, body: result };
  });

  router.post('/api/decisions/rank', async (req) => {
    const { userId } = requireAuth(req, store);
    const body = await readJsonBody(req);
    const profile = store.loadProfile(userId);
    if (!profile) throw new HttpError(422, 'Chưa có hồ sơ tài chính. Hãy lưu hồ sơ trước.');
    if (!Array.isArray(body.events) || body.events.length === 0) {
      throw new HttpError(400, 'Cần ít nhất một phương án để so sánh.');
    }
    const events = body.events.map(requireEvent);
    const extrasByLabel = body.extrasByLabel || {};
    const results = rank(profile, events, extrasByLabel);
    return { status: 200, body: { results } };
  });

  return router;
}

export { HttpError };
