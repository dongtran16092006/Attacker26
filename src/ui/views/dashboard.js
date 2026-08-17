import { baseline } from '../../engine/profile.js';
import { ASSUMPTIONS } from '../../engine/config.js';
import { accumulationPath, normaliseWeights, monthsToGoal } from '../../engine/goals.js';
import { lineChart, legend, chartTable } from '../components/chart.js';
import { money, moneyShort, percent, decimal, runwayMonths, monthsInt, escapeHtml } from '../format.js';
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
    ${metric({
      label: 'Dòng tiền dư mỗi tháng', value: money(b.surplus), tone: surplusTone,
      note: `Tỷ lệ tiết kiệm ${percent(b.savingsRate)}`, count: b.surplus, kind: 'money', at: 0,
    })}
    ${metric({
      label: 'Quỹ dự phòng', tone: runwayTone, note: runwayNote(b.runway), at: 1,
      // Chỉ phần số chạy lên, chữ "tháng" đứng yên bên cạnh.
      value: Number.isFinite(b.runway) ? decimal(b.runway) : runwayMonths(b.runway),
      suffix: Number.isFinite(b.runway) ? ' tháng' : '',
      count: Number.isFinite(b.runway) ? b.runway : null, kind: 'dec1',
    })}
    ${metric({
      label: 'Nghĩa vụ nợ', value: percent(b.dti), tone: dtiTone,
      note: b.dti === 0 ? 'Chưa có khoản vay nào' : `${money(b.debtPayments)} mỗi tháng`,
      count: b.dti, kind: 'pct1', at: 2,
    })}
    ${metric({
      label: 'Chi phí tối thiểu', value: money(b.minimumSpend), tone: 'ink',
      note: 'Mức cần để duy trì cuộc sống', count: b.minimumSpend, kind: 'money', at: 3,
    })}
  </div>

  ${goals.length > 0 ? `
  <div class="shell-card">
    <div class="shell-card__core">
      <div class="spread">
        <h2>Đường tới mục tiêu nếu giữ nguyên nhịp hiện tại</h2>
      </div>
      <div style="margin-top:16px">${lineChart(series, { id: 'goals', unit: 'money' })}</div>
      ${legend(series)}
      ${chartTable(series, 'money')}
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
      <button class="panel panel--action rise" data-action="pick-decision" data-kind="${k.id}"
              style="animation-delay:${i * 0.05}s">
        <h3>${k.name}</h3>
        <p class="small muted" style="margin-top:6px">${k.blurb}</p>
        <span class="small" style="display:inline-block;margin-top:12px">Ví dụ: ${k.example} <span class="go" aria-hidden="true">↗</span></span>
      </button>`).join('')}
    </div>
  </div>
</section>`;
}

/**
 * Một thẻ chỉ số.
 *
 * `count` là giá trị số thô để lớp chuyển động cho chạy từ 0 lên. Chuỗi hiển
 * thị đã nằm sẵn trong HTML nên nếu không có JavaScript chuyển động thì thẻ vẫn
 * đúng. Truyền null khi con số không hữu hạn, lúc đó không có gì để đếm.
 */
function metric({ label, value, suffix = '', note, tone, count = null, kind = 'int', at = 0 }) {
  const counter = count === null
    ? value
    : `<span data-count="${count}" data-count-kind="${kind}">${value}</span>`;

  return `<div class="metric metric--${tone} rise" style="animation-delay:${(at * 0.07).toFixed(2)}s">
    <div class="metric__label">${label}</div>
    <div class="metric__value figure t-${tone}">${counter}${suffix}</div>
    <div class="metric__note muted">${note}</div>
  </div>`;
}

function runwayNote(runway) {
  if (runway >= ASSUMPTIONS.runwaySafe) return 'Đạt mức an toàn 6 tháng';
  if (runway >= ASSUMPTIONS.runwayCaution) return 'Chưa đạt mức an toàn 6 tháng';
  return 'Dưới ngưỡng thận trọng 3 tháng';
}
