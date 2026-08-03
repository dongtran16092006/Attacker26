import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flatRatePayment, reducingBalancePayment, effectiveApr, analyseInstallment, presentValue,
} from '../src/engine/finance.js';
import { LAPTOP } from './fixtures.js';

const near = (actual, expected, tol) =>
  assert.ok(Math.abs(actual - expected) <= tol, `mong đợi ${expected}, nhận ${actual}`);

test('lãi phẳng 1%/tháng trên 20 triệu trong 12 tháng ra 1.866.667 đ', () => {
  near(flatRatePayment(20_000_000, 12, 0.01), 1_866_667, 1);
});

test('lãi suất thực của gói trên là 21,46%/năm', () => {
  const payment = flatRatePayment(20_000_000, 12, 0.01);
  near(effectiveApr(20_000_000, payment, 12) * 100, 21.46, 0.005);
});

test('đưa lãi suất thực ngược vào công thức dư nợ giảm dần phải ra lại đúng khoản trả', () => {
  const payment = flatRatePayment(20_000_000, 12, 0.01);
  const apr = effectiveApr(20_000_000, payment, 12);
  near(reducingBalancePayment(20_000_000, 12, apr), payment, 1e-4);
});

test('lãi phẳng 0% cho lãi suất thực bằng 0', () => {
  near(effectiveApr(10_000_000, 10_000_000 / 12, 12), 0, 1e-9);
});

test('hệ số chênh lệch nằm trong khoảng 1,74 đến 1,82 với mọi mức lãi phẳng thông dụng', () => {
  for (const months of [6, 12, 18, 24]) {
    for (const flat of [0.005, 0.008, 0.01, 0.015, 0.02]) {
      const { spread } = analyseInstallment({ price: 20_000_000, downPayment: 0, months, flatMonthly: flat });
      assert.ok(spread > 1.6 && spread < 1.9, `${months} tháng / ${flat}: hệ số ${spread}`);
    }
  }
});

test('bảng tra cứu lãi suất thực khớp bản kiểm chứng', () => {
  const expected = {
    6: [10.21, 16.27, 20.29, 30.23],
    12: [10.90, 17.27, 21.46, 31.72],
    18: [11.08, 17.47, 21.64, 31.76],
    24: [11.13, 17.47, 21.57, 31.46],
  };
  for (const [months, row] of Object.entries(expected)) {
    [0.005, 0.008, 0.01, 0.015].forEach((flat, i) => {
      const { trueApr } = analyseInstallment({ price: 20_000_000, downPayment: 0, months: +months, flatMonthly: flat });
      near(trueApr * 100, row[i], 0.006);
    });
  }
});

test('phân tích gói trả góp laptop cho tổng chi 27.400.000 đ', () => {
  const r = analyseInstallment(LAPTOP);
  near(r.totalPaid, 27_400_000, 1);
  near(r.totalInterest, 2_400_000, 1);
});

test('giá trị hiện tại của khoản chi ngay bằng chính nó', () => {
  near(presentValue({ upfront: 25_000_000 }), 25_000_000, 1e-6);
});

test('chi trả dần có giá trị hiện tại thấp hơn tổng danh nghĩa', () => {
  const pv = presentValue({ recurring: 1_000_000, recurringMonths: 12 });
  assert.ok(pv < 12_000_000, 'chiết khấu phải làm giảm giá trị');
});

test('kỳ hạn không hợp lệ bị chặn', () => {
  assert.throws(() => flatRatePayment(1_000_000, 0, 0.01), RangeError);
});
