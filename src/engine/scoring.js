/** Chấm điểm an toàn tài chính và tầng chặn cứng. */

import { ASSUMPTIONS } from './config.js';

export const WEIGHTS = {
  liquidity: 0.3,
  debt: 0.25,
  cashflow: 0.2,
  goals: 0.15,
  stability: 0.1,
};

/** Nội suy tuyến tính giữa các mốc. `points` phải tăng dần theo x. */
function interpolate(x, points) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

const LIQUIDITY_CURVE = [[0, 0], [1, 20], [3, 55], [6, 85], [12, 100]];
const DEBT_CURVE = [[0, 100], [0.3, 80], [0.4, 45], [0.5, 15], [0.6, 0]];
const CASHFLOW_CURVE = [[-0.1, 0], [0, 25], [0.1, 55], [0.2, 80], [0.3, 100]];

/**
 * Điểm 0-100, càng cao càng an toàn.
 * Trọng số là lựa chọn thiết kế, không phải chuẩn mực. Xem ASSUMPTION_NOTES.
 */
export function scoreOutcome(profile, outcome) {
  const lateGoals = outcome.goals.filter((g) => g.missesDeadline).length;
  const goalCount = Math.max(outcome.goals.length, 1);
  const cashflowRatio = profile.income > 0 ? outcome.surplusAfter / profile.income : 0;

  const parts = {
    liquidity: interpolate(outcome.runwayAfter, LIQUIDITY_CURVE),
    debt: interpolate(outcome.dtiAfter, DEBT_CURVE),
    cashflow: interpolate(cashflowRatio, CASHFLOW_CURVE),
    goals: 100 * (1 - lateGoals / goalCount),
    stability: profile.incomeStability === 'stable' ? 85 : 50,
  };

  const total = Object.keys(WEIGHTS).reduce((sum, key) => sum + parts[key] * WEIGHTS[key], 0);
  return { total: Math.round(total * 10) / 10, parts };
}

/**
 * Ràng buộc tuyệt đối, áp SAU khi chấm điểm.
 * Điểm trọng số có thể bị các thành phần phụ kéo lên: một phương án vét sạch
 * quỹ dự phòng nhưng không phát sinh nợ vẫn đạt trên 60 điểm. Tầng này tồn tại
 * để engine không khuyên sai trong đúng tình huống đó.
 */
export const HARD_RULES = [
  {
    code: 'NEGATIVE_CASHFLOW',
    test: (o) => o.surplusAfter < 0,
    message: 'Dòng tiền hằng tháng trở nên âm. Phương án này vượt quá khả năng chi trả.',
  },
  {
    code: 'LIQUIDITY_DRAINED',
    test: (o) => o.runwayAfter < ASSUMPTIONS.runwayHardStop,
    message: 'Quỹ dự phòng còn dưới một tháng. Không còn đệm đỡ cho sự cố bất ngờ.',
  },
  {
    code: 'DEBT_OVER_LIMIT',
    test: (o) => o.dtiAfter > ASSUMPTIONS.dtiHardStop,
    message: 'Nghĩa vụ nợ vượt quá một nửa thu nhập.',
  },
];

export function applyHardGate(score, outcome) {
  const breaches = HARD_RULES.filter((rule) => rule.test(outcome));
  if (breaches.length === 0) {
    return { ...score, band: bandFor(score.total), breaches: [] };
  }
  return {
    ...score,
    total: Math.min(score.total, ASSUMPTIONS.gateScoreCap),
    band: 'blocked',
    breaches: breaches.map((b) => ({ code: b.code, message: b.message })),
  };
}

export function bandFor(total) {
  if (total >= 70) return 'safe';
  if (total >= 45) return 'caution';
  return 'risky';
}

export const BAND_LABEL = {
  safe: 'An toàn',
  caution: 'Cần thận trọng',
  risky: 'Rủi ro cao',
  blocked: 'Không khuyến nghị',
};
