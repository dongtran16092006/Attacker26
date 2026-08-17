/** Hồ sơ tài chính động và các chỉ số nền suy ra từ nó. */

/**
 * @typedef {Object} Debt
 * @property {string} name
 * @property {number} monthlyPayment
 * @property {number} remainingMonths
 *
 * @typedef {Object} Goal
 * @property {string} name
 * @property {number} target
 * @property {number} saved
 * @property {number} deadlineMonth
 * @property {number} allocWeight
 *
 * @typedef {Object} Profile
 * @property {number} income thu nhập ròng hằng tháng
 * @property {number} essential chi phí thiết yếu
 * @property {number} discretionary chi tiêu linh hoạt
 * @property {number} liquidAssets tài sản rút dùng được ngay
 * @property {Debt[]} debts
 * @property {Goal[]} goals
 * @property {'stable'|'variable'} incomeStability
 */

export const EMPTY_PROFILE = {
  income: 0,
  essential: 0,
  discretionary: 0,
  liquidAssets: 0,
  debts: [],
  goals: [],
  incomeStability: 'stable',
};

/**
 * Chi phí tối thiểu cố ý KHÔNG gồm chi tiêu linh hoạt. Quỹ dự phòng đo khả năng
 * cầm cự khi mất thu nhập, mà trong tình huống đó người ta cắt ngay khoản linh
 * hoạt nhưng vẫn phải trả tiền nhà, tiền ăn và tiền nợ. Đưa nó vào mẫu số sẽ
 * làm mọi phương án bị đánh giá bi quan hơn thực tế.
 */
export function baseline(profile) {
  const debtPayments = profile.debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const minimumSpend = profile.essential + debtPayments;
  const surplus = profile.income - profile.essential - profile.discretionary - debtPayments;

  return {
    debtPayments,
    minimumSpend,
    surplus,
    savingsRate: profile.income > 0 ? surplus / profile.income : 0,
    dti: profile.income > 0 ? debtPayments / profile.income : 0,
    runway: minimumSpend > 0 ? profile.liquidAssets / minimumSpend : Infinity,
  };
}

/** Kiểm tra hồ sơ trước khi mô phỏng. Trả về danh sách lỗi, rỗng nghĩa là hợp lệ. */
export function validate(profile) {
  const errors = [];
  if (!(profile.income > 0)) errors.push('Thu nhập phải lớn hơn 0.');
  if (profile.essential < 0) errors.push('Chi phí thiết yếu không được âm.');
  if (profile.discretionary < 0) errors.push('Chi tiêu linh hoạt không được âm.');
  if (profile.liquidAssets < 0) errors.push('Tài sản thanh khoản không được âm.');
  if (profile.essential > profile.income) {
    errors.push('Chi phí thiết yếu đang vượt thu nhập. Hãy kiểm tra lại số liệu.');
  }
  profile.goals.forEach((g) => {
    if (!(g.target > 0)) errors.push(`Mục tiêu "${g.name}" phải có số tiền lớn hơn 0.`);
    if (g.saved > g.target) errors.push(`Mục tiêu "${g.name}" đã tích luỹ vượt số cần đạt.`);
  });
  return errors;
}
