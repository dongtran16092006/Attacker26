/**
 * Biểu đồ đường vẽ tay bằng SVG.
 *
 * Không dùng thư viện biểu đồ vì chỉ cần đúng một loại đồ thị, và một tệp nhỏ
 * thì rẻ hơn nhiều so với việc kéo theo cả một phụ thuộc ngoài vào một ứng dụng
 * tài chính chạy trên máy người dùng.
 *
 * Hai quyết định đáng nói về cách dựng:
 *
 * Chữ và chấm nằm ngoài SVG, dựng bằng HTML đặt chồng lên. Trước đây chúng nằm
 * trong SVG, mà SVG thì co theo bề ngang khung chứa: trên điện thoại cả hình bị
 * thu còn khoảng 38%, nên chữ 11px hiển thị ra chưa tới 7px. Đưa chữ ra HTML
 * thì nó giữ đúng cỡ thật ở mọi bề ngang màn hình, còn phần hình học muốn co
 * giãn bao nhiêu cũng được.
 *
 * Màu của đường mang nghĩa trạng thái tài chính chứ không phải danh tính, nên
 * hai phương án cùng xếp loại sẽ ra cùng một màu. Để vẫn phân biệt được, mỗi
 * đường có thêm ba lớp nhận dạng phụ: kiểu nét đứt riêng, nhãn giá trị ở đầu
 * mút, và bảng số liệu mở ra được ngay dưới biểu đồ.
 */

import { moneyShort, decimal, escapeHtml } from '../format.js';

/** Hệ toạ độ trong SVG là một ô vuông 1000x1000, được kéo giãn cho vừa khung. */
const BOX = 1000;

/** Nét của từng đường theo thứ tự. Đây là lớp nhận dạng khi màu trùng nhau. */
const DASHES = ['none', '7 5', '2 4', '10 4 2 4'];

/**
 * @param {{name:string, values:number[], tone:'safe'|'caution'|'risky'|'ink'}[]} series
 * @param {{id?:string, unit?:'money'|'months', animate?:boolean, guideAt?:number, guideLabel?:string, fillFirst?:boolean}} opts
 */
export function lineChart(series, opts = {}) {
  const {
    id = 'chart', unit = 'money', animate = true,
    guideAt = null, guideLabel = '', fillFirst = false,
  } = opts;
  if (series.length === 0 || series[0].values.length === 0) return '';

  const span = Math.max(...series.map((s) => s.values.length)) - 1 || 1;
  const flat = series.flatMap((s) => s.values);
  const rawMax = Math.max(...flat, guideAt ?? -Infinity);
  const rawMin = Math.min(...flat, 0);
  const max = rawMax === rawMin ? rawMax + 1 : rawMax;
  const min = rawMin;

  // Toạ độ tính bằng phần trăm khung vẽ, nên HTML và SVG dùng chung một hệ.
  const px = (i) => (i / span) * 100;
  const py = (v) => 100 - ((v - min) / (max - min)) * 100;
  const u = (pct) => ((pct / 100) * BOX).toFixed(1);

  const ticks = [max, min + (max - min) / 2, min];
  const grid = ticks
    .map((t) => `<line class="axis" x1="0" y1="${u(py(t))}" x2="${BOX}" y2="${u(py(t))}" opacity="0.6" vector-effect="non-scaling-stroke"/>`)
    .join('');

  // Vùng dưới ngưỡng thận trọng được tô nhạt. Một dải nền đọc nhanh hơn một
  // đường nét đứt: mắt thấy ngay đường nào đang đi vào vùng đó.
  const guide = guideAt === null ? '' : `
<rect class="danger" x="0" y="${u(py(guideAt))}" width="${BOX}" height="${u(100 - py(guideAt))}"/>
<line class="guide" x1="0" y1="${u(py(guideAt))}" x2="${BOX}" y2="${u(py(guideAt))}" vector-effect="non-scaling-stroke"/>`;

  const area = fillFirst ? areaPath(series[0], px, py, u, animate) : '';

  const paths = series
    .map((s, i) => {
      const d = s.values.map((v, k) => `${k === 0 ? 'M' : 'L'}${u(px(k))},${u(py(v))}`).join(' ');
      const dash = DASHES[i % DASHES.length];
      return `<path class="series" d="${d}" stroke="${strokeFor(s.tone)}"${dash === 'none' ? '' : ` stroke-dasharray="${dash}"`} vector-effect="non-scaling-stroke"/>`;
    })
    .join('');

  // Vẽ dần bằng một khung cắt trượt từ trái sang. Trục hoành là thời gian, nên
  // hướng chuyển động trùng với hướng dữ liệu chảy.
  const clipId = `wipe-${id}`;
  const wipe = `<defs><clipPath id="${clipId}"><rect class="wipe${animate ? ' wipe--animated' : ''}" x="0" y="0" width="${BOX}" height="${BOX}"/></clipPath></defs>`;

  const meta = escapeHtml(JSON.stringify({
    unit, span, min, max,
    series: series.map((s) => ({ name: s.name, tone: s.tone, values: s.values.map(round2) })),
  }));

  return `<div class="chart-wrap">
  <div class="chart-plot">
    <svg class="chart" viewBox="0 0 ${BOX} ${BOX}" preserveAspectRatio="none" role="img" data-chart="${meta}">
      <title>${escapeHtml(series.map((s) => s.name).join(', '))}</title>
      ${wipe}${grid}${guide}
      <g clip-path="url(#${clipId})">${area}${paths}</g>
      <line class="cursor" x1="0" x2="0" y1="0" y2="${BOX}" vector-effect="non-scaling-stroke"/>
    </svg>
    ${ticks.map((t) => `<span class="chart-y" style="top:${py(t).toFixed(2)}%">${axisLabel(t, unit)}</span>`).join('')}
    ${[0, Math.round(span / 2), span].map((i, k) => {
      const edge = k === 0 ? ' chart-x--start' : k === 2 ? ' chart-x--end' : '';
      return `<span class="chart-x${edge}" style="left:${px(i).toFixed(2)}%">tháng ${i}</span>`;
    }).join('')}
    ${guideAt === null ? '' : `<span class="chart-guide" style="top:${py(guideAt).toFixed(2)}%">${escapeHtml(guideLabel)}</span>`}
    ${endMarks(series, px, py, span, unit, animate)}
    ${series.map((s) => `<i class="chart-cursor-dot" style="background:${strokeFor(s.tone)}"></i>`).join('')}
    <div class="chart-tip" role="presentation"></div>
  </div>
</div>`;
}

