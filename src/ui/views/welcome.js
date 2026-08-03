import { PRESETS } from '../presets.js';
import { escapeHtml } from '../format.js';

export function welcomeView() {
  return `
<section class="view stack">
  <div>
    <p class="eyebrow">Công cụ trước khi quyết định</p>
    <h1 style="margin-top:10px;max-width:19ch">Nhìn thấy hệ quả trước khi tiêu tiền.</h1>
    <p class="lede" style="margin-top:14px">
      Ứng dụng ghi chép cho bạn biết đã tiêu bao nhiêu. DeciFin cho bạn biết nếu chọn phương án này
      thì quỹ dự phòng còn lại bao nhiêu, mục tiêu bị đẩy lùi bao lâu, và gói trả góp kia thật ra
      đang tính lãi bao nhiêu.
    </p>
    <div class="row" style="margin-top:24px">
      <button class="btn" data-action="start-blank">
        Tạo hồ sơ của tôi <span class="btn__pip" aria-hidden="true">↗</span>
      </button>
      <button class="btn btn--ghost" data-action="go" data-view="assumptions">Xem giả định của mô hình</button>
    </div>
  </div>

  <div class="shell-card rise" style="animation-delay:.08s">
    <div class="shell-card__core">
      <div class="spread">
        <h2>Hoặc mở một hồ sơ mẫu</h2>
        <span class="small muted">Dữ liệu dựng sẵn, xem kết quả ngay</span>
      </div>
      <div class="grid-3" style="margin-top:18px">
        ${PRESETS.map((p, i) => `
        <button class="panel rise" data-action="preset" data-id="${p.id}"
                style="text-align:left;cursor:pointer;animation-delay:${0.12 + i * 0.06}s">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="small muted" style="margin-top:6px">${escapeHtml(p.summary)}</p>
          <span class="small" style="display:inline-block;margin-top:12px">Mở hồ sơ này ↗</span>
        </button>`).join('')}
      </div>
    </div>
  </div>

  <p class="small muted" style="max-width:70ch">
    Toàn bộ tính toán chạy trên thiết bị của bạn. Ứng dụng không có máy chủ và không gửi số liệu
    tài chính của bạn đi đâu cả.
  </p>
</section>`;
}
