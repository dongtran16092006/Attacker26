/** Toán trả góp và giá trị thời gian của tiền. */

import { ASSUMPTIONS, monthlyRate } from './config.js';

/**
 * Khoản trả hằng tháng theo lãi phẳng: lãi tính trên toàn bộ dư nợ gốc ban đầu
 * suốt kỳ hạn, dù người vay đã trả dần gốc. Đây là cách các gói trả góp tiêu
 * dùng thường niêm yết.
 * @param {number} principal số tiền vay
 * @param {number} months kỳ hạn
 * @param {number} flatMonthly lãi phẳng theo tháng, ví dụ 0.01 cho 1%/tháng
 */
export function flatRatePayment(principal, months, flatMonthly) {
  if (months <= 0) throw new RangeError('Kỳ hạn phải lớn hơn 0');
  return principal / months + principal * flatMonthly;
}

/** Khoản trả hằng tháng theo dư nợ giảm dần (niên kim). */
export function reducingBalancePayment(principal, months, apr) {
  if (months <= 0) throw new RangeError('Kỳ hạn phải lớn hơn 0');
  const i = monthlyRate(apr);
  if (i === 0) return principal / months;
  const growth = (1 + i) ** months;
  return (principal * i * growth) / (growth - 1);
}

/**
 * Lãi suất thực: mức lãi làm cho giá trị hiện tại của dòng tiền hoàn trả bằng
 * đúng số tiền vay. Không có công thức đóng nên giải bằng chia đôi khoảng.
 * Chọn chia đôi thay vì Newton vì nó luôn hội tụ, không phụ thuộc điểm khởi tạo.
 * @returns {number} lãi suất thực theo năm
 */
export function effectiveApr(principal, monthlyPayment, months) {
  if (months <= 0) throw new RangeError('Kỳ hạn phải lớn hơn 0');
  if (monthlyPayment * months <= principal) return 0;

  const npvAt = (i) => {
    let sum = 0;
    for (let t = 1; t <= months; t += 1) sum += monthlyPayment / (1 + i) ** t;
    return sum - principal;
  };

  let lo = 1e-9;
  let hi = 5;
  for (let step = 0; step < 300 && hi - lo > 1e-12; step += 1) {
    const mid = (lo + hi) / 2;
    if (npvAt(mid) > 0) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 12;
}

/**
 * Gói trả góp đã phân tích đầy đủ. Trường `spread` là tỷ số giữa lãi thực và
 * lãi phẳng quy đổi năm, tức mức mà con số quảng cáo đang che đi.
 */
export function analyseInstallment({ price, downPayment = 0, months, flatMonthly }) {
  const financed = price - downPayment;
  const payment = flatRatePayment(financed, months, flatMonthly);
  const advertisedApr = flatMonthly * 12;
  const trueApr = effectiveApr(financed, payment, months);
  return {
    financed,
    payment,
    months,
    totalPaid: downPayment + payment * months,
    totalInterest: payment * months - financed,
    advertisedApr,
    trueApr,
    spread: advertisedApr > 0 ? trueApr / advertisedApr : 1,
  };
}

/**
 * Giá trị hiện tại của một chuỗi chi tiêu, chiết khấu theo lãi suất cơ hội.
 * Một triệu phải trả sau 12 tháng nhẹ hơn một triệu phải trả hôm nay, và đây
 * là chỗ duy nhất phản ánh được điều đó.
 */
export function presentValue({ upfront = 0, recurring = 0, recurringMonths = 0, delayed = 0, delayMonths = 0 }, apr = ASSUMPTIONS.savingsApr) {
  const d = monthlyRate(apr);
  let pv = upfront;
  for (let t = 1; t <= recurringMonths; t += 1) pv += recurring / (1 + d) ** t;
  if (delayMonths > 0) pv += delayed / (1 + d) ** delayMonths;
  else pv += delayed;
  return pv;
}
