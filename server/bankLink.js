/**
 * "Liên kết ngân hàng" phía DeciFin: quản lý bước ưng thuận (consent) và suy
 * hồ sơ tài chính nháp từ dữ liệu giao dịch. Gọi sang server/mockBankApi.js
 * qua HTTP thật — xem cảnh báo ở đó về việc đây là dữ liệu mô phỏng.
 *
 * Bộ nhớ liên kết chỉ lưu trong RAM (Map), mất khi restart server. Đây là demo
 * cho ý tưởng, không phải nơi lưu access token ngân hàng thật — khi làm thật,
 * bảng này cần mã hoá và có luồng thu hồi ưng thuận riêng.
 */

import { randomUUID } from 'node:crypto';

const links = new Map(); // linkId -> { userId, provider, consentedAt }

function bankApiUrl() {
  return process.env.MOCK_BANK_API_URL || `http://localhost:${process.env.MOCK_BANK_PORT || 8788}`;
}

export function createBankLink(userId, provider = 'mock-bank') {
  const linkId = randomUUID();
  links.set(linkId, { userId, provider, consentedAt: new Date().toISOString() });
  return { linkId, provider, consentedAt: links.get(linkId).consentedAt };
}

export function revokeBankLink(userId, linkId) {
  const link = links.get(linkId);
  if (link && link.userId === userId) links.delete(linkId);
}

function ownsLink(userId, linkId) {
  const link = links.get(linkId);
  return Boolean(link && link.userId === userId);
}

/** Gộp giao dịch theo hạng mục, quy về trung bình mỗi tháng. */
function monthlyAverageByCategory(transactions, months) {
  const totals = {};
  for (const t of transactions) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  const perMonth = {};
  for (const [category, total] of Object.entries(totals)) {
    perMonth[category] = total / months;
  }
  return perMonth;
}

const ESSENTIAL_CATEGORIES = ['rent', 'utilities'];
const DISCRETIONARY_CATEGORIES = ['food', 'transport', 'entertainment'];

/** Suy một hồ sơ tài chính nháp từ dữ liệu tài khoản mô phỏng. Không tự lưu — người dùng phải xem lại trước. */
export function draftProfileFromAccount(account, months) {
  const perMonth = monthlyAverageByCategory(account.transactions, months);

  const income = Math.round(perMonth.income || 0);
  const essential = Math.round(
    ESSENTIAL_CATEGORIES.reduce((sum, c) => sum + Math.abs(perMonth[c] || 0), 0),
  );
  const discretionary = Math.round(
    DISCRETIONARY_CATEGORIES.reduce((sum, c) => sum + Math.abs(perMonth[c] || 0), 0),
  );

  return {
    income,
    essential,
    discretionary,
    liquidAssets: Math.max(account.balance, 0),
    debts: [],
    goals: [],
    incomeStability: 'stable',
    _source: {
      provider: account.provider,
      linkId: account.linkId,
      asOf: account.asOf,
      disclaimer: account.disclaimer,
    },
  };
}

export async function importProfileFromBank(userId, linkId, { months = 3 } = {}) {
  if (!ownsLink(userId, linkId)) {
    const err = new Error('Liên kết ngân hàng không tồn tại hoặc không thuộc về bạn.');
    err.status = 404;
    throw err;
  }

  let res;
  try {
    res = await fetch(`${bankApiUrl()}/accounts/${encodeURIComponent(linkId)}?months=${months}`);
  } catch {
    const err = new Error('Không kết nối được với dịch vụ ngân hàng mô phỏng. Đảm bảo đã chạy `npm run mock-bank`.');
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('Không lấy được dữ liệu từ dịch vụ ngân hàng mô phỏng.');
    err.status = 502;
    throw err;
  }
  const account = await res.json();
  return draftProfileFromAccount(account, months);
}

export function _resetLinksForTest() {
  links.clear();
}
