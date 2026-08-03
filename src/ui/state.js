/**
 * Trạng thái ứng dụng.
 *
 * Toàn bộ dữ liệu nằm trong bộ nhớ trình duyệt và localStorage. Không có máy
 * chủ, không có lệnh gọi mạng nào trong mã nguồn. Đây là lựa chọn có chủ đích:
 * dữ liệu thu nhập, nợ và tài sản là dữ liệu cá nhân nhạy cảm, nên ở giai đoạn
 * kiểm chứng, cách an toàn nhất là không thu thập gì cả.
 */

import { EMPTY_PROFILE } from '../engine/profile.js';

const STORAGE_KEY = 'decifin.profile.v1';
const THEME_KEY = 'decifin.theme';

const listeners = new Set();

export const state = {
  view: 'welcome',
  profile: structuredClone(EMPTY_PROFILE),
  wizardStep: 0,
  decisionKind: 'purchase',
  decisionInput: null,
  results: null,
  installment: null,
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
