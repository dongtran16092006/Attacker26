/**
 * Gộp toàn bộ dự án thành một tệp HTML duy nhất.
 *
 * Dùng khi cần đưa sản phẩm cho ai đó mà không muốn họ phải cài Node, chạy máy
 * chủ hay giải nén gì cả: mở tệp bằng trình duyệt là chạy. Vì mọi module được
 * nối thành một khối, trình duyệt không phải tải module riêng lẻ nên không vướng
 * hạn chế của giao thức file://.
 *
 * Chạy: node tools/build_standalone.js
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Thứ tự phụ thuộc, từ tầng thấp nhất lên trên.
const MODULES = [
  'src/engine/config.js',
  'src/engine/profile.js',
  'src/engine/finance.js',
  'src/engine/goals.js',
  'src/engine/scoring.js',
  'src/engine/explain.js',
  'src/engine/index.js',
  'src/ui/format.js',
  'src/ui/presets.js',
  'src/ui/state.js',
  'src/ui/components/chart.js',
  'src/ui/motion.js',
  'src/ui/scenarios.js',
  'src/ui/views/welcome.js',
  'src/ui/views/profileForm.js',
  'src/ui/views/dashboard.js',
  'src/ui/views/decision.js',
  'src/ui/views/compare.js',
  'src/ui/views/assumptions.js',
  'src/app.js',
];

/** Bỏ câu lệnh import và từ khoá export, giữ nguyên phần còn lại. */
function flatten(source) {
  return source
    .replace(/^\s*import\s[\s\S]*?from\s+'[^']+';[ \t]*$/gm, '')
    .replace(/^\s*export\s+\*\s+from\s+'[^']+';[ \t]*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+'[^']+';[ \t]*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};[ \t]*$/gm, '')
    .replace(/^([ \t]*)export\s+(const|let|function|class|async)\b/gm, '$1$2');
}

const css = await readFile(join(ROOT, 'assets/styles.css'), 'utf8');

const parts = [];
for (const path of MODULES) {
  const source = await readFile(join(ROOT, path), 'utf8');
  parts.push(`// ${'='.repeat(70)}\n// ${path}\n// ${'='.repeat(70)}\n${flatten(source)}`);
}
const bundle = parts.join('\n');

// Cảnh báo sớm nếu hai module khai báo trùng tên ở cấp cao nhất.
const declared = [...bundle.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
const duplicates = [...new Set(declared.filter((n, i) => declared.indexOf(n) !== i))];
if (duplicates.length > 0) {
  console.error('Trùng tên khai báo ở cấp cao nhất:', duplicates.join(', '));
  process.exit(1);
}

const html = `<!doctype html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DeciFin - nhìn thấy hệ quả trước khi tiêu tiền</title>
<meta name="description" content="Công cụ mô phỏng hệ quả tài chính của một quyết định trước khi bạn chọn. Chạy hoàn toàn trên thiết bị của bạn.">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%2316171a'/><text x='16' y='22' font-family='sans-serif' font-size='17' font-weight='700' fill='%23faf9f6' text-anchor='middle'>D</text></svg>">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>
  <div style="max-width:640px;margin:64px auto;padding:0 20px">
    <h1>Cần bật JavaScript</h1>
    <p>DeciFin thực hiện toàn bộ tính toán ngay trên trình duyệt của bạn, nên cần JavaScript để chạy.
    Đổi lại, không có số liệu tài chính nào của bạn rời khỏi thiết bị này.</p>
  </div>
</noscript>
<script>
${bundle}
mount(document.getElementById('app'));
</script>
</body>
</html>`;

await writeFile(join(ROOT, 'decifin-standalone.html'), html, 'utf8');
console.log(`Đã tạo decifin-standalone.html (${Math.round(html.length / 1024)} KB từ ${MODULES.length} module)`);
