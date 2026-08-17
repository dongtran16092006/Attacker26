/**
 * Trình gọi API backend (server/), dùng khi người dùng CHỦ ĐỘNG bật chế độ
 * tài khoản. Không có hàm nào ở đây được gọi tự động lúc tải trang — mọi lời
 * gọi mạng đều xuất phát từ một cú bấm nút, giữ đúng nguyên tắc "mặc định
 * không gửi gì đi" đã nêu ở welcome.js và assumptions.js. Bật tài khoản là lựa
 * chọn rõ ràng, không phải hành vi ngầm.
 */

// Đổi được qua build/hosting khác nhau; mặc định trỏ về server cục bộ khi phát triển.
const API_BASE = (typeof window !== 'undefined' && window.DECIFIN_API_BASE) || 'http://localhost:8787';

class ApiError extends Error {}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra server đã chạy chưa (npm run server).');
  }

  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* thân rỗng */ }
  if (!res.ok) throw new ApiError((data && data.error) || `Lỗi máy chủ (${res.status}).`);
  return data;
}

export const api = {
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
  deleteAccount: (token) => request('/api/account', { method: 'DELETE', token }),
  pullProfile: (token) => request('/api/profile', { token }),
  pushProfile: (token, profile) => request('/api/profile', { method: 'PUT', token, body: { profile } }),
  createBankLink: (token, provider = 'mock-bank') =>
    request('/api/bank-link', { method: 'POST', token, body: { provider } }),
  importFromBank: (token, linkId) =>
    request('/api/profile/import-bank', { method: 'POST', token, body: { linkId } }),
};

export { ApiError };
