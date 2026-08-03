/** Thời điểm đạt mục tiêu tiết kiệm. */

import { ASSUMPTIONS, monthlyRate } from './config.js';

/**
 * Số tháng để đạt mục tiêu, có tính lãi kép trên phần đã tích luỹ.
 * Suy ra từ đẳng thức giá trị tương lai của dòng tiền đều có gốc ban đầu:
 *   target = saved*(1+r)^n + monthly*((1+r)^n - 1)/r
 * giải ra n. Trả về Infinity khi không thể đạt được.
 */
export function monthsToGoal(target, saved, monthly, apr = ASSUMPTIONS.savingsApr) {
  if (saved >= target) return 0;
  if (monthly <= 0) return Infinity;

  const r = monthlyRate(apr);
  if (r === 0) return Math.ceil((target - saved) / monthly);

  const numerator = target * r + monthly;
  const denominator = saved * r + monthly;
  if (numerator <= 0 || denominator <= 0) return Infinity;
  return Math.ceil(Math.log(numerator / denominator) / Math.log(1 + r));
}

/**
 * Chuẩn hoá tỷ trọng phân bổ về tổng bằng 1.
 * Bỏ qua bước này là lỗi im lặng nguy hiểm nhất của cả engine: mọi thời điểm
 * đạt mục tiêu sẽ sai mà không có dấu hiệu nào báo ra ngoài.
 */
export function normaliseWeights(goals) {
  const total = goals.reduce((sum, g) => sum + (g.allocWeight || 0), 0);
  if (total <= 0) {
    const even = goals.length > 0 ? 1 / goals.length : 0;
    return goals.map((g) => ({ ...g, allocWeight: even }));
  }
  return goals.map((g) => ({ ...g, allocWeight: (g.allocWeight || 0) / total }));
}

/** Quỹ đạo số dư tích luỹ theo tháng, dùng để vẽ biểu đồ. */
export function accumulationPath(saved, monthly, months, apr = ASSUMPTIONS.savingsApr) {
  const r = monthlyRate(apr);
  const path = [saved];
  let balance = saved;
  for (let t = 1; t <= months; t += 1) {
    balance = balance * (1 + r) + monthly;
    path.push(balance);
  }
  return path;
}
