import { BAND_LABEL } from '../../engine/scoring.js';
import { ASSUMPTIONS } from '../../engine/config.js';
import { lineChart, legend } from '../components/chart.js';
import { money, percent, decimal, monthsInt, escapeHtml } from '../format.js';

export function compareView(state) {
  const { results, installment } = state;
  if (!results || results.length === 0) {
    return '<section class="view"><p class="lede">Chưa có kết quả nào. Hãy quay lại và nhập một quyết định.</p></section>';
  }

  const cheapest = results.reduce((a, b) => (a.outcome.totalCash <= b.outcome.totalCash ? a : b));
  const runwaySeries = results.map((r) => ({
    name: r.label,
    tone: r.score.band,
    values: runwayPath(state.profile, r.outcome),
  }));

  return `
<section class="view stack">
  <div class="spread">
    <div>
      <p class="eyebrow">Kết quả mô phỏng</p>
      <h1 style="margin-top:8px;max-width:24ch">Ba phương án, cùng một hồ sơ</h1>
    </div>
    <button class="btn btn--ghost" data-action="go" data-view="decision">Sửa phương án</button>
  </div>

  ${installment ? aprReveal(installment) : ''}

  <div class="compare">
    ${results.map((r, i) => optionCard(r, i, r.label === cheapest.label)).join('')}
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      <h2>Quỹ dự phòng trong 24 tháng tới</h2>
      <p class="small muted" style="margin-top:6px">
        Đường nét đứt là ngưỡng thận trọng ${ASSUMPTIONS.runwayCaution} tháng.
      </p>
      <div style="margin-top:16px">
        ${lineChart(runwaySeries, { unit: 'months', guideAt: ASSUMPTIONS.runwayCaution, guideLabel: 'ngưỡng thận trọng' })}
      </div>
      ${legend(runwaySeries)}
    </div>
  </div>

  <div class="panel">
    <p class="small">
      <strong>DeciFin không đưa ra lời khuyên tài chính.</strong>
      Kết quả trên dựa trên số liệu bạn khai báo và các tham số mô hình được công bố tại
      <button class="link-btn" data-action="go" data-view="assumptions"
              style="background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;font:inherit">trang giả định</button>.
      Quyền quyết định cuối cùng thuộc về bạn.
    </p>
  </div>
</section>`;
}

/** Ô phơi bày lãi suất thực. Đây là thứ ứng dụng ghi chép chi tiêu không làm được. */
function aprReveal(inst) {
  return `
<div class="reveal-apr rise">
  <div>
    <div class="reveal-apr__k">Người bán quảng cáo</div>
    <div class="reveal-apr__v figure muted">${percent(inst.advertisedApr, 1)}<span class="small">/năm</span></div>
    <p class="small muted" style="margin-top:4px">Lãi phẳng ${percent(inst.advertisedApr / 12, 1)} mỗi tháng, quy đổi thẳng ra năm</p>
  </div>
  <div class="reveal-apr__arrow" aria-hidden="true">→</div>
  <div>
    <div class="reveal-apr__k">Lãi suất thực bạn đang trả</div>
    <div class="reveal-apr__v figure t-risky">${percent(inst.trueApr, 2)}<span class="small">/năm</span></div>
    <p class="small" style="margin-top:4px">
      Gấp <strong>${decimal(inst.spread, 2)} lần</strong>, tức thêm ${money(inst.totalInterest)} tiền lãi
    </p>
  </div>
</div>`;
}

function optionCard(result, index, isCheapest) {
  const { outcome, score, messages, label, rank } = result;
  const top = rank === 1;
  const blocked = score.band === 'blocked';

  return `
<article class="option ${top ? 'option--top' : ''} ${blocked ? 'option--blocked' : ''} rise"
         style="animation-delay:${index * 0.09}s">
  <div class="option__core">
    <div class="option__head">
      <span class="option__rank">${rank}</span>
      <div>
        <div class="option__title">${escapeHtml(label)}</div>
        <span class="chip chip--${score.band}" style="margin-top:6px">${BAND_LABEL[score.band]}</span>
        ${isCheapest ? '<span class="chip" style="margin-top:6px;background:var(--surface-sunken);color:var(--muted)">Ít tiền mặt nhất</span>' : ''}
      </div>
      <div class="option__score">
        <b class="figure t-${score.band}">${decimal(score.total)}</b>
        <div class="small muted">điểm an toàn</div>
      </div>
    </div>

    <div class="stats">
      ${stat('Tổng tiền chi', money(outcome.totalCash))}
      ${stat('Giá trị hiện tại', money(outcome.presentValue))}
      ${stat('Quỹ dự phòng còn', `${decimal(outcome.runwayAfter)} tháng`)}
      ${stat('Nghĩa vụ nợ', percent(outcome.dtiAfter))}
    </div>

    ${outcome.goals.length > 0 ? `
    <div class="stats" style="margin-top:2px">
      ${outcome.goals.map((g) => stat(
        escapeHtml(g.name),
        Number.isFinite(g.etaAfter) ? `${monthsInt(g.etaAfter)}${g.delayMonths > 0 ? ` (chậm ${g.delayMonths})` : ''}` : 'không đạt',
      )).join('')}
    </div>` : ''}

    <ul class="notes">
      ${messages.slice(0, 5).map((m) => `
      <li class="note note--${m.severity}">
        <span class="note__dot" aria-hidden="true"></span>
        <span>${escapeHtml(m.text)}</span>
      </li>`).join('')}
    </ul>
  </div>
</article>`;
}

const stat = (k, v) => `<div class="stat"><div class="stat__k">${k}</div><div class="stat__v figure">${v}</div></div>`;

/**
 * Quỹ dự phòng theo tháng sau quyết định. Khoản trả góp kết thúc khi hết kỳ hạn
 * nên đường biểu diễn sẽ dốc lên trở lại từ thời điểm đó.
 */
function runwayPath(profile, outcome) {
  const path = [];
  let liquid = outcome.liquidAfter;
  const minimumSpend = profile.essential + (profile.income - profile.essential - profile.discretionary - outcome.surplusAfter);
  const denominator = minimumSpend > 0 ? minimumSpend : profile.essential || 1;
  for (let t = 0; t <= 24; t += 1) {
    path.push(Math.max(liquid / denominator, 0));
    liquid = Math.max(liquid + outcome.surplusAfter, 0);
  }
  return path;
}
