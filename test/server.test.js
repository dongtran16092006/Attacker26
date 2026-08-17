import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/server.js';
import { createMockBankApi } from '../server/mockBankApi.js';

let base;
let close;
let mockBank;

before(async () => {
  mockBank = createMockBankApi();
  await new Promise((resolve) => mockBank.listen(0, resolve));
  process.env.MOCK_BANK_API_URL = `http://127.0.0.1:${mockBank.address().port}`;

  const { server } = createApp({ dbPath: ':memory:' });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
  close = () => new Promise((resolve) => server.close(resolve));
});

after(async () => {
  await close();
  await new Promise((resolve) => mockBank.close(resolve));
});

function json(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function registerUser(email = `user${Math.random()}@example.com`) {
  const res = await json('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'mat-khau-du-dai' },
  });
  const data = await res.json();
  return { email, token: data.token, userId: data.userId, res };
}

const SAMPLE_PROFILE = {
  income: 12_000_000,
  essential: 6_500_000,
  discretionary: 2_000_000,
  liquidAssets: 25_000_000,
  debts: [],
  goals: [{ name: 'Quỹ dự phòng', target: 39_000_000, saved: 25_000_000, deadlineMonth: 24, allocWeight: 1 }],
  incomeStability: 'stable',
};

test('health trả về 200 mà không cần đăng nhập', async () => {
  const res = await json('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('assumptions công khai, không cần token', async () => {
  const res = await json('/api/assumptions');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.assumptions.savingsApr);
  assert.ok(Array.isArray(body.notes));
});

test('đăng ký rồi đăng nhập lại bằng đúng mật khẩu', async () => {
  const { email, token } = await registerUser();
  assert.ok(token);

  const login = await json('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'mat-khau-du-dai' },
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.ok(loginBody.token);
});

test('đăng ký trùng email bị từ chối', async () => {
  const { email } = await registerUser();
  const res = await json('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'mat-khau-du-dai' },
  });
  assert.equal(res.status, 409);
});

test('mật khẩu ngắn hơn 8 ký tự bị từ chối', async () => {
  const res = await json('/api/auth/register', {
    method: 'POST',
    body: { email: `short${Math.random()}@example.com`, password: '123' },
  });
  assert.equal(res.status, 400);
});

test('sai mật khẩu không đăng nhập được', async () => {
  const { email } = await registerUser();
  const res = await json('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'sai-mat-khau' },
  });
  assert.equal(res.status, 401);
});

test('gọi endpoint cần đăng nhập mà không có token bị chặn', async () => {
  const res = await json('/api/profile');
  assert.equal(res.status, 401);
});

test('lưu và đọc lại hồ sơ tài chính', async () => {
  const { token } = await registerUser();
  const save = await json('/api/profile', { method: 'PUT', token, body: { profile: SAMPLE_PROFILE } });
  assert.equal(save.status, 200);

  const read = await json('/api/profile', { token });
  const body = await read.json();
  assert.equal(body.profile.income, SAMPLE_PROFILE.income);
  assert.equal(body.profile.goals[0].name, 'Quỹ dự phòng');
});

