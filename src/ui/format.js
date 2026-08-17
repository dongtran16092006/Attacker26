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

/**
 * Số tháng quỹ dự phòng cầm cự được.
 *
 * Vô hạn là trường hợp có thật: hồ sơ chưa khai chi phí thiết yếu nào thì mẫu
 * số bằng 0. Trước đây chỗ này in ra chữ "Infinity" giữa một giao diện tiếng
 * Việt, nên phải nói rõ là chưa đủ dữ liệu để tính.
 */
export function runwayMonths(v) {
  if (!Number.isFinite(v)) return 'chưa tính được';
  return `${decimal(v)} tháng`;
}

/** Giá trị an toàn để nhét vào thuộc tính data-count của lớp đếm số. */
export const countable = (v) => (Number.isFinite(v) ? v : 0);

/** Chặn ký tự lạ khi nhét dữ liệu người dùng vào chuỗi HTML. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Đọc số người dùng gõ.
 *
 * Có hai quy ước cùng tồn tại trên một màn hình và phải phân biệt được:
 *
 * Người Việt gõ tiền theo kiểu "25.000.000", dấu chấm ngăn nghìn và dấu phẩy
 * ngăn thập phân. Nhưng ô <input type="number"> của trình duyệt luôn trả về giá
 * trị theo chuẩn máy, tức dấu chấm ngăn thập phân: ô lãi suất đặt sẵn 0,8% sẽ
 * đọc ra chuỗi "0.8". Nếu bỏ hết dấu chấm như cách cũ thì "0.8" thành 8, và
 * toàn bộ nhóm quyết định trả góp tính sai gấp mười lần.
 *
 * Cách phân biệt: có dấu phẩy thì chắc chắn là kiểu Việt. Chỉ có dấu chấm thì
 * xem hình dạng - mọi nhóm sau dấu chấm đều đúng ba chữ số thì đó là ngăn
 * nghìn, còn lại là dấu thập phân. Trường hợp lấp lửng duy nhất là "1.234", ưu
 * tiên hiểu theo kiểu Việt vì đây là ứng dụng tiếng Việt nói chuyện tiền bạc.
 */
export function parseAmount(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;

  const cleaned = String(raw).replace(/[^\d.,-]/g, '');
  if (cleaned === '') return 0;

  const vietnamese = cleaned.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(cleaned);
  const normalised = vietnamese
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  const n = Number.parseFloat(normalised);
  return Number.isFinite(n) ? n : 0;
}
