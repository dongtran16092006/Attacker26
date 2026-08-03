/**
 * Điều phối ứng dụng: dựng chuỗi HTML cho màn hình hiện tại, gắn vào DOM, và
 * bắt sự kiện bằng uỷ quyền ở gốc.
 *
 * Cách render bằng chuỗi được chọn có chủ đích: nó khiến mọi hàm dựng giao diện
 * trở thành hàm thuần nhận trạng thái trả về chuỗi, nên kiểm thử được bằng Node
 * mà không cần trình duyệt giả lập.
 */

import { makeEvent, rank, rankScenarios } from './engine/index.js';
import { validate, EMPTY_PROFILE } from './engine/profile.js';
import { normaliseWeights } from './engine/goals.js';
import { state, update, subscribe, saveProfile, loadProfile, clearProfile, readTheme, writeTheme } from './ui/state.js';
import { parseAmount } from './ui/format.js';
import { BUILDERS, ScenarioError } from './ui/scenarios.js';
import { PRESETS } from './ui/presets.js';
import { welcomeView } from './ui/views/welcome.js';
import { profileFormView } from './ui/views/profileForm.js';
import { dashboardView } from './ui/views/dashboard.js';
import { decisionView } from './ui/views/decision.js';
import { compareView } from './ui/views/compare.js';
import { assumptionsView } from './ui/views/assumptions.js';

const VIEWS = {
  welcome: welcomeView,
  profile: profileFormView,
  dashboard: dashboardView,
  decision: decisionView,
  compare: compareView,
  assumptions: assumptionsView,
};

const STEP_LABELS = [
  ['profile', 'Hồ sơ'],
  ['dashboard', 'Chỉ số'],
  ['decision', 'Quyết định'],
  ['compare', 'So sánh'],
];

export function mount(root) {
  subscribe(() => render(root));
  root.addEventListener('click', onClick);
  applyTheme(readTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const saved = loadProfile();
  if (saved && saved.income > 0) update({ profile: saved, view: 'dashboard' });
  else render(root);
}

function render(root) {
  const view = VIEWS[state.view] || welcomeView;
  root.innerHTML = `
    ${topbar()}
    <main><div class="shell">${view(state)}</div></main>
    <footer class="foot"><div class="shell">
      DeciFin, bản MVP. Mã nguồn mở theo giấy phép MIT. Mọi tính toán chạy trên thiết bị của bạn.
    </div></footer>`;
  root.scrollIntoView({ block: 'start' });
}

function topbar() {
  const index = STEP_LABELS.findIndex(([id]) => id === state.view);
  return `
<header class="topbar"><div class="shell topbar__inner">
  <button class="brand" data-action="go" data-view="welcome" style="background:none;border:0;cursor:pointer">
    <span class="brand__mark" aria-hidden="true">D</span> DeciFin
  </button>
  <nav class="steps" aria-label="Tiến trình">
    ${STEP_LABELS.map(([id, label], i) => `
      <span class="steps__item" aria-current="${id === state.view}">${i + 1}. ${label}</span>`).join('')}
  </nav>
  <span class="topbar__spacer"></span>
  <button class="btn btn--ghost" data-action="theme" aria-label="Đổi nền sáng tối"
          style="padding:8px 14px">Nền</button>
</div></header>`;
}

function onClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const { action } = trigger.dataset;

  const handlers = {
    go: () => update({ view: trigger.dataset.view }),
    theme: toggleTheme,
    'start-blank': () => update({ profile: structuredClone(EMPTY_PROFILE), wizardStep: 0, view: 'profile' }),
    preset: () => loadPreset(trigger.dataset.id),
    'wizard-back': () => update({ wizardStep: Math.max(state.wizardStep - 1, 0) }),
    'wizard-next': advanceWizard,
    'pick-decision': () => update({ decisionKind: trigger.dataset.kind, view: 'decision' }),
    simulate: runSimulation,
    wipe: wipeProfile,
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
  update({ profile, view: 'dashboard' });
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
      window.alert(errors.join('\n'));
      return;
    }
    update({ profile, view: 'dashboard' });
    saveProfile();
    return;
  }
  update({ profile, wizardStep: state.wizardStep + 1 });
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
    if (error instanceof ScenarioError) { window.alert(error.message); return; }
    throw error;
  }

  const results = built.scenarios
    ? rankScenarios(built.scenarios, built.extras || {})
    : rank(state.profile, built.events, built.extras || {});

  update({ results, installment: built.installment || null, view: 'compare' });
}

function wipeProfile() {
  if (!window.confirm('Xoá hồ sơ khỏi trình duyệt này?')) return;
  clearProfile();
  update({ profile: structuredClone(EMPTY_PROFILE), results: null, view: 'welcome' });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  writeTheme(theme);
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
