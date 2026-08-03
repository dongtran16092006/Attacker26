/** Hồ sơ chuẩn dùng xuyên suốt bộ test. Mọi con số kỳ vọng đều bám vào đây. */
export const STANDARD_PROFILE = {
  income: 12_000_000,
  essential: 6_500_000,
  discretionary: 2_000_000,
  liquidAssets: 25_000_000,
  debts: [],
  incomeStability: 'stable',
  goals: [
    { name: 'Quỹ dự phòng 6 tháng', target: 39_000_000, saved: 25_000_000, deadlineMonth: 18, allocWeight: 0.6 },
    { name: 'Học chứng chỉ nghề', target: 20_000_000, saved: 2_000_000, deadlineMonth: 12, allocWeight: 0.4 },
  ],
};

/** Hồ sơ yếu, dùng để kiểm tra tầng chặn cứng có kích hoạt đúng không. */
export const FRAGILE_PROFILE = {
  income: 8_000_000,
  essential: 6_000_000,
  discretionary: 1_500_000,
  liquidAssets: 3_000_000,
  debts: [],
  incomeStability: 'variable',
  goals: [{ name: 'Quỹ dự phòng', target: 36_000_000, saved: 3_000_000, deadlineMonth: 24, allocWeight: 1 }],
};

export const LAPTOP = { price: 25_000_000, downPayment: 5_000_000, months: 12, flatMonthly: 0.01 };
