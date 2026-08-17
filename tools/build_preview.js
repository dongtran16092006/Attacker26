/**
 * Dựng docs/preview.html từ chính các hàm giao diện của ứng dụng.
 *
 * Mục đích: có một trang tĩnh hiển thị đủ mọi màn hình với dữ liệu mẫu, dùng để
 * chụp ảnh cho README và để rà soát thiết kế mà không phải bấm qua từng bước.
 * Vì nó gọi đúng các hàm mà ứng dụng gọi, trang này không bao giờ lệch với sản phẩm.
 *
 * Chạy: node tools/build_preview.js
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { welcomeView } from '../src/ui/views/welcome.js';
import { profileFormView } from '../src/ui/views/profileForm.js';
import { dashboardView } from '../src/ui/views/dashboard.js';
import { decisionView } from '../src/ui/views/decision.js';
import { compareView } from '../src/ui/views/compare.js';
import { assumptionsView } from '../src/ui/views/assumptions.js';
import { PRESETS } from '../src/ui/presets.js';
import { buildPurchase } from '../src/ui/scenarios.js';
import { rank } from '../src/engine/index.js';

const profile = PRESETS[1].profile;
const read = (name) => ({
  price: 25_000_000, downPayment: 5_000_000, months: 12, flatRate: 1, delayMonths: 4,
}[name] ?? 0);

const built = buildPurchase(read);
const results = rank(profile, built.events, built.extras);

const base = { profile, wizardStep: 0, decisionKind: 'purchase', results, installment: built.installment, view: 'welcome' };

const SCREENS = [
  ['1. Trang chào', welcomeView(base)],
  ['2. Tạo hồ sơ', profileFormView(base)],
  ['3. Bảng chỉ số', dashboardView(base)],
  ['4. Nhập quyết định', decisionView(base)],
  ['5. So sánh kết quả', compareView(base)],
  ['6. Giả định và giới hạn', assumptionsView(base)],
];

const html = `<!doctype html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DeciFin - toàn bộ màn hình</title>
<link rel="stylesheet" href="../assets/styles.css">
<style>
  .preview-label { margin: 56px 0 18px; padding-top: 22px; border-top: 1px solid var(--line); }
  .preview-label:first-of-type { border-top: 0; margin-top: 0; }
</style>
</head>
<body>
<main><div class="shell">
  <p class="eyebrow" style="margin-top:40px">Trang rà soát thiết kế</p>
  <h1 style="margin-top:10px">Sáu màn hình của DeciFin</h1>
  <p class="lede" style="margin-top:12px">
    Trang này được sinh tự động từ chính mã giao diện của ứng dụng, nên nó luôn khớp với sản phẩm.
    Dùng để chụp ảnh minh hoạ và để rà soát thiết kế. Sinh lại bằng lệnh <code>node tools/build_preview.js</code>.
  </p>
  ${SCREENS.map(([title, body]) => `
  <h2 class="preview-label">${title}</h2>
  ${body}`).join('')}
</div></main>
</body>
</html>`;

const here = dirname(fileURLToPath(import.meta.url));
await writeFile(join(here, '..', 'docs', 'preview.html'), html, 'utf8');
console.log('Đã tạo docs/preview.html');
