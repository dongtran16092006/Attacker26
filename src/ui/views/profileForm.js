import { escapeHtml } from '../format.js';

const STEPS = ['Thu nhập và chi phí', 'Tài sản và nợ', 'Mục tiêu', 'Đặc điểm thu nhập'];

export function profileFormView(state) {
  const p = state.profile;
  const step = state.wizardStep;
  return `
<section class="view stack">
  <div>
    <p class="eyebrow">Bước ${step + 1} trên ${STEPS.length}</p>
    <h1 style="margin-top:8px">${STEPS[step]}</h1>
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      ${[incomeStep, assetStep, goalStep, traitStep][step](p)}
    </div>
  </div>

  <div class="row row--end">
    ${step > 0 ? '<button class="btn btn--ghost" data-action="wizard-back">Quay lại</button>' : ''}
    <button class="btn" data-action="wizard-next">
      ${step === STEPS.length - 1 ? 'Xem hồ sơ' : 'Tiếp tục'}
      <span class="btn__pip" aria-hidden="true">→</span>
    </button>
  </div>
</section>`;
}

const moneyField = (name, label, value, hint = '') => `
<div class="field">
  <label for="f-${name}">${label}</label>
  <input class="input" id="f-${name}" name="${name}" type="number" min="0" step="100000" value="${value || ''}" inputmode="numeric">
  ${hint ? `<span class="hint">${hint}</span>` : ''}
</div>`;

function incomeStep(p) {
  return `<div class="grid-2">
    ${moneyField('income', 'Thu nhập ròng mỗi tháng', p.income, 'Số tiền thực nhận sau thuế và bảo hiểm')}
    ${moneyField('essential', 'Chi phí thiết yếu mỗi tháng', p.essential, 'Thuê nhà, ăn uống, đi lại, điện nước, y tế')}
    ${moneyField('discretionary', 'Chi tiêu linh hoạt mỗi tháng', p.discretionary, 'Giải trí, mua sắm không bắt buộc')}
  </div>
  <p class="small muted" style="margin-top:16px">
    Chi phí thiết yếu và chi tiêu linh hoạt được tách riêng vì khi mất thu nhập, người ta cắt ngay
    khoản linh hoạt nhưng vẫn phải trả khoản thiết yếu. Quỹ dự phòng chỉ tính trên phần thiết yếu.
  </p>`;
}

function assetStep(p) {
  const debt = p.debts[0] || { name: '', monthlyPayment: 0, remainingMonths: 0 };
  return `<div class="grid-2">
    ${moneyField('liquidAssets', 'Tài sản rút dùng được ngay', p.liquidAssets, 'Tiền mặt và tiền gửi không kỳ hạn')}
  </div>
  <h3 style="margin-top:24px">Khoản nợ đang trả</h3>
  <p class="small muted" style="margin-top:4px">Để trống nếu bạn chưa có khoản vay nào.</p>
  <div class="grid-3" style="margin-top:14px">
    <div class="field">
      <label for="f-debtName">Tên khoản vay</label>
      <input class="input input--text" id="f-debtName" name="debtName" type="text"
             value="${escapeHtml(debt.name)}" placeholder="Vay mua xe">
    </div>
    ${moneyField('debtPayment', 'Trả mỗi tháng', debt.monthlyPayment)}
    ${moneyField('debtMonths', 'Số tháng còn lại', debt.remainingMonths)}
  </div>`;
}

function goalStep(p) {
  const g = [p.goals[0], p.goals[1]];
  return `<p class="small muted">Khai báo tối đa hai mục tiêu. Tỷ trọng cho biết bạn muốn chia dòng tiền dư thế nào giữa chúng.</p>
  ${[0, 1].map((i) => goalBlock(i, g[i])).join('<hr style="border:0;border-top:1px solid var(--line);margin:22px 0">')}`;
}

function goalBlock(index, goal = {}) {
  const v = { name: '', target: 0, saved: 0, deadlineMonth: 12, allocWeight: index === 0 ? 0.6 : 0.4, ...goal };
  return `
  <h3 style="margin-top:${index === 0 ? '18px' : '0'}">Mục tiêu ${index + 1}</h3>
  <div class="grid-3" style="margin-top:12px">
    <div class="field">
      <label for="g${index}-name">Tên mục tiêu</label>
      <input class="input input--text" id="g${index}-name" name="g${index}name" type="text"
             value="${escapeHtml(v.name)}" placeholder="${index === 0 ? 'Quỹ dự phòng' : 'Học chứng chỉ'}">
    </div>
    <div class="field">
      <label for="g${index}-target">Số tiền cần đạt</label>
      <input class="input" id="g${index}-target" name="g${index}target" type="number" min="0" step="1000000" value="${v.target || ''}">
    </div>
    <div class="field">
      <label for="g${index}-saved">Đã tích luỹ</label>
      <input class="input" id="g${index}-saved" name="g${index}saved" type="number" min="0" step="1000000" value="${v.saved || ''}">
    </div>
    <div class="field">
      <label for="g${index}-deadline">Hạn mong muốn (tháng)</label>
      <input class="input" id="g${index}-deadline" name="g${index}deadline" type="number" min="1" step="1" value="${v.deadlineMonth || ''}">
    </div>
    <div class="field">
      <label for="g${index}-weight">Tỷ trọng dòng tiền dư (%)</label>
      <input class="input" id="g${index}-weight" name="g${index}weight" type="number" min="0" max="100" step="5"
             value="${Math.round((v.allocWeight || 0) * 100)}">
      <span class="hint">Tổng hai mục tiêu sẽ được chuẩn hoá về 100%</span>
    </div>
  </div>`;
}

function traitStep(p) {
  return `<div class="field" style="max-width:420px">
    <label for="f-stability">Thu nhập của bạn có đều đặn không</label>
    <select class="input input--text" id="f-stability" name="incomeStability">
      <option value="stable" ${p.incomeStability === 'stable' ? 'selected' : ''}>Ổn định, tháng nào cũng gần như nhau</option>
      <option value="variable" ${p.incomeStability === 'variable' ? 'selected' : ''}>Biến động, tuỳ tháng</option>
    </select>
    <span class="hint">Yếu tố này chiếm 10% trong điểm an toàn tài chính</span>
  </div>`;
}
