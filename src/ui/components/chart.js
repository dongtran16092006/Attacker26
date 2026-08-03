/**
 * Biểu đồ đường vẽ tay bằng SVG.
 *
 * Không dùng thư viện biểu đồ vì chỉ cần đúng một loại đồ thị, và một tệp 90
 * dòng thì rẻ hơn nhiều so với việc kéo theo cả một phụ thuộc ngoài vào một
 * ứng dụng tài chính chạy trên máy người dùng.
 */

import { moneyShort, escapeHtml } from '../format.js';

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 46 };

/**
 * @param {{name:string, values:number[], tone:'safe'|'caution'|'risky'|'ink'}[]} series
 * @param {{unit?:'money'|'months', animate?:boolean, guideAt?:number, guideLabel?:string}} opts
 */
export function lineChart(series, opts = {}) {
  const { unit = 'money', animate = true, guideAt = null, guideLabel = '' } = opts;
  if (series.length === 0 || series[0].values.length === 0) return '';

  const span = Math.max(...series.map((s) => s.values.length)) - 1 || 1;
  const flat = series.flatMap((s) => s.values);
  const rawMax = Math.max(...flat, guideAt ?? -Infinity);
  const rawMin = Math.min(...flat, 0);
  const max = rawMax === rawMin ? rawMax + 1 : rawMax;
  const min = rawMin;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (i / span) * plotW;
  const y = (v) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const ticks = [min, min + (max - min) / 2, max];
  const gridLines = ticks
    .map((t) => {
      const yy = y(t).toFixed(1);
      const label = unit === 'money' ? moneyShort(t) : `${Math.round(t)}`;
      return `<line class="axis" x1="${PAD.left}" y1="${yy}" x2="${W - PAD.right}" y2="${yy}" opacity="0.6"/>
<text x="${PAD.left - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${label}</text>`;
    })
    .join('');

  const guide = guideAt === null ? '' :
    `<line class="guide" x1="${PAD.left}" y1="${y(guideAt).toFixed(1)}" x2="${W - PAD.right}" y2="${y(guideAt).toFixed(1)}"/>
<text x="${W - PAD.right}" y="${(y(guideAt) - 6).toFixed(1)}" text-anchor="end">${guideLabel}</text>`;

  const paths = series
    .map((s) => {
      const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      // xấp xỉ chiều dài đường để chạy hiệu ứng vẽ dần
      const length = Math.round(estimateLength(s.values, x, y));
      const cls = animate ? 'series series--animated' : 'series';
      return `<path class="${cls}" d="${d}" stroke="${strokeFor(s.tone)}" style="--len:${length}"/>`;
    })
    .join('');

  const xLabels = [0, Math.round(span / 2), span]
    .map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === span ? 'end' : 'middle'}">tháng ${i}</text>`)
    .join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">
<title>${escapeHtml(series.map((s) => s.name).join(', '))}</title>
${gridLines}${guide}${paths}${xLabels}
</svg>`;
}

function estimateLength(values, x, y) {
  let total = 0;
  for (let i = 1; i < values.length; i += 1) {
    total += Math.hypot(x(i) - x(i - 1), y(values[i]) - y(values[i - 1]));
  }
  return Math.max(total, 1);
}

function strokeFor(tone) {
  if (tone === 'safe') return 'var(--safe)';
  if (tone === 'caution') return 'var(--caution)';
  if (tone === 'risky' || tone === 'blocked') return 'var(--risk)';
  return 'var(--ink)';
}

/** Chú giải màu cho biểu đồ. Không dùng chấm trang trí ở chỗ khác. */
export function legend(series) {
  return `<div class="row small" style="margin-top:10px">${series
    .map((s) => `<span class="row" style="gap:6px"><span style="width:14px;height:2px;border-radius:2px;background:${strokeFor(s.tone)}"></span>${escapeHtml(s.name)}</span>`)
    .join('')}</div>`;
}
