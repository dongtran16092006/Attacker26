/**
 * Điều phối ứng dụng: dựng chuỗi HTML cho màn hình hiện tại, gắn vào DOM, và
 * bắt sự kiện bằng uỷ quyền ở gốc.
 *
 * Cách render bằng chuỗi được chọn có chủ đích: nó khiến mọi hàm dựng giao diện
 * trở thành hàm thuần nhận trạng thái trả về chuỗi, nên kiểm thử được bằng Node
 * mà không cần trình duyệt giả lập. Mọi thứ cần tới DOM thật, kể cả chuyển động,
 * nằm sau bước dựng chứ không nằm trong nó.
 */

import { makeEvent, rank, rankScenarios } from './engine/index.js';
import { validate, EMPTY_PROFILE } from './engine/profile.js';
import { normaliseWeights } from './engine/goals.js';
import {
  state, update, subscribe, saveProfile, loadProfile, clearProfile, readTheme, writeTheme,
  saveSession, loadSession, clearSession,
} from './ui/state.js';
import { parseAmount, escapeHtml } from './ui/format.js';
import { enhanceView } from './ui/motion.js';
import { BUILDERS, ScenarioError } from './ui/scenarios.js';
import { PRESETS } from './ui/presets.js';
import { api, ApiError } from './ui/api.js';
import { welcomeView } from './ui/views/welcome.js';
import { profileFormView } from './ui/views/profileForm.js';
import { dashboardView } from './ui/views/dashboard.js';
import { decisionView } from './ui/views/decision.js';
import { compareView } from './ui/views/compare.js';
import { assumptionsView } from './ui/views/assumptions.js';
import { accountView } from './ui/views/account.js';

const VIEWS = {
  welcome: welcomeView,
  profile: profileFormView,
  dashboard: dashboardView,
  decision: decisionView,
  compare: compareView,
  assumptions: assumptionsView,
  account: accountView,
};

const STEP_LABELS = [
  ['profile', 'Hồ sơ'],
  ['dashboard', 'Chỉ số'],
  ['decision', 'Quyết định'],
  ['compare', 'So sánh'],
];

const VIEW_NAMES = {
  welcome: 'Trang chào',
  profile: 'Tạo hồ sơ',
  dashboard: 'Bảng chỉ số',
  decision: 'Nhập quyết định',
  compare: 'So sánh kết quả',
  assumptions: 'Giả định và giới hạn',
  account: 'Tài khoản',
};

let lastView = null;

