import { ASSUMPTION_NOTES } from '../../engine/config.js';
import { WEIGHTS } from '../../engine/scoring.js';
import { escapeHtml } from '../format.js';

const STATUS = {
  unverified: { label: 'Nhóm tự đặt, chưa xác minh', cls: 'risky' },
  convention: { label: 'Thông lệ quốc tế', cls: 'caution' },
  design: { label: 'Lựa chọn thiết kế', cls: 'caution' },
};

export function assumptionsView() {
  return `
<section class="view stack">
  <div>
    <p class="eyebrow">Minh bạch</p>
    <h1 style="margin-top:8px;max-width:20ch">Mọi con số đều có nguồn gốc</h1>
    <p class="lede" style="margin-top:14px">
      Kết quả mô phỏng phụ thuộc vào các tham số dưới đây. Chúng tôi công bố cả những tham số do
      nhóm tự đặt và chưa xác minh, vì giấu chúng đi sẽ khiến bạn tin vào kết quả nhiều hơn mức
      đáng tin.
    </p>
  </div>

  <div class="rows">
    ${ASSUMPTION_NOTES.map((a) => {
      const s = STATUS[a.status];
      return `<div class="rows__item">
        <div class="spread">
          <strong>${escapeHtml(a.label)}</strong>
          <span class="figure">${escapeHtml(a.value)}</span>
        </div>
        <div class="row" style="margin-top:8px">
          <span class="chip chip--${s.cls}">${s.label}</span>
        </div>
        <p class="small muted" style="margin-top:8px">${escapeHtml(a.note)}</p>
      </div>`;
    }).join('')}
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      <h2>Công cụ này không làm gì</h2>
      <ul class="notes" style="margin-top:14px">
        ${[
          'Không phải tư vấn tài chính, tư vấn đầu tư hay khuyến nghị mua bán sản phẩm tài chính.',
          'Không dự báo thu nhập tương lai. Mọi kịch bản giả định thu nhập giữ nguyên như bạn khai báo.',
          'Không tính tới biến động thị trường, thay đổi lãi suất hay các cú sốc chi tiêu bất ngờ.',
          'Không tự kết nối ngân hàng hay đọc lịch sử giao dịch nào — trừ khi bạn chủ động bật ' +
            'mục "Tài khoản" và bấm nút nhập dữ liệu, và ngay cả lúc đó dữ liệu ngân hàng vẫn là ' +
            'dữ liệu mô phỏng, không phải kết nối thật.',
          'Không tự lưu dữ liệu lên máy chủ nào. Hồ sơ chỉ nằm trong bộ nhớ trình duyệt này, trừ ' +
            'khi bạn chủ động đăng nhập và bấm đồng bộ ở mục "Tài khoản".',
        ].map((t) => `<li class="note"><span class="note__dot" aria-hidden="true"></span><span>${t}</span></li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="panel">
    <h3>Trọng số điểm an toàn tài chính</h3>
    <div class="rows" style="margin-top:12px">
      ${Object.entries({
        liquidity: 'Thanh khoản, đo bằng số tháng quỹ dự phòng',
        debt: 'Gánh nặng nợ trên thu nhập',
        cashflow: 'Đệm dòng tiền còn lại',
        goals: 'Tỷ lệ mục tiêu bị trễ hạn',
        stability: 'Mức ổn định của thu nhập',
      }).map(([key, desc]) => `
      <div class="rows__item spread">
        <span class="small">${desc}</span>
        <span class="figure">${Math.round(WEIGHTS[key] * 100)}%</span>
      </div>`).join('')}
    </div>
    <p class="small muted" style="margin-top:12px">
      Bộ trọng số này do nhóm đặt ra, phản ánh quan điểm rằng với người 18 đến 25 tuổi, mất khả năng
      ứng phó sự cố là rủi ro nghiêm trọng nhất. Nó không dựa trên chuẩn mực được công nhận nào và
      sẽ được hiệu chỉnh khi có dữ liệu người dùng thực tế.
    </p>
  </div>

  <div class="row">
    <button class="btn btn--ghost" data-action="go" data-view="welcome">Về trang đầu</button>
    <button class="btn btn--ghost" data-action="wipe">Xoá hồ sơ khỏi máy này</button>
  </div>

  <p class="small muted" style="max-width:70ch">
    DeciFin là công cụ hỗ trợ ra quyết định dựa trên các giả định do bạn khai báo và các tham số mô
    hình được công bố công khai ở trên. Công cụ không phải là tư vấn tài chính, tư vấn đầu tư hay
    khuyến nghị mua bán sản phẩm tài chính. Quyền quyết định cuối cùng thuộc về bạn.
  </p>
</section>`;
}
