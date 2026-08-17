import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDERS, ScenarioError, buildPurchase, buildInstallment, buildAllocation, buildSavings } from '../src/ui/scenarios.js';
import { rank, rankScenarios } from '../src/engine/index.js';
import { STANDARD_PROFILE } from './fixtures.js';

/** Giả lập việc đọc giá trị từ các ô nhập liệu. */
const reader = (values) => (name) => values[name] ?? 0;

test('mua sắm dựng đủ ba phương án khi có trì hoãn', () => {
  const { events, installment } = buildPurchase(reader({
    price: 25_000_000, downPayment: 5_000_000, months: 12, flatRate: 1, delayMonths: 4,
  }));
  assert.equal(events.length, 3);
  assert.ok(Math.abs(installment.trueApr * 100 - 21.46) < 0.01);
});

test('mua sắm bỏ phương án trì hoãn khi người dùng nhập 0 tháng', () => {
  const { events } = buildPurchase(reader({ price: 10_000_000, months: 6, flatRate: 1, delayMonths: 0 }));
  assert.equal(events.length, 2);
});

test('trả trước lớn hơn giá món hàng bị kẹp lại, không sinh khoản vay âm', () => {
  const { installment } = buildPurchase(reader({
    price: 10_000_000, downPayment: 50_000_000, months: 12, flatRate: 1,
  }));
  assert.ok(installment.financed >= 0, 'số tiền vay không được âm');
});

test('giá bằng 0 bị chặn bằng lỗi có thông điệp tiếng Việt', () => {
  assert.throws(() => buildPurchase(reader({ price: 0 })), ScenarioError);
});

test('so sánh gói trả góp luôn kèm phương án không vay làm mốc', () => {
  const { events, installment } = buildInstallment(reader({
    price: 25_000_000, downPayment: 5_000_000, monthsA: 6, flatA: 0.8, monthsB: 12, flatB: 1,
  }));
  assert.equal(events.length, 3);
  assert.equal(events[0].label, 'Trả thẳng, không vay');
  // gói đắt nhất theo lãi thực được nêu ra để cảnh báo
  assert.ok(installment.trueApr > 0.2);
});

test('phân bổ dựng các cách chia khác nhau và không trùng lặp', () => {
  const { scenarios } = buildAllocation(reader({}), STANDARD_PROFILE);
  assert.ok(scenarios.length >= 3);
  const labels = new Set(scenarios.map((s) => s.event.label));
  assert.equal(labels.size, scenarios.length, 'có nhãn trùng nhau');
  scenarios.forEach((s) => {
    const total = s.profile.goals.reduce((sum, g) => sum + g.allocWeight, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, 'tỷ trọng không cộng về 1');
  });
});

test('phân bổ bị chặn khi hồ sơ chỉ có một mục tiêu', () => {
  const single = { ...STANDARD_PROFILE, goals: [STANDARD_PROFILE.goals[0]] };
  assert.throws(() => buildAllocation(reader({}), single), ScenarioError);
});

test('tiết kiệm thêm không cắt quá số chi tiêu linh hoạt đang có', () => {
  const { events } = buildSavings(reader({ savingsDelta: 5_000_000 }), STANDARD_PROFILE);
  events.forEach((e) => assert.ok(e.surplusDelta <= STANDARD_PROFILE.discretionary));
});

test('tiết kiệm thêm làm điểm an toàn tăng lên', () => {
  const { events } = buildSavings(reader({ savingsDelta: 1_000_000 }), STANDARD_PROFILE);
  const results = rank(STANDARD_PROFILE, events);
  const keep = results.find((r) => r.label === 'Giữ nguyên như hiện tại');
  const more = results.find((r) => r.label !== 'Giữ nguyên như hiện tại');
  assert.ok(more.score.total >= keep.score.total, 'tiết kiệm thêm phải không làm điểm giảm');
});

test('hồ sơ không còn chi tiêu linh hoạt thì báo lỗi thay vì dựng một phương án', () => {
  const tight = { ...STANDARD_PROFILE, discretionary: 0 };
  assert.throws(() => buildSavings(reader({ savingsDelta: 1_000_000 }), tight), ScenarioError);
});

test('mọi nhóm quyết định đều dựng được kết quả xếp hạng hoàn chỉnh', () => {
  const inputs = reader({
    price: 25_000_000, downPayment: 5_000_000, months: 12, flatRate: 1, delayMonths: 4,
    monthsA: 6, flatA: 0.8, monthsB: 12, flatB: 1, savingsDelta: 1_000_000,
  });
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const built = build(inputs, STANDARD_PROFILE);
    const results = built.scenarios
      ? rankScenarios(built.scenarios, built.extras || {})
      : rank(STANDARD_PROFILE, built.events, built.extras || {});
    assert.ok(results.length >= 2, `${kind} phải cho ít nhất hai phương án để so sánh`);
    results.forEach((r) => {
      assert.ok(Number.isFinite(r.score.total), `${kind} cho điểm không hợp lệ`);
      assert.ok(r.rank >= 1);
    });
  }
});
