import { baseline } from '../../engine/profile.js';
import { ASSUMPTIONS } from '../../engine/config.js';
import { accumulationPath, normaliseWeights, monthsToGoal } from '../../engine/goals.js';
import { lineChart, legend } from '../components/chart.js';
import { money, moneyShort, percent, decimal, monthsInt, escapeHtml } from '../format.js';
import { DECISION_KINDS } from '../presets.js';

export function dashboardView(state) {
  const p = state.profile;
  const b = baseline(p);
  const goals = normaliseWeights(p.goals);

  const runwayTone = b.runway >= ASSUMPTIONS.runwaySafe ? 'safe'
    : b.runway >= ASSUMPTIONS.runwayCaution ? 'caution' : 'risky';
  const dtiTone = b.dti <= ASSUMPTIONS.dtiSafe ? 'safe'
    : b.dti <= ASSUMPTIONS.dtiCaution ? 'caution' : 'risky';
  const surplusTone = b.surplus <= 0 ? 'risky' : b.savingsRate >= 0.2 ? 'safe' : 'caution';

  const series = goals.map((g, i) => ({
    name: g.name,
    tone: i === 0 ? 'ink' : 'caution',
    values: accumulationPath(g.saved, b.surplus * g.allocWeight, 24),
  }));

  return `
<section class="view stack">
  <div class="spread">
    <div>
      <p class="eyebrow">Hồ sơ tài chính</p>
      <h1 style="margin-top:8px">Bức tranh hiện tại của bạn</h1>
    </div>
    <button class="btn btn--ghost" data-action="go" data-view="profile">Sửa hồ sơ</button>
  </div>

  <div class="metrics">
    ${metric('Dòng tiền dư mỗi tháng', money(b.surplus), `Tỷ lệ tiết kiệm ${percent(b.savingsRate)}`, surplusTone)}
    ${metric('Quỹ dự phòng', `${decimal(b.runway)} tháng`, runwayNote(b.runway), runwayTone)}
    ${metric('Nghĩa vụ nợ', percent(b.dti), b.dti === 0 ? 'Chưa có khoản vay nào' : `${money(b.debtPayments)} mỗi tháng`, dtiTone)}
    ${metric('Chi phí tối thiểu', money(b.minimumSpend), 'Mức cần để duy trì cuộc sống', 'ink')}
  </div>

  ${goals.length > 0 ? `
  <div class="shell-card">
    <div class="shell-card__core">
      <div class="spread">
        <h2>Đường tới mục tiêu nếu giữ nguyên nhịp hiện tại</h2>
      </div>
      <div style="margin-top:16px">${lineChart(series, { unit: 'money' })}</div>
      ${legend(series)}
      <div class="rows" style="margin-top:18px">
        ${goals.map((g) => {
          const eta = monthsToGoal(g.target, g.saved, b.surplus * g.allocWeight);
          const late = !(eta <= g.deadlineMonth);
          return `<div class="rows__item spread">
            <div>
              <strong>${escapeHtml(g.name)}</strong>
              <p class="small muted" style="margin-top:2px">
                Cần ${moneyShort(g.target)}, đã có ${moneyShort(g.saved)}, nhận ${percent(g.allocWeight, 0)} dòng tiền dư
              </p>
            </div>
            <div style="text-align:right">
              <div class="figure" style="font-weight:600">${monthsInt(eta)}</div>
              <span class="chip chip--${late ? 'caution' : 'safe'}" style="margin-top:4px">
                ${late ? `Trễ hạn ${g.deadlineMonth} tháng` : 'Kịp hạn'}
              </span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>` : ''}

  <div>
    <h2>Bạn đang cân nhắc quyết định nào</h2>
    <div class="grid-2" style="margin-top:16px">
      ${DECISION_KINDS.map((k, i) => `
      <button class="panel rise" data-action="pick-decision" data-kind="${k.id}"
              style="text-align:left;cursor:pointer;animation-delay:${i * 0.05}s">
        <h3>${k.name}</h3>
        <p class="small muted" style="margin-top:6px">${k.blurb}</p>
        <span class="small" style="display:inline-block;margin-top:12px">Ví dụ: ${k.example} ↗</span>
      </button>`).join('')}
    </div>
  </div>
</section>`;
}

function metric(label, value, note, tone) {
  return `<div class="metric rise">
    <div class="metric__label">${label}</div>
    <div class="metric__value figure t-${tone}">${value}</div>
    <div class="metric__note muted">${note}</div>
  </div>`;
}

function runwayNote(runway) {
  if (runway >= ASSUMPTIONS.runwaySafe) return 'Đạt mức an toàn 6 tháng';
  if (runway >= ASSUMPTIONS.runwayCaution) return 'Chưa đạt mức an toàn 6 tháng';
  return 'Dưới ngưỡng thận trọng 3 tháng';
}
