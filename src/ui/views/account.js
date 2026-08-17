import { escapeHtml } from '../format.js';

/**
 * Màn "Tài khoản" — tính năng tuỳ chọn của giai đoạn 2. Đăng ký/đăng nhập vào
 * server/ để đồng bộ hồ sơ giữa nhiều thiết bị, hoặc nhập hồ sơ nháp từ một
 * dịch vụ ngân hàng MÔ PHỎNG (xem cảnh báo trong nút bên dưới). Không có gì ở
 * đây tự chạy — mọi lời gọi mạng đều do người dùng bấm nút.
 */
export function accountView(state) {
  const account = state.account;

  return `
<section class="view stack">
  <div>
    <p class="eyebrow">Giai đoạn 2 — tuỳ chọn</p>
    <h1 style="margin-top:8px;max-width:20ch">Tài khoản</h1>
  </div>

  ${state.accountStatus ? `<p class="small" style="color:var(--safe)">✓ ${escapeHtml(state.accountStatus)}</p>` : ''}

  ${account ? loggedInPanel(account) : loggedOutPanel()}

  <div class="row">
    <button class="btn btn--ghost" data-action="go" data-view="welcome">Về trang đầu</button>
  </div>
</section>`;
}

function loggedOutPanel() {
  return `
  <div class="shell-card">
    <div class="shell-card__core">
      <div class="grid-2">
        <div class="field">
          <label for="f-accountEmail">Email</label>
          <input class="input" id="f-accountEmail" name="accountEmail" type="email" autocomplete="email">
        </div>
        <div class="field">
          <label for="f-accountPassword">Mật khẩu</label>
          <input class="input" id="f-accountPassword" name="accountPassword" type="password"
                 autocomplete="current-password" minlength="8">
          <span class="hint">Ít nhất 8 ký tự</span>
        </div>
      </div>
      <div class="row" style="margin-top:16px">
        <button class="btn" data-action="account-register">Đăng ký</button>
        <button class="btn btn--ghost" data-action="account-login">Đăng nhập</button>
      </div>
    </div>
  </div>`;
}

function loggedInPanel(account) {
  return `
  <div class="shell-card">
    <div class="shell-card__core">
      <div class="spread">
        <strong>${escapeHtml(account.email)}</strong>
        <span class="chip chip--safe">Đã đăng nhập</span>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn btn--ghost" data-action="account-logout">Đăng xuất</button>
        <button class="btn btn--ghost" data-action="account-delete">Xoá tài khoản</button>
      </div>
    </div>
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      <h2>Đồng bộ hồ sơ</h2>
      <div class="row" style="margin-top:14px">
        <button class="btn" data-action="account-push">Đẩy hồ sơ hiện tại lên tài khoản</button>
        <button class="btn btn--ghost" data-action="account-pull">Tải hồ sơ đã lưu trên tài khoản</button>
      </div>
    </div>
  </div>

  <div class="shell-card">
    <div class="shell-card__core">
      <h2>Nhập hồ sơ từ ngân hàng</h2>
      <p class="small muted" style="margin-top:8px">
        Dữ liệu giao dịch ở bước này là <strong>dữ liệu mô phỏng</strong>, không phải kết nối ngân
        hàng thật. Tích hợp Open API thật cần đối tác ngân hàng và đăng ký sandbox theo Nghị định
        94/2025/NĐ-CP (mục 8.1.1 bản kế hoạch) — chưa nằm trong phạm vi hiện tại.
      </p>
      <div class="row" style="margin-top:12px">
        <button class="btn btn--ghost" data-action="account-import-bank">Nhập hồ sơ từ ngân hàng (mô phỏng)</button>
      </div>
    </div>
  </div>`;
}
