/**
 * Lớp tăng cường chạy sau khi màn hình đã được dựng xong.
 *
 * Vì sao tách riêng: mọi hàm dựng giao diện là hàm thuần nhận trạng thái trả về
 * chuỗi HTML, và đó là thứ bộ kiểm thử dựa vào. Nếu nhét chuyển động vào trong
 * chúng thì hoặc phải giả lập DOM khi kiểm thử, hoặc phải bỏ kiểm thử tầng giao
 * diện. Nên chuyển động sống ở đây, đọc DOM đã dựng và làm giàu thêm.
 *
 * Hệ quả quan trọng: HTML dựng ra đã chứa sẵn con số cuối cùng. Nếu trình duyệt
 * không chạy được phần này, hoặc người dùng tắt hiệu ứng chuyển động, sản phẩm
 * vẫn hiển thị đúng số. Chuyển động là lớp phủ, không phải điều kiện.
 */

import { money, decimal, percent } from './format.js';

const STILL = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Gọi một lần sau mỗi lần dựng lại màn hình. */
export function enhanceView(root) {
  runCounters(root);
  bindChartTips(root);
}

/* ------------------------------------------------------------------ đếm số */

/**
 * Con số chạy từ 0 lên giá trị thật.
 *
 * Chỉ dùng cho những con số là kết luận của một phép tính: lãi suất thực, điểm
 * an toàn, bốn chỉ số nền. Chúng chạy lên để người xem hiểu đây là kết quả được
 * tính ra chứ không phải chữ in sẵn. Không dùng cho số liệu tra bảng.
 */
function runCounters(root) {
  const targets = root.querySelectorAll('[data-count]');
  if (STILL()) return;

  targets.forEach((el, i) => {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to)) return;

    const final = el.textContent;
    const kind = el.dataset.countKind || 'int';
    const startAt = performance.now() + i * 70;
    const DURATION = 780;

    // Con số thật không bị xoá đi cho tới khi khung hình đầu tiên thật sự chạy.
    // Trình duyệt tạm dừng requestAnimationFrame khi thẻ bị ẩn, và nếu xoá
    // trước thì người dùng quay lại sẽ thấy một bảng chỉ số toàn số 0.
    const step = (now) => {
      if (now < startAt) { requestAnimationFrame(step); return; }
      const t = Math.min((now - startAt) / DURATION, 1);
      if (t >= 1) { el.textContent = final; return; }
      el.textContent = formatCount(to * easeOut(t), kind);
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

const easeOut = (t) => 1 - (1 - t) ** 4;

function formatCount(v, kind) {
  if (kind === 'money') return money(v);
  if (kind === 'pct1') return percent(v, 1);
  if (kind === 'pct2') return percent(v, 2);
  if (kind === 'dec1') return decimal(v, 1);
  return String(Math.round(v));
}

/* -------------------------------------------------- vạch dò trên biểu đồ */

/**
 * Rê chuột dọc biểu đồ để đọc giá trị của mọi đường tại đúng tháng đó.
 *
 * Đây là chỗ câu chuyện đánh đổi nằm: hai phương án có thể cùng xếp loại nên
 * cùng màu, và bằng mắt thì chỉ thấy hai đường gần nhau. Vạch dò cho biết tại
 * tháng thứ mấy chúng tách ra và tách bao nhiêu.
 */
function bindChartTips(root) {
  root.querySelectorAll('.chart-wrap').forEach((wrap) => {
    const plot = wrap.querySelector('.chart-plot');
    const svg = wrap.querySelector('.chart');
    const tip = wrap.querySelector('.chart-tip');
    if (!plot || !svg || !tip || !svg.dataset.chart) return;

    let meta;
    try { meta = JSON.parse(svg.dataset.chart); } catch { return; }

    const cursor = svg.querySelector('.cursor');
    const dots = [...plot.querySelectorAll('.chart-cursor-dot')];

    // Toạ độ dùng chung một hệ phần trăm với lúc dựng, nên chỗ này không cần
    // biết khung vẽ đang rộng bao nhiêu pixel.
    const atY = (v) => 100 - ((v - meta.min) / (meta.max - meta.min)) * 100;
    const valueAt = (s, i) => s.values[Math.min(i, s.values.length - 1)];

    const move = (event) => {
      const box = plot.getBoundingClientRect();
      if (box.width === 0) return;

      const ratio = (event.clientX - box.left) / box.width;
      const index = Math.max(0, Math.min(Math.round(ratio * meta.span), meta.span));
      const at = (index / meta.span) * 100;

      cursor.setAttribute('x1', at * 10);
      cursor.setAttribute('x2', at * 10);

      let highest = 100;
      meta.series.forEach((s, i) => {
        const top = atY(valueAt(s, index));
        highest = Math.min(highest, top);
        if (dots[i]) { dots[i].style.left = `${at}%`; dots[i].style.top = `${top}%`; }
      });

      tip.innerHTML = `<div class="chart-tip__k">Tháng ${index}</div>${meta.series
        .map((s) => `<div class="chart-tip__row">
          <span class="chart-tip__swatch" style="background:${toneColour(s.tone)}"></span>
          <span>${s.name}</span>
          <b>${readout(valueAt(s, index), meta.unit)}</b>
        </div>`)
        .join('')}`;

      // Kẹp lại để hộp không thò ra ngoài mép biểu đồ trên màn hình hẹp.
      const half = tip.offsetWidth / 2 + 4;
      tip.style.left = `${Math.max(half, Math.min((at / 100) * box.width, box.width - half))}px`;
      tip.style.top = `${(highest / 100) * box.height}px`;
      wrap.dataset.hover = 'on';
    };

    plot.addEventListener('pointermove', move);
    plot.addEventListener('pointerdown', move);
    plot.addEventListener('pointerleave', () => { wrap.dataset.hover = 'off'; });
  });
}

const readout = (v, unit) => (unit === 'money' ? money(v) : `${decimal(v)} tháng`);

function toneColour(tone) {
  if (tone === 'safe') return 'var(--safe)';
  if (tone === 'caution') return 'var(--caution)';
  if (tone === 'risky' || tone === 'blocked') return 'var(--risk)';
  return 'var(--ink)';
}