/** Nền tô dưới đường đầu tiên, để mắt biết nên nhìn đường nào trước. */
function areaPath(s, px, py, u, animate) {
  const line = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${u(px(i))},${u(py(v))}`).join(' ');
  const d = `${line} L${u(px(s.values.length - 1))},${BOX} L${u(px(0))},${BOX} Z`;
  return `<path class="area${animate ? ' area--animated' : ''}" d="${d}" fill="${strokeFor(s.tone)}"/>`;
}

/**
 * Đầu mút mỗi đường: một chấm và một nhãn giá trị. Khi hai đường cùng xếp loại
 * nên cùng màu, đây là chỗ người đọc phân biệt được chúng. Nhãn nào sát nhau
 * quá thì được đẩy ra để không đè lên nhau.
 */
function endMarks(series, px, py, span, unit, animate) {
  const marks = series
    .map((s) => {
      const value = s.values[s.values.length - 1];
      return { tone: s.tone, value, at: py(value), label: py(value) };
    })
    .sort((a, b) => a.at - b.at);

  const MIN_GAP = 9;
  for (let i = 1; i < marks.length; i += 1) {
    if (marks[i].label - marks[i - 1].label < MIN_GAP) marks[i].label = marks[i - 1].label + MIN_GAP;
  }

  const left = px(span).toFixed(2);
  return marks
    .map((m) => `<i class="chart-dot${animate ? ' chart-dot--animated' : ''}" style="left:${left}%;top:${m.at.toFixed(2)}%;background:${strokeFor(m.tone)}"></i>
<span class="chart-end" style="top:${m.label.toFixed(2)}%;color:${strokeFor(m.tone)}">${axisLabel(m.value, unit)}</span>`)
    .join('');
}

/**
 * Bảng số liệu của biểu đồ. Có hai lý do: trình đọc màn hình không đọc được
 * đường vẽ, và người muốn con số chính xác thì không phải ước lượng bằng mắt.
 * Lấy mẫu thưa cho khỏi thành bảng hai mươi lăm dòng.
 */
export function chartTable(series, unit = 'money') {
  if (series.length === 0 || series[0].values.length === 0) return '';
  const span = Math.max(...series.map((s) => s.values.length)) - 1 || 1;
  const step = Math.max(Math.round(span / 8), 1);

  const marks = [];
  for (let i = 0; i <= span; i += step) marks.push(i);
  if (marks[marks.length - 1] !== span) marks.push(span);

  const head = `<tr><th scope="col">Tháng</th>${series.map((s) => `<th scope="col">${escapeHtml(s.name)}</th>`).join('')}</tr>`;
  const body = marks
    .map((i) => `<tr><th scope="row">${i}</th>${series
      .map((s) => `<td>${axisLabel(s.values[Math.min(i, s.values.length - 1)], unit)}</td>`)
      .join('')}</tr>`)
    .join('');

  return `<details class="chart-data">
  <summary>Xem số liệu dạng bảng</summary>
  <div class="chart-data__scroll"><table>
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table></div>
</details>`;
}

const round2 = (v) => Math.round(v * 100) / 100;

const axisLabel = (v, unit) => (unit === 'money' ? moneyShort(v) : `${decimal(v)} th`);

function strokeFor(tone) {
  if (tone === 'safe') return 'var(--safe)';
  if (tone === 'caution') return 'var(--caution)';
  if (tone === 'risky' || tone === 'blocked') return 'var(--risk)';
  return 'var(--ink)';
}

/** Chú giải màu cho biểu đồ. Không dùng chấm trang trí ở chỗ khác. */
export function legend(series) {
  return `<div class="row small" style="margin-top:10px">${series
    .map((s, i) => {
      const dash = DASHES[i % DASHES.length];
      const style = dash === 'none'
        ? `background:${strokeFor(s.tone)}`
        : `background:repeating-linear-gradient(90deg, ${strokeFor(s.tone)} 0 4px, transparent 4px 7px)`;
      return `<span class="row" style="gap:6px"><span style="width:18px;height:2px;border-radius:2px;${style}"></span>${escapeHtml(s.name)}</span>`;
    })
    .join('')}</div>`;
}
