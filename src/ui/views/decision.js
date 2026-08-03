import { DECISION_KINDS } from '../presets.js';
import { normaliseWeights } from '../../engine/goals.js';
import { baseline } from '../../engine/profile.js';
import { money, percent, escapeHtml } from '../format.js';

export function decisionView(state) {
  const kind = DECISION_KINDS.find((k) => k.id === state.decisionKind) || DECISION_KINDS[0];
  const forms = { purchase: purchaseForm, installment: installmentForm, allocation: allocationForm, savings: savingsForm };

  return `
<section class="view stack">
  <div class="spread">
    <div>
      <p class="eyebrow">${kind.name}</p>
      <h1 style="margin-top:8px;max-width:22ch">${headline(kind.id)}</h1>
    </div>
    <button class="btn btn--ghost" data-action="go" data-view="dashboard">Đổi nhóm quyết định</button>
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      ${forms[kind.id](state)}
    </div>
  </div>

  <div class="row row--end">
    <button class="btn" data-action="simulate">
      Mô phỏng các phương án <span class="btn__pip" aria-hidden="true">↗</span>
    </button>
  </div>
</section>`;
}

const headline = (id) => ({
  purchase: 'Khoản chi này ảnh hưởng thế nào tới bạn',
  installment: 'Gói trả góp nào thật sự rẻ hơn',
  allocation: 'Chia dòng tiền dư thế nào cho hợp lý',
  savings: 'Thay đổi mức tiết kiệm dịch chuyển mục tiêu bao xa',
}[id]);

const num = (name, label, value, step = 1000000, hint = '') => `
<div class="field">
  <label for="d-${name}">${label}</label>
  <input class="input" id="d-${name}" name="${name}" type="number" min="0" step="${step}" value="${value}" inputmode="numeric">
  ${hint ? `<span class="hint">${hint}</span>` : ''}
</div>`;

function purchaseForm() {
  return `
  <div class="grid-3">
    ${num('price', 'Giá món hàng', 25000000)}
    ${num('downPayment', 'Trả trước nếu chọn trả góp', 5000000)}
    ${num('months', 'Kỳ hạn trả góp (tháng)', 12, 1)}
    ${num('flatRate', 'Lãi phẳng người bán báo (%/tháng)', 1, 0.1, 'Con số cửa hàng thường ghi trên bảng giá')}
    ${num('delayMonths', 'Nếu trì hoãn thì bao lâu (tháng)', 4, 1)}
  </div>
  <p class="small muted" style="margin-top:16px">
    Công cụ sẽ dựng ba phương án để so sánh: trả thẳng, trả góp và trì hoãn. Phương án trì hoãn
    được tính cả phần giá tăng theo lạm phát trong thời gian chờ.
  </p>`;
}

function installmentForm() {
  return `
  <div class="grid-2">
    ${num('price', 'Giá món hàng', 25000000)}
    ${num('downPayment', 'Trả trước', 5000000)}
  </div>
  <h3 style="margin-top:24px">Các gói đang được chào</h3>
  <div class="grid-2" style="margin-top:12px">
    <div class="panel">
      <h3 class="small">Gói A</h3>
      <div class="grid-2" style="margin-top:10px">
        ${num('monthsA', 'Kỳ hạn (tháng)', 6, 1)}
        ${num('flatA', 'Lãi phẳng (%/tháng)', 0.8, 0.1)}
      </div>
    </div>
    <div class="panel">
      <h3 class="small">Gói B</h3>
      <div class="grid-2" style="margin-top:10px">
        ${num('monthsB', 'Kỳ hạn (tháng)', 12, 1)}
        ${num('flatB', 'Lãi phẳng (%/tháng)', 1, 0.1)}
      </div>
    </div>
  </div>`;
}

function allocationForm(state) {
  const goals = normaliseWeights(state.profile.goals);
  if (goals.length < 2) {
    return `<p class="lede">Nhóm quyết định này cần ít nhất hai mục tiêu. Hãy quay lại hồ sơ và khai báo thêm một mục tiêu nữa.</p>
    <div class="row" style="margin-top:16px"><button class="btn btn--ghost" data-action="go" data-view="profile">Bổ sung mục tiêu</button></div>`;
  }
  return `
  <p class="lede">Ba cách chia dòng tiền dư ${money(baseline(state.profile).surplus)} mỗi tháng giữa
  <strong>${escapeHtml(goals[0].name)}</strong> và <strong>${escapeHtml(goals[1].name)}</strong>.</p>
  <div class="rows" style="margin-top:18px">
    ${[[80, 20], [50, 50], [20, 80]].map(([a, bb]) => `
    <div class="rows__item spread">
      <span>Ưu tiên ${a >= bb ? escapeHtml(goals[0].name) : escapeHtml(goals[1].name)}</span>
      <span class="figure muted">${a}% / ${bb}%</span>
    </div>`).join('')}
  </div>
  <p class="small muted" style="margin-top:14px">Cách chia hiện tại của bạn là
  ${percent(goals[0].allocWeight, 0)} / ${percent(goals[1].allocWeight, 0)} và cũng sẽ được đưa vào so sánh.</p>`;
}

function savingsForm() {
  return `
  <div class="grid-2">
    ${num('savingsDelta', 'Muốn tiết kiệm thêm bao nhiêu mỗi tháng', 1000000, 100000,
      'Số tiền cắt bớt từ chi tiêu linh hoạt để dồn vào mục tiêu')}
  </div>
  <p class="small muted" style="margin-top:16px">
    Công cụ sẽ so sánh ba kịch bản: giữ nguyên, tiết kiệm thêm mức bạn nhập, và tiết kiệm thêm gấp đôi mức đó.
  </p>`;
}
