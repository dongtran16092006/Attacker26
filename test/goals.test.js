import test from 'node:test';
import assert from 'node:assert/strict';
import { monthsToGoal, normaliseWeights, accumulationPath } from '../src/engine/goals.js';

test('bảng thời gian đạt mục tiêu khớp bản kiểm chứng', () => {
  const cases = [[500_000, 34], [1_000_000, 18], [1_400_000, 13], [2_000_000, 9], [3_000_000, 6]];
  for (const [monthly, expected] of cases) {
    assert.equal(monthsToGoal(20_000_000, 2_000_000, monthly), expected);
  }
});

test('mục tiêu đã đủ tiền cần 0 tháng', () => {
  assert.equal(monthsToGoal(10_000_000, 10_000_000, 500_000), 0);
});

test('không có dòng tiền góp thì không bao giờ đạt', () => {
  assert.equal(monthsToGoal(10_000_000, 0, 0), Infinity);
});

test('góp nhiều hơn thì đạt sớm hơn, không có ngoại lệ', () => {
  let previous = Infinity;
  for (let monthly = 200_000; monthly <= 5_000_000; monthly += 200_000) {
    const eta = monthsToGoal(30_000_000, 1_000_000, monthly);
    assert.ok(eta <= previous, `góp ${monthly} cho ETA ${eta} lớn hơn mức góp thấp hơn`);
    previous = eta;
  }
});

test('lãi suất 0 rơi về phép chia đơn giản', () => {
  assert.equal(monthsToGoal(10_000_000, 0, 1_000_000, 0), 10);
});

test('tỷ trọng phân bổ luôn được chuẩn hoá về tổng bằng 1', () => {
  const goals = [{ allocWeight: 3 }, { allocWeight: 1 }];
  const sum = normaliseWeights(goals).reduce((s, g) => s + g.allocWeight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
});

test('tỷ trọng bằng 0 hết thì chia đều thay vì chia cho 0', () => {
  const out = normaliseWeights([{ allocWeight: 0 }, { allocWeight: 0 }]);
  assert.deepEqual(out.map((g) => g.allocWeight), [0.5, 0.5]);
});

test('quỹ đạo tích luỹ tăng đơn điệu và có đúng số điểm', () => {
  const path = accumulationPath(1_000_000, 500_000, 12);
  assert.equal(path.length, 13);
  for (let i = 1; i < path.length; i += 1) assert.ok(path[i] > path[i - 1]);
});
