/**
 * MÔ PHỎNG một Open API ngân hàng/ví điện tử — KHÔNG phải kết nối ngân hàng
 * thật. Dùng để demo trực quan ý tưởng ở mục 4.1.2 và 6.2.2 của bản kế hoạch
 * ("khởi tạo hồ sơ từ dữ liệu thay thế qua Open API"), việc thật sự cần đối
 * tác ngân hàng cấp quyền và đăng ký sandbox theo Nghị định 94/2025/NĐ-CP —
 * chưa có trong phạm vi hiện tại.
 *
 * Chạy như một service HTTP riêng (cổng khác), để lời gọi từ backend chính
 * sang đây là một lệnh gọi mạng thật (fetch), đúng hình dạng của một tích hợp
 * đối tác thật, chỉ khác là đầu bên kia trả về dữ liệu giả lập có seed.
 */

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { sendJson } from './http.js';

/** PRNG tất định từ một chuỗi seed, để cùng một linkId luôn trả về cùng dữ liệu. */
function mulberry32(seedStr) {
  let a = createHash('sha256').update(seedStr).digest().readUInt32LE(0);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = {
  income: ['Lương công ty'],
  rent: ['Tiền nhà'],
  utilities: ['Điện nước', 'Internet'],
  food: ['Ăn uống'],
  transport: ['Đi lại'],
  entertainment: ['Giải trí'],
};

/** Sinh 90 ngày giao dịch giả lập cho một linkId, tất định theo seed. */
export function generateMockAccount(linkId, months = 3) {
  const rand = mulberry32(linkId);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const range = (min, max) => min + rand() * (max - min);

  const income = Math.round(range(8_000_000, 18_000_000) / 500_000) * 500_000;
  const rent = Math.round(range(1_500_000, 4_000_000) / 100_000) * 100_000;
  const utilities = Math.round(range(300_000, 900_000) / 50_000) * 50_000;

  const transactions = [];
  let balance = Math.round(range(3_000_000, 30_000_000) / 500_000) * 500_000;
  const openingBalance = balance;
  const today = new Date();

  for (let m = months - 1; m >= 0; m -= 1) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - m, 1);

    transactions.push({
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 5).toISOString().slice(0, 10),
      label: pick(CATEGORIES.income),
      category: 'income',
      amount: income,
    });
    transactions.push({
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 3).toISOString().slice(0, 10),
      label: pick(CATEGORIES.rent),
      category: 'rent',
      amount: -rent,
    });
    transactions.push({
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 10).toISOString().slice(0, 10),
      label: pick(CATEGORIES.utilities),
      category: 'utilities',
      amount: -utilities,
    });

    for (let w = 0; w < 4; w += 1) {
      transactions.push({
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 2 + w * 7).toISOString().slice(0, 10),
        label: pick(CATEGORIES.food),
        category: 'food',
        amount: -Math.round(range(300_000, 700_000) / 10_000) * 10_000,
      });
    }
    for (let w = 0; w < 2; w += 1) {
      transactions.push({
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 6 + w * 10).toISOString().slice(0, 10),
        label: pick(CATEGORIES.transport),
        category: 'transport',
        amount: -Math.round(range(100_000, 300_000) / 10_000) * 10_000,
      });
    }
    if (rand() > 0.4) {
      transactions.push({
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 20).toISOString().slice(0, 10),
        label: pick(CATEGORIES.entertainment),
        category: 'entertainment',
        amount: -Math.round(range(150_000, 500_000) / 10_000) * 10_000,
      });
    }
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  balance = openingBalance + transactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    linkId,
    provider: 'mock-bank',
    asOf: today.toISOString().slice(0, 10),
    balance,
    transactions,
    disclaimer:
      'Dữ liệu mô phỏng cho mục đích minh hoạ, không phải kết nối ngân hàng thật. ' +
      'Xem mục 4.1.2 và 8.1.1 của bản kế hoạch: tích hợp Open API thật cần đối tác ' +
      'ngân hàng và đăng ký sandbox theo Nghị định 94/2025/NĐ-CP.',
  };
}

export function createMockBankApi() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const match = url.pathname.match(/^\/accounts\/([^/]+)$/);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'mock-bank-api' });
      return;
    }

    if (req.method === 'GET' && match) {
      const linkId = decodeURIComponent(match[1]);
      const months = Number(url.searchParams.get('months')) || 3;
      sendJson(res, 200, generateMockAccount(linkId, months));
      return;
    }

    sendJson(res, 404, { error: 'Không tìm thấy đường dẫn.' });
  });
  return server;
}

export function startMockBankApi(port = process.env.MOCK_BANK_PORT || 8788) {
  const server = createMockBankApi();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[mock] Bank API mô phỏng đang chạy tại http://localhost:${port} (KHÔNG phải dữ liệu thật)`);
  });
  return server;
}
