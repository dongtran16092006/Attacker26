import test from 'node:test';
import assert from 'node:assert/strict';
import { welcomeView } from '../src/ui/views/welcome.js';
import { dashboardView } from '../src/ui/views/dashboard.js';
import { decisionView } from '../src/ui/views/decision.js';
import { compareView } from '../src/ui/views/compare.js';
import { assumptionsView } from '../src/ui/views/assumptions.js';
import { profileFormView } from '../src/ui/views/profileForm.js';
import { accountView } from '../src/ui/views/account.js';
import { escapeHtml } from '../src/ui/format.js';
import { analyseInstallment } from '../src/engine/finance.js';
import { makeEvent, rank } from '../src/engine/index.js';
import { STANDARD_PROFILE, LAPTOP } from './fixtures.js';

/**
 * Giao diện được dựng bằng chuỗi nên kiểm thử được ngay trong Node, không cần
 * trình duyệt giả lập. Đây chính là lý do chọn cách render này.
 */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'hr', 'img', 'input', 'link', 'meta', 'source']);

/** Đếm thẻ mở và thẻ đóng, bỏ qua thẻ rỗng và thẻ tự đóng kiểu <path ... />. */
const balanced = (html) => {
  let open = 0;
  let close = 0;
  const tag = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*)>/g;
  let m = tag.exec(html);
  while (m !== null) {
    const [, slash, name, attrs] = m;
    if (slash) close += 1;
    else if (!VOID_TAGS.has(name.toLowerCase()) && !attrs.trimEnd().endsWith('/')) open += 1;
    m = tag.exec(html);
  }
  return { open, close };
};

const baseState = {
  profile: STANDARD_PROFILE, wizardStep: 0, decisionKind: 'purchase',
  results: null, installment: null, view: 'welcome',
};

test('mọi màn hình dựng ra chuỗi HTML không rỗng', () => {
  const screens = {
    welcome: welcomeView(baseState),
    profile: profileFormView(baseState),
    dashboard: dashboardView(baseState),
    decision: decisionView(baseState),
    assumptions: assumptionsView(baseState),
    account: accountView(baseState),
  };
  for (const [name, html] of Object.entries(screens)) {
    assert.ok(html.length > 200, `${name} quá ngắn`);
    assert.ok(!html.includes('undefined'), `${name} lọt giá trị undefined`);
    assert.ok(!html.includes('NaN'), `${name} lọt giá trị NaN`);
  }
});

test('bốn bước của biểu mẫu hồ sơ đều dựng được', () => {
  for (let step = 0; step < 4; step += 1) {
    const html = profileFormView({ ...baseState, wizardStep: step });
    assert.ok(html.includes('data-action="wizard-next"'), `bước ${step} thiếu nút tiếp tục`);
    assert.ok(!html.includes('undefined'));
  }
});

test('cả bốn nhóm quyết định đều dựng được biểu mẫu', () => {
  for (const kind of ['purchase', 'installment', 'allocation', 'savings']) {
    const html = decisionView({ ...baseState, decisionKind: kind });
    assert.ok(html.length > 200, `${kind} quá ngắn`);
    assert.ok(!html.includes('undefined'));
  }
});

test('màn so sánh hiển thị đủ ba phương án và ô lãi suất thực', () => {
  const installment = analyseInstallment(LAPTOP);
  const events = [
    makeEvent('Trả thẳng toàn bộ', { upfront: LAPTOP.price }),
    makeEvent('Trả góp 12 tháng', {
      upfront: LAPTOP.downPayment, recurring: installment.payment, recurringMonths: 12,
    }),
    makeEvent('Trì hoãn 4 tháng rồi mua', { delayMonths: 4, delayed: 25_335_004 }),
  ];
  const results = rank(STANDARD_PROFILE, events, { 'Trả góp 12 tháng': { installment } });
  const html = compareView({ ...baseState, results, installment });

  assert.ok(html.includes('Trả thẳng toàn bộ'));
  assert.ok(html.includes('Trả góp 12 tháng'));
  assert.ok(html.includes('Trì hoãn 4 tháng rồi mua'));
  assert.ok(html.includes('21,46%'), 'thiếu con số lãi suất thực');
  assert.ok(html.includes('Không khuyến nghị'), 'thiếu nhãn chặn cứng');
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('NaN'));
});

test('màn so sánh không vỡ khi chưa có kết quả', () => {
  const html = compareView({ ...baseState, results: null });
  assert.ok(html.includes('Chưa có kết quả'));
});

test('hồ sơ rỗng không làm vỡ bảng chỉ số', () => {
  const empty = { income: 1, essential: 0, discretionary: 0, liquidAssets: 0, debts: [], goals: [], incomeStability: 'stable' };
  const html = dashboardView({ ...baseState, profile: empty });
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('NaN'));
});

test('thẻ mở và thẻ đóng cân bằng trên mọi màn hình', () => {
  const loggedIn = { ...baseState, account: { token: 't', email: 'a@b.com' }, accountStatus: 'Đã đồng bộ.' };
  for (const html of [
    welcomeView(baseState),
    dashboardView(baseState),
    assumptionsView(baseState),
    accountView(baseState),
    accountView(loggedIn),
  ]) {
    const { open, close } = balanced(html);
    assert.equal(open, close, `lệch thẻ: mở ${open}, đóng ${close}`);
  }
});

test('màn tài khoản chuyển đúng giữa trạng thái đăng nhập và chưa đăng nhập', () => {
  const loggedOut = accountView(baseState);
  assert.ok(loggedOut.includes('data-action="account-register"'));
  assert.ok(!loggedOut.includes('data-action="account-logout"'));

  const loggedIn = accountView({ ...baseState, account: { token: 't', email: '<script>x</script>@b.com' } });
  assert.ok(loggedIn.includes('data-action="account-logout"'));
  assert.ok(!loggedIn.includes('data-action="account-register"'));
  assert.ok(!loggedIn.includes('<script>x</script>'), 'email chưa được thoát ký tự');
  assert.ok(loggedIn.includes('&lt;script&gt;'));
});

test('tên mục tiêu do người dùng nhập được thoát ký tự trước khi ghép vào HTML', () => {
  const hostile = { ...STANDARD_PROFILE, goals: [{ ...STANDARD_PROFILE.goals[0], name: '<img src=x onerror=alert(1)>' }] };
  const html = dashboardView({ ...baseState, profile: hostile });
  assert.ok(!html.includes('<img src=x'), 'chuỗi độc hại lọt vào HTML');
  assert.ok(html.includes('&lt;img'));
});

test('hàm thoát ký tự xử lý đủ năm ký tự nguy hiểm', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});
