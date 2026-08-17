/**
 * Cửa duy nhất giao diện gọi vào engine.
 *
 * Ý tưởng trung tâm của cả sản phẩm nằm ở đây: bốn nhóm quyết định trong phạm vi
 * MVP (mua sắm giá trị lớn, chọn phương án trả góp, phân bổ tiền giữa các mục
 * tiêu, điều chỉnh kế hoạch tiết kiệm) khác nhau về bối cảnh nhưng đồng nhất về
 * cấu trúc toán học. Tất cả đều quy về một câu hỏi: một sự kiện dòng tiền tác
 * động thế nào lên hồ sơ hiện tại và lên thời điểm đạt mục tiêu. Nhờ vậy chỉ cần
 * một engine kèm bốn biểu mẫu nhập liệu, thay vì bốn hệ thống riêng.
 */

import { ASSUMPTIONS, monthlyRate } from './config.js';
import { presentValue } from './finance.js';
import { monthsToGoal, normaliseWeights } from './goals.js';
import { baseline } from './profile.js';
import { scoreOutcome, applyHardGate } from './scoring.js';
import { explain } from './explain.js';

export * from './config.js';
export * from './finance.js';
export * from './goals.js';
export * from './profile.js';
export * from './scoring.js';
export { explain } from './explain.js';

/**
 * Sự kiện tài chính chuẩn hoá. Mọi phương án của cả bốn nhóm quyết định đều mô
 * tả được bằng đúng sáu trường này.
 * @typedef {Object} FinancialEvent
 * @property {string} label
 * @property {number} [upfront] chi ngay tại thời điểm hiện tại
 * @property {number} [recurring] chi đều mỗi tháng
 * @property {number} [recurringMonths]
 * @property {number} [delayMonths] số tháng trì hoãn trước khi chi
 * @property {number} [delayed] số tiền chi sau khi trì hoãn
 * @property {number} [surplusDelta] thay đổi dòng tiền dư
 */

export function makeEvent(label, patch = {}) {
  return {
    label,
    upfront: 0,
    recurring: 0,
    recurringMonths: 0,
    delayMonths: 0,
    delayed: 0,
    surplusDelta: 0,
    ...patch,
  };
}

/** Áp một sự kiện lên hồ sơ và tính lại toàn bộ chỉ số. */
export function simulate(profile, event) {
  const base = baseline(profile);
  const goals = normaliseWeights(profile.goals);
  const d = monthlyRate(ASSUMPTIONS.savingsApr);

  // Trì hoãn: tích luỹ dòng tiền dư có sinh lãi trong K tháng rồi mới chi.
  let liquidAfter = profile.liquidAssets - event.upfront;
  if (event.delayMonths > 0) {
    let balance = profile.liquidAssets;
    for (let t = 0; t < event.delayMonths; t += 1) {
      balance = balance * (1 + d) + base.surplus;
    }
    liquidAfter = balance - event.delayed;
  } else {
    liquidAfter -= event.delayed;
  }

  const debtPaymentsAfter = base.debtPayments + event.recurring;
  const minimumSpendAfter = profile.essential + debtPaymentsAfter;
  const surplusAfter =
    profile.income - profile.essential - profile.discretionary - debtPaymentsAfter + event.surplusDelta;

  const goalOutcomes = goals.map((goal) => {
    const contributionBefore = base.surplus * goal.allocWeight;
    const contributionAfter = Math.max(surplusAfter, 0) * goal.allocWeight;
    const etaBefore = monthsToGoal(goal.target, goal.saved, contributionBefore);
    const etaAfter = monthsToGoal(goal.target, goal.saved, contributionAfter);
    const delayMonths =
      Number.isFinite(etaAfter) && Number.isFinite(etaBefore) ? etaAfter - etaBefore : Infinity;
    return {
      name: goal.name,
      deadlineMonth: goal.deadlineMonth,
      etaBefore,
      etaAfter,
      delayMonths,
      missesDeadline: !(etaAfter <= goal.deadlineMonth),
    };
  });

  return {
    label: event.label,
    liquidAfter,
    runwayAfter: minimumSpendAfter > 0 ? liquidAfter / minimumSpendAfter : Infinity,
    dtiAfter: profile.income > 0 ? debtPaymentsAfter / profile.income : 0,
    surplusAfter,
    totalCash: event.upfront + event.recurring * event.recurringMonths + event.delayed,
    presentValue: presentValue({
      upfront: event.upfront,
      recurring: event.recurring,
      recurringMonths: event.recurringMonths,
      delayed: event.delayed,
      delayMonths: event.delayMonths,
    }),
    goals: goalOutcomes,
  };
}

/** Mô phỏng, chấm điểm, áp chặn cứng, sinh diễn giải. */
export function evaluate(profile, event, extras = {}) {
  const outcome = simulate(profile, event);
  const score = applyHardGate(scoreOutcome(profile, outcome), outcome);
  return { outcome, score, messages: explain(profile, outcome, extras) };
}

/**
 * Xếp hạng các phương án. Engine không chọn thay người dùng: nó sắp xếp theo
 * mức an toàn, và khi hai phương án ngang điểm thì phương án rẻ hơn về giá trị
 * hiện tại đứng trước.
 */
export function rank(profile, events, extrasByLabel = {}) {
  return rankScenarios(events.map((event) => ({ profile, event })), extrasByLabel);
}

/**
 * Bản tổng quát của rank cho trường hợp mỗi phương án gắn với một hồ sơ khác
 * nhau. Nhóm quyết định "phân bổ giữa các mục tiêu" cần đúng điều này: thay đổi
 * tỷ trọng là thay đổi hồ sơ, không phải thay đổi sự kiện dòng tiền.
 * @param {{profile: Object, event: FinancialEvent}[]} scenarios
 */
export function rankScenarios(scenarios, extrasByLabel = {}) {
  return scenarios
    .map(({ profile, event }) => ({
      ...evaluate(profile, event, extrasByLabel[event.label] || {}),
      label: event.label,
    }))
    .sort((a, b) => b.score.total - a.score.total || a.outcome.presentValue - b.outcome.presentValue)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}
