/**
 * Dựng các phương án để so sánh, từ dữ liệu người dùng nhập.
 *
 * Tách khỏi tầng giao diện để kiểm thử được: mỗi hàm nhận một hàm đọc số và hồ
 * sơ hiện tại, trả về danh sách phương án. Không đụng tới DOM.
 *
 * @typedef {(name: string) => number} Reader
 */

import { makeEvent } from '../engine/index.js';
import { analyseInstallment } from '../engine/finance.js';
import { normaliseWeights } from '../engine/goals.js';
import { ASSUMPTIONS, monthlyRate } from '../engine/config.js';
import { money } from './format.js';

export class ScenarioError extends Error {}

/** Mua sắm giá trị lớn: trả thẳng, trả góp, trì hoãn. */
export function buildPurchase(read) {
  const price = read('price');
  if (!(price > 0)) throw new ScenarioError('Hãy nhập giá món hàng lớn hơn 0.');

  const downPayment = clamp(read('downPayment'), 0, price);
  const months = Math.max(Math.round(read('months')) || 12, 1);
  const flatMonthly = read('flatRate') / 100;
  const delayMonths = Math.max(Math.round(read('delayMonths')) || 0, 0);

  const installment = analyseInstallment({ price, downPayment, months, flatMonthly });
  const installmentLabel = `Trả góp ${months} tháng`;

  const events = [
    makeEvent('Trả thẳng toàn bộ', { upfront: price }),
    makeEvent(installmentLabel, {
      upfront: downPayment, recurring: installment.payment, recurringMonths: months,
    }),
  ];

  if (delayMonths > 0) {
    const inflated = price * (1 + monthlyRate(ASSUMPTIONS.inflationApr)) ** delayMonths;
    events.push(makeEvent(`Trì hoãn ${delayMonths} tháng rồi mua`, { delayMonths, delayed: inflated }));
  }

  return { events, installment, extras: { [installmentLabel]: { installment } } };
}

/** So sánh nhiều gói trả góp, kèm phương án không vay làm mốc đối chứng. */
export function buildInstallment(read) {
  const price = read('price');
  if (!(price > 0)) throw new ScenarioError('Hãy nhập giá món hàng lớn hơn 0.');

  const downPayment = clamp(read('downPayment'), 0, price);
  const packs = [
    { key: 'A', months: Math.max(Math.round(read('monthsA')) || 6, 1), flat: read('flatA') / 100 },
    { key: 'B', months: Math.max(Math.round(read('monthsB')) || 12, 1), flat: read('flatB') / 100 },
  ];

  const events = [makeEvent('Trả thẳng, không vay', { upfront: price })];
  const extras = {};
  let costliest = null;

  for (const pack of packs) {
    const analysis = analyseInstallment({ price, downPayment, months: pack.months, flatMonthly: pack.flat });
    const label = `Gói ${pack.key}: ${pack.months} tháng`;
    events.push(makeEvent(label, {
      upfront: downPayment, recurring: analysis.payment, recurringMonths: pack.months,
    }));
    extras[label] = { installment: analysis };
    if (!costliest || analysis.trueApr > costliest.trueApr) costliest = analysis;
  }

  return { events, extras, installment: costliest };
}

/**
 * Phân bổ giữa hai mục tiêu. Mỗi cách chia là một hồ sơ khác nhau chứ không
 * phải một sự kiện dòng tiền khác nhau, nên trả về danh sách kịch bản.
 */
export function buildAllocation(_read, profile) {
  const goals = normaliseWeights(profile.goals);
  if (goals.length < 2) throw new ScenarioError('Nhóm quyết định này cần ít nhất hai mục tiêu.');

  const candidates = [[0.8, 0.2], [0.5, 0.5], [0.2, 0.8], [goals[0].allocWeight, goals[1].allocWeight]];
  const seen = new Set();

  const scenarios = candidates
    .filter(([a, b]) => {
      const key = `${Math.round(a * 100)}-${Math.round(b * 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([a, b]) => ({
      profile: { ...profile, goals: [{ ...goals[0], allocWeight: a }, { ...goals[1], allocWeight: b }] },
      event: makeEvent(`${Math.round(a * 100)}% cho ${goals[0].name}, ${Math.round(b * 100)}% cho ${goals[1].name}`),
    }));

  return { scenarios };
}

/**
 * Điều chỉnh mức tiết kiệm. Tiết kiệm thêm nghĩa là cắt bớt chi tiêu linh hoạt,
 * nên dòng tiền dư tăng đúng bằng phần cắt đi, và không cắt quá số đang có.
 */
export function buildSavings(read, profile) {
  const delta = read('savingsDelta');
  if (!(delta > 0)) throw new ScenarioError('Hãy nhập số tiền tiết kiệm thêm lớn hơn 0.');

  const seen = new Set();
  const events = [0, delta, delta * 2]
    .map((d) => Math.min(d, profile.discretionary))
    .filter((d) => {
      const key = Math.round(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((d) => makeEvent(
      d === 0 ? 'Giữ nguyên như hiện tại' : `Tiết kiệm thêm ${money(d)} mỗi tháng`,
      { surplusDelta: d },
    ));

  if (events.length < 2) {
    throw new ScenarioError('Chi tiêu linh hoạt hiện tại không đủ để cắt thêm. Hãy kiểm tra lại hồ sơ.');
  }
  return { events };
}

export const BUILDERS = {
  purchase: buildPurchase,
  installment: buildInstallment,
  allocation: buildAllocation,
  savings: buildSavings,
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