test('hồ sơ không hợp lệ bị từ chối với thông điệp tiếng Việt', async () => {
  const { token } = await registerUser();
  const res = await json('/api/profile', {
    method: 'PUT',
    token,
    body: { profile: { ...SAMPLE_PROFILE, income: 0 } },
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.match(body.error, /Thu nhập/);
});

test('mô phỏng một quyết định trả về điểm và diễn giải', async () => {
  const { token } = await registerUser();
  await json('/api/profile', { method: 'PUT', token, body: { profile: SAMPLE_PROFILE } });

  const res = await json('/api/decisions/evaluate', {
    method: 'POST',
    token,
    body: { event: { label: 'Trả thẳng toàn bộ', upfront: 25_000_000 } },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.score.total === 'number');
  assert.ok(Array.isArray(body.messages));
});

test('chưa có hồ sơ thì không mô phỏng được', async () => {
  const { token } = await registerUser();
  const res = await json('/api/decisions/evaluate', {
    method: 'POST',
    token,
    body: { event: { label: 'Trả thẳng toàn bộ', upfront: 25_000_000 } },
  });
  assert.equal(res.status, 422);
});

test('xếp hạng nhiều phương án, phương án vét quỹ dự phòng bị xếp cuối', async () => {
  const { token } = await registerUser();
  await json('/api/profile', { method: 'PUT', token, body: { profile: SAMPLE_PROFILE } });

  const res = await json('/api/decisions/rank', {
    method: 'POST',
    token,
    body: {
      events: [
        { label: 'Trả thẳng toàn bộ', upfront: 25_000_000 },
        { label: 'Trì hoãn 4 tháng', delayMonths: 4, delayed: 25_000_000 },
      ],
    },
  });
  assert.equal(res.status, 200);
  const { results } = await res.json();
  assert.equal(results.length, 2);
  const last = results.at(-1);
  assert.equal(last.label, 'Trả thẳng toàn bộ');
});

test('xoá tài khoản xoá luôn hồ sơ và vô hiệu token cũ', async () => {
  const { token } = await registerUser();
  await json('/api/profile', { method: 'PUT', token, body: { profile: SAMPLE_PROFILE } });

  const del = await json('/api/account', { method: 'DELETE', token });
  assert.equal(del.status, 204);

  const after = await json('/api/profile', { token });
  assert.equal(after.status, 401);
});

test('đăng xuất vô hiệu token', async () => {
  const { token } = await registerUser();
  const out = await json('/api/auth/logout', { method: 'POST', token });
  assert.equal(out.status, 204);

  const res = await json('/api/profile', { token });
  assert.equal(res.status, 401);
});

test('tạo liên kết ngân hàng mô phỏng trả về linkId và cảnh báo demo', async () => {
  const { token } = await registerUser();
  const res = await json('/api/bank-link', { method: 'POST', token, body: { provider: 'mock-bank' } });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.linkId);
  assert.match(body.disclaimer, /không phải kết nối ngân hàng thật/);
});

test('nhập hồ sơ từ ngân hàng mô phỏng suy ra thu nhập và chi phí hợp lý', async () => {
  const { token } = await registerUser();
  const link = await json('/api/bank-link', { method: 'POST', token, body: {} });
  const { linkId } = await link.json();

  const res = await json('/api/profile/import-bank', { method: 'POST', token, body: { linkId } });
  assert.equal(res.status, 200);
  const { draft } = await res.json();
  assert.ok(draft.income > 0);
  assert.ok(draft.essential > 0);
  assert.ok(draft.liquidAssets >= 0);
  assert.match(draft._source.disclaimer, /mô phỏng/);

  // Hồ sơ nháp phải hợp lệ theo đúng luật hồ sơ mà engine dùng để mô phỏng.
  const save = await json('/api/profile', { method: 'PUT', token, body: { profile: draft } });
  assert.equal(save.status, 200);
});

test('cùng linkId luôn trả về cùng một hồ sơ nháp (tất định, không phải ngẫu nhiên mỗi lần)', async () => {
  const { token } = await registerUser();
  const link = await json('/api/bank-link', { method: 'POST', token, body: {} });
  const { linkId } = await link.json();

  const first = await (await json('/api/profile/import-bank', { method: 'POST', token, body: { linkId } })).json();
  const second = await (await json('/api/profile/import-bank', { method: 'POST', token, body: { linkId } })).json();
  assert.deepEqual(first.draft.income, second.draft.income);
  assert.deepEqual(first.draft.essential, second.draft.essential);
});

test('nhập hồ sơ bằng linkId không thuộc về mình bị từ chối', async () => {
  const owner = await registerUser();
  const stranger = await registerUser();
  const link = await json('/api/bank-link', { method: 'POST', token: owner.token, body: {} });
  const { linkId } = await link.json();

  const res = await json('/api/profile/import-bank', { method: 'POST', token: stranger.token, body: { linkId } });
  assert.equal(res.status, 404);
});

test('nhập hồ sơ mà không có linkId bị từ chối', async () => {
  const { token } = await registerUser();
  const res = await json('/api/profile/import-bank', { method: 'POST', token, body: {} });
  assert.equal(res.status, 400);
});
