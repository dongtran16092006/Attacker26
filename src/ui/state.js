/**
 * Trạng thái ứng dụng.
 *
 * Mặc định, toàn bộ dữ liệu nằm trong bộ nhớ trình duyệt và localStorage,
 * không có lệnh gọi mạng nào. Đây là lựa chọn có chủ đích: dữ liệu thu nhập,
 * nợ và tài sản là dữ liệu cá nhân nhạy cảm, nên cách an toàn nhất là không
 * thu thập gì cả trừ khi người dùng chủ động yêu cầu.
 *
 * `account` là lối thoát duy nhất khỏi quy tắc đó: khi người dùng tự bấm vào
 * màn "Tài khoản" (xem ui/api.js), hồ sơ có thể đồng bộ lên server/ ở giai
 * đoạn 2. Không có lời gọi nào tới api.js chạy tự động lúc tải trang.
 */

import { EMPTY_PROFILE } from '../engine/profile.js';

const STORAGE_KEY = 'decifin.profile.v1';
const THEME_KEY = 'decifin.theme';
const ACCOUNT_KEY = 'decifin.account.v1';

const listeners = new Set();

export const state = {
  view: 'welcome',
  profile: structuredClone(EMPTY_PROFILE),
  wizardStep: 0,
  decisionKind: 'purchase',
  decisionInput: null,
  results: null,
  installment: null,
  // Báo lỗi và câu hỏi xác nhận, dựng ngay trong trang thay cho hộp thoại của
  // trình duyệt. null nghĩa là không có gì cần nói.
  notice: null,
  // Tài khoản là tính năng tuỳ chọn (giai đoạn 2). null nghĩa là đang dùng chế
  // độ mặc định: chỉ lưu trong trình duyệt, không gửi gì lên máy chủ nào.
  account: null,
  // Dòng xác nhận ngắn cho các thao tác đồng bộ tài khoản (không dùng notice vì
  // notice có role="alert", dành cho lỗi/cảnh báo chứ không phải xác nhận thành công).
  accountStatus: null,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profile));
  } catch {
    // Chế độ riêng tư của trình duyệt có thể chặn ghi. Mất khả năng lưu không
    // ảnh hưởng tới việc dùng ứng dụng nên bỏ qua trong im lặng là đúng.
  }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY_PROFILE), ...parsed };
  } catch {
    return null;
  }
}

export function clearProfile() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* như trên */ }
}

export function readTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

export function writeTheme(value) {
  try { localStorage.setItem(THEME_KEY, value); } catch { /* như trên */ }
}

/**
 * Phiên đăng nhập tài khoản (giai đoạn 2, tuỳ chọn). Chỉ lưu token và email —
 * không lưu hồ sơ tài chính ở đây, hồ sơ chỉ đồng bộ khi người dùng bấm nút.
 */
export function saveSession(account) {
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); } catch { /* như trên */ }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(ACCOUNT_KEY); } catch { /* như trên */ }
}