export function mount(root) {
  subscribe(() => render(root));
  root.addEventListener('click', onClick);
  applyTheme(readTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  // Chỉ đọc từ localStorage — không gọi api.js ở đây. Một phiên đã lưu chỉ có
  // nghĩa "còn nhớ đã đăng nhập trước đó", chưa xác nhận lại với server.
  const account = loadSession();
  if (account) update({ account });

  const saved = loadProfile();
  if (saved && saved.income > 0) update({ profile: saved, view: 'dashboard' });
  else render(root);
}

function render(root) {
  const view = VIEWS[state.view] || welcomeView;
  root.innerHTML = `
    <a class="skip" href="#main">Bỏ qua phần điều hướng</a>
    ${topbar()}
    <main id="main" tabindex="-1"><div class="shell">${notice()}${view(state)}</div></main>
    <footer class="foot"><div class="shell">
      DeciFin, bản MVP. Mã nguồn mở theo giấy phép MIT. Mọi tính toán chạy trên thiết bị của bạn.
    </div></footer>
    <p class="sr-only" role="status" aria-live="polite">${VIEW_NAMES[state.view] || ''}</p>`;

  // Người dùng bàn phím và trình đọc màn hình cần biết trang đã đổi. Nếu không
  // dời tiêu điểm, họ vẫn đứng ở nút vừa bấm trong khi nội dung đã thay hết.
  if (state.view !== lastView) {
    window.scrollTo({ top: 0 });
    root.querySelector('#main').focus({ preventScroll: true });
    lastView = state.view;
  }
  // Có lỗi thì kéo thẳng tới chỗ báo lỗi. Người dùng đang ở cuối trang bấm nút
  // sẽ không thấy gì nếu thông báo nằm im trên đầu.
  if (state.notice) root.querySelector('.notice')?.focus();

  enhanceView(root);
}

function topbar() {
  const index = STEP_LABELS.findIndex(([id]) => id === state.view);
  const at = index < 0 ? 0 : (index / (STEP_LABELS.length - 1)) * 100;

  return `
<header class="topbar"><div class="shell topbar__inner">
  <button class="brand" data-action="go" data-view="welcome" style="background:none;border:0;cursor:pointer">
    <span class="brand__mark" aria-hidden="true">D</span> DeciFin
  </button>
  <nav class="steps" aria-label="Tiến trình">
    ${STEP_LABELS.map(([id, label], i) => {
      const open = reachable(id);
      return `<button class="steps__item" data-reachable="${open}" ${open ? `data-action="go" data-view="${id}"` : 'disabled'}
              ${id === state.view ? 'aria-current="step"' : ''}>${i + 1}. ${label}</button>`;
    }).join('')}
  </nav>
  <span class="topbar__spacer"></span>
  <button class="btn btn--ghost" data-action="go" data-view="account" style="padding:8px 14px"
          ${state.view === 'account' ? 'aria-current="page"' : ''}>
    ${state.account ? escapeHtml(state.account.email) : 'Đăng nhập'}
  </button>
  <button class="btn btn--ghost" data-action="theme" style="padding:8px 14px">${themeLabel()}</button>
</div>
<div class="steps__rail" style="--at:${at}%" aria-hidden="true"></div></header>`;
}

/** Bước nào đã đi tới được. Bấm vào bước chưa có dữ liệu thì chỉ ra màn hình rỗng. */
function reachable(id) {
  if (id === 'profile') return true;
  if (id === 'compare') return state.results !== null;
  return state.profile.income > 0;
}

/**
 * Khung báo lỗi và hỏi lại, dựng ngay trong trang.
 *
 * Thay cho window.alert và window.confirm. Hộp thoại của trình duyệt cắt ngang
 * mạch làm việc, không theo được hệ màu sáng tối, và trên điện thoại nó che mất
 * đúng chỗ vừa nhập sai.
 */
function notice() {
  if (!state.notice) return '';
  const { tone, text, items, confirm } = state.notice;

  return `<div class="notice ${tone === 'ask' ? 'notice--ask' : ''}" role="alert" tabindex="-1" style="margin-bottom:20px">
  <span class="notice__mark" aria-hidden="true">${tone === 'ask' ? '?' : '!'}</span>
  <div>
    <strong>${escapeHtml(text)}</strong>
    ${items && items.length > 0 ? `<ul>${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
    ${confirm ? `<div class="row" style="margin-top:12px">
      <button class="btn" data-action="${confirm.action}" style="padding:8px 15px">${escapeHtml(confirm.label)}</button>
      <button class="btn btn--ghost" data-action="dismiss" style="padding:8px 15px">Huỷ</button>
    </div>` : ''}
  </div>
</div>`;
}

/** Đổi màn hình và luôn dọn thông báo cũ, để lỗi của bước trước không đi theo. */
const go = (patch) => update({ notice: null, accountStatus: null, ...patch });

function onClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const { action } = trigger.dataset;

  const handlers = {
    go: () => go({ view: trigger.dataset.view }),
    theme: toggleTheme,
    dismiss: () => update({ notice: null }),
    'start-blank': () => go({ profile: structuredClone(EMPTY_PROFILE), wizardStep: 0, view: 'profile' }),
    preset: () => loadPreset(trigger.dataset.id),
    'wizard-back': () => go({ wizardStep: Math.max(state.wizardStep - 1, 0) }),
    'wizard-next': advanceWizard,
    'pick-decision': () => go({ decisionKind: trigger.dataset.kind, view: 'decision' }),
    simulate: runSimulation,
    wipe: askWipe,
    'wipe-confirm': wipeProfile,
    'account-register': () => submitAccount('register'),
    'account-login': () => submitAccount('login'),
    'account-logout': accountLogout,
    'account-delete': askDeleteAccount,
    'account-delete-confirm': accountDelete,
    'account-push': accountPush,
    'account-pull': accountPull,
    'account-import-bank': accountImportBank,
  };

  if (handlers[action]) {
    event.preventDefault();
    handlers[action]();
  }
}

function loadPreset(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  const profile = structuredClone(preset.profile);
  go({ profile, view: 'dashboard' });
  saveProfile();
}

/** Đọc giá trị từ các ô đang hiển thị, gộp vào hồ sơ, rồi sang bước kế tiếp. */
function advanceWizard() {
  const read = (name) => document.querySelector(`[name="${name}"]`);
  const value = (name) => (read(name) ? parseAmount(read(name).value) : undefined);
  const text = (name) => (read(name) ? read(name).value.trim() : '');
  const profile = structuredClone(state.profile);

  if (state.wizardStep === 0) {
    profile.income = value('income') ?? profile.income;
    profile.essential = value('essential') ?? profile.essential;
    profile.discretionary = value('discretionary') ?? profile.discretionary;
  } else if (state.wizardStep === 1) {
    profile.liquidAssets = value('liquidAssets') ?? profile.liquidAssets;
    const payment = value('debtPayment') || 0;
    profile.debts = payment > 0
      ? [{ name: text('debtName') || 'Khoản vay', monthlyPayment: payment, remainingMonths: value('debtMonths') || 12 }]
      : [];
  } else if (state.wizardStep === 2) {
    profile.goals = [0, 1]
      .map((i) => ({
        name: text(`g${i}name`) || (i === 0 ? 'Mục tiêu 1' : 'Mục tiêu 2'),
        target: value(`g${i}target`) || 0,
        saved: value(`g${i}saved`) || 0,
        deadlineMonth: value(`g${i}deadline`) || 12,
        allocWeight: (value(`g${i}weight`) || 0) / 100,
      }))
      .filter((g) => g.target > 0);
    if (profile.goals.length > 0) profile.goals = normaliseWeights(profile.goals);
  } else {
    const select = read('incomeStability');
    if (select) profile.incomeStability = select.value;
  }

  if (state.wizardStep === 3) {
    const errors = validate(profile);
    if (errors.length > 0) {
      update({ profile, notice: { tone: 'error', text: 'Hồ sơ chưa dùng được:', items: errors } });
      return;
    }
    go({ profile, view: 'dashboard' });
    saveProfile();
    return;
  }
  go({ profile, wizardStep: state.wizardStep + 1 });
}

function runSimulation() {
  const read = (name) => {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? parseAmount(el.value) : 0;
  };

  let built;
  try {
    built = BUILDERS[state.decisionKind](read, state.profile);
  } catch (error) {
    if (error instanceof ScenarioError) {
      update({ notice: { tone: 'error', text: error.message } });
      return;
    }
    throw error;
  }

  const results = built.scenarios
    ? rankScenarios(built.scenarios, built.extras || {})
    : rank(state.profile, built.events, built.extras || {});

  go({ results, installment: built.installment || null, view: 'compare' });
}

function askWipe() {
  update({
    notice: {
      tone: 'ask',
      text: 'Xoá hồ sơ khỏi trình duyệt này? Thao tác này không hoàn tác được.',
      confirm: { label: 'Xoá hồ sơ', action: 'wipe-confirm' },
    },
  });
}

function wipeProfile() {
  clearProfile();
  go({ profile: structuredClone(EMPTY_PROFILE), results: null, installment: null, view: 'welcome' });
}

function apiErrorText(error) {
  return error instanceof ApiError ? error.message : 'Có lỗi không xác định.';
}

async function submitAccount(mode) {
  const email = document.querySelector('[name="accountEmail"]')?.value.trim();
  const password = document.querySelector('[name="accountPassword"]')?.value || '';
  if (!email || !password) {
    update({ notice: { tone: 'error', text: 'Nhập email và mật khẩu.' } });
    return;
  }
  try {
    const data = mode === 'register' ? await api.register(email, password) : await api.login(email, password);
    const account = { token: data.token, email };
    saveSession(account);
    update({
      account,
      notice: null,
      accountStatus: mode === 'register' ? 'Đăng ký thành công.' : 'Đăng nhập thành công.',
    });
  } catch (error) {
    update({ notice: { tone: 'error', text: apiErrorText(error) } });
  }
}

async function accountLogout() {
  const token = state.account?.token;
  clearSession();
  update({ account: null, accountStatus: null });
  if (token) {
    try { await api.logout(token); } catch { /* phiên có thể đã hết hạn, không sao */ }
  }
}

function askDeleteAccount() {
  update({
    notice: {
      tone: 'ask',
      text: 'Xoá tài khoản và toàn bộ hồ sơ đã đồng bộ? Thao tác này không hoàn tác được.',
      confirm: { label: 'Xoá tài khoản', action: 'account-delete-confirm' },
    },
  });
}

async function accountDelete() {
  const token = state.account?.token;
  if (!token) return;
  try {
    await api.deleteAccount(token);
    clearSession();
    update({ account: null, notice: null, accountStatus: 'Đã xoá tài khoản.' });
  } catch (error) {
    update({ notice: { tone: 'error', text: apiErrorText(error) } });
  }
}

async function accountPush() {
  const token = state.account?.token;
  if (!token) return;
  const errors = validate(state.profile);
  if (errors.length > 0) {
    update({ notice: { tone: 'error', text: 'Hồ sơ chưa hợp lệ để đồng bộ:', items: errors } });
    return;
  }
  try {
    await api.pushProfile(token, state.profile);
    update({ notice: null, accountStatus: 'Đã đẩy hồ sơ hiện tại lên tài khoản.' });
  } catch (error) {
    update({ notice: { tone: 'error', text: apiErrorText(error) } });
  }
}

async function accountPull() {
  const token = state.account?.token;
  if (!token) return;
  try {
    const data = await api.pullProfile(token);
    if (!data.profile || !(data.profile.income > 0)) {
      update({ notice: { tone: 'error', text: 'Chưa có hồ sơ nào lưu trên tài khoản này.' } });
      return;
    }
    go({ profile: data.profile, view: 'dashboard', accountStatus: 'Đã tải hồ sơ từ tài khoản.' });
    saveProfile();
  } catch (error) {
    update({ notice: { tone: 'error', text: apiErrorText(error) } });
  }
}

async function accountImportBank() {
  const token = state.account?.token;
  if (!token) return;
  try {
    const link = await api.createBankLink(token);
    const { draft } = await api.importFromBank(token, link.linkId);
    const { _source, ...profile } = draft;
    go({
      profile,
      view: 'dashboard',
      accountStatus: 'Đã nhập hồ sơ nháp từ ngân hàng mô phỏng — kiểm tra lại các con số trước khi dùng.',
    });
    saveProfile();
  } catch (error) {
    update({ notice: { tone: 'error', text: apiErrorText(error) } });
  }
}

/**
 * Nhãn của nút đổi nền nói ra việc nó sắp làm, không nói tình trạng hiện tại.
 * Chữ "Nền" một mình thì không ai đoán được bấm vào sẽ ra gì.
 */
function themeLabel() {
  return document.documentElement.dataset.theme === 'dark' ? 'Nền sáng' : 'Nền tối';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  writeTheme(theme);

  // Đổi nền không dựng lại màn hình, nên nhãn phải tự cập nhật tại chỗ.
  const button = document.querySelector('[data-action="theme"]');
  if (button) button.textContent = themeLabel();
}

/**
 * Đổi nền sáng tối bằng cách hoà hai ảnh vào nhau.
 *
 * Đổi thẳng thì cả trang nháy một cái, mắt mất một nhịp để bám lại chỗ đang
 * đọc. Trình duyệt nào chưa có View Transitions thì rơi về đúng hành vi cũ.
 */
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (still || typeof document.startViewTransition !== 'function') {
    applyTheme(next);
    return;
  }
  document.startViewTransition(() => applyTheme(next));
}
