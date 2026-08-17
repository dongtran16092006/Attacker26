import test from 'node:test';
import assert from 'node:assert/strict';
import { baseline, validate } from '../src/engine/profile.js';
import { analyseInstallment, flatRatePayment } from '../src/engine/finance.js';
import { monthlyRate, ASSUMPTIONS } from '../src/engine/config.js';
import { makeEvent, simulate, evaluate, rank } from '../src/engine/index.js';
import { STANDARD_PROFILE, FRAGILE_PROFILE, LAPTOP } from './fixtures.js';

const near = (actual, expected, tol) =>
  assert.ok(Math.abs(actual - expected) <= tol, `mong đợi ${expected}, nhận ${actual}`);

/** Ba phương án mua laptop, dựng lại đúng như bản đặc tả. */
function laptopOptions() {
  const { payment } = analyseInstallment(LAPTOP);
  return [
    makeEvent('Trả thẳng', { upfront: LAPTOP.price }),
    makeEvent('Trả góp 12 tháng', {
      upfront: LAPTOP.downPayment, recurring: payment, recurringMonths: LAPTOP.months,
    }),
    makeEvent('Trì hoãn 4 tháng', {
      delayMonths: 4,
      delayed: LAPTOP.price * (1 + monthlyRate(ASSUMPTIONS.inflationApr)) ** 4,
    }),
  ];
}

test('chỉ số nền của hồ sơ chuẩn', () => {
  const b = baseline(STANDARD_PROFILE);
  near(b.surplus, 3_500_000, 0.5);
  near(b.savingsRate * 100, 29.17, 0.01);
  near(b.runway, 3.85, 0.01);
  near(b.dti, 0, 1e-9);
});

test('hồ sơ hợp lệ không sinh lỗi', () => {
  assert.deepEqual(validate(STANDARD_PROFILE), []);
});

test('thu nhập bằng 0 bị bắt lỗi', () => {
  const errors = validate({ ...STANDARD_PROFILE, income: 0 });
  assert.ok(errors.length > 0);
});

test('trả thẳng vét sạch quỹ dự phòng về 0 tháng', () => {
  const o = simulate(STANDARD_PROFILE, makeEvent('Trả thẳng', { upfront: 25_000_000 }));
  near(o.liquidAfter, 0, 0.5);
  near(o.runwayAfter, 0, 0.01);
  near(o.totalCash, 25_000_000, 0.5);
  near(o.presentValue, 25_000_000, 0.5);
});

test('trả góp cho tổng chi và giá trị hiện tại khớp bản kiểm chứng', () => {
  const payment = flatRatePayment(20_000_000, 12, 0.01);
  const o = simulate(STANDARD_PROFILE, makeEvent('Trả góp', {
    upfront: 5_000_000, recurring: payment, recurringMonths: 12,
  }));
  near(o.totalCash, 27_400_000, 1);
  near(o.presentValue, 26_804_948, 1);
  near(o.runwayAfter, 2.39, 0.01);
  near(o.dtiAfter * 100, 15.56, 0.01);
});

test('trì hoãn 4 tháng khớp bản kiểm chứng', () => {
  const o = simulate(STANDARD_PROFILE, makeEvent('Trì hoãn', {
    delayMonths: 4, delayed: 25_000_000 * (1 + monthlyRate(0.04)) ** 4,
  }));
  near(o.totalCash, 25_335_004, 1);
  near(o.presentValue, 24_917_116, 1);
  near(o.runwayAfter, 2.18, 0.01);
});

test('xếp hạng ba phương án ra đúng thứ tự trì hoãn, trả góp, trả thẳng', () => {
  const results = rank(STANDARD_PROFILE, laptopOptions());
  assert.deepEqual(results.map((r) => r.label), ['Trì hoãn 4 tháng', 'Trả góp 12 tháng', 'Trả thẳng']);
  near(results[0].score.total, 72.9, 0.05);
  near(results[1].score.total, 64.5, 0.05);
  near(results[2].score.total, 35.0, 0.05);
});

test('trả thẳng bị chặn cứng dù rẻ nhất về tiền mặt', () => {
  const results = rank(STANDARD_PROFILE, laptopOptions());
  const cash = results.find((r) => r.label === 'Trả thẳng');
  assert.equal(cash.score.band, 'blocked');
  assert.ok(cash.score.breaches.some((b) => b.code === 'LIQUIDITY_DRAINED'));
  // đây chính là lý do tầng chặn cứng tồn tại: rẻ nhất mà vẫn không nên chọn
  const cheapest = results.reduce((a, b) => (a.outcome.totalCash <= b.outcome.totalCash ? a : b));
  assert.equal(cheapest.label, 'Trả thẳng');
});

test('hồ sơ yếu gánh khoản trả góp nặng thì dòng tiền âm và bị chặn', () => {
  const r = evaluate(FRAGILE_PROFILE, makeEvent('Trả góp nặng', {
    upfront: 2_000_000, recurring: 1_800_000, recurringMonths: 12,
  }));
  assert.ok(r.outcome.surplusAfter < 0);
  assert.equal(r.score.band, 'blocked');
  assert.ok(r.score.breaches.some((b) => b.code === 'NEGATIVE_CASHFLOW'));
});

test('trả càng nhiều mỗi tháng thì điểm càng giảm, không có chỗ tăng ngược', () => {
  let previous = Infinity;
  for (let pay = 500_000; pay <= 4_000_000; pay += 250_000) {
    const { score } = evaluate(STANDARD_PROFILE, makeEvent('thử', {
      upfront: 5_000_000, recurring: pay, recurringMonths: 12,
    }));
    assert.ok(score.total <= previous + 1e-9, `khoản trả ${pay} làm điểm tăng ngược`);
    previous = score.total;
  }
});

test('diễn giải nêu được lãi suất thực khi có gói trả góp', () => {
  const installment = analyseInstallment(LAPTOP);
  const r = evaluate(STANDARD_PROFILE, makeEvent('Trả góp', {
    upfront: LAPTOP.downPayment, recurring: installment.payment, recurringMonths: LAPTOP.months,
  }), { installment });
  assert.ok(r.messages.some((m) => m.text.includes('21,46%') || m.text.includes('21.46%')));
});

test('phương án bị chặn luôn kèm câu giải thích mức chặn', () => {
  const r = evaluate(STANDARD_PROFILE, makeEvent('Trả thẳng', { upfront: 25_000_000 }));
  assert.ok(r.messages.some((m) => m.severity === 'block'));
});

test('không có mục tiêu nào thì vẫn chạy được, không chia cho 0', () => {
  const bare = { ...STANDARD_PROFILE, goals: [] };
  const r = evaluate(bare, makeEvent('Trả thẳng', { upfront: 1_000_000 }));
  assert.ok(Number.isFinite(r.score.total));
});
