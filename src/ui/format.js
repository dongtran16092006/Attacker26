/** Định dạng hiển thị. Tách riêng để engine không dính gì tới chuyện trình bày. */

const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const money = (v) => `${vnd.format(Math.round(v))} đ`;

/** Rút gọn cho thẻ chỉ số: 25.000.000 thành 25,0 tr. */
export function moneyShort(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} tr`;
  if (abs >= 1_000) return `${Math.round(v / 1_000)} ng`;
  return vnd.format(Math.round(v));
}

export const percent = (v, digits = 1) => `${(v * 100).toFixed(digits).replace('.', ',')}%`;
export const decimal = (v, digits = 1) => v.toFixed(digits).replace('.', ',');

export function months(v) {
  if (!Number.isFinite(v)) return 'không đạt được';
  return `${decimal(v)} tháng`;
}

export function monthsInt(v) {
  if (!Number.isFinite(v)) return 'không đạt được';
  return `${Math.round(v)} tháng`;
}

/** Chặn ký tự lạ khi nhét dữ liệu người dùng vào chuỗi HTML. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Đọc số người dùng gõ, chấp nhận cả dấu chấm phân cách nghìn kiểu Việt Nam. */
export function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
