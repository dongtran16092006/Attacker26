/**
 * Ba hồ sơ mẫu. Lý do tồn tại: người xem lần đầu sẽ không ngồi nhập 12 ô dữ
 * liệu. Họ cần thấy kết quả trong mười giây đầu, nếu không họ rời đi.
 */

export const PRESETS = [
  {
    id: 'sinh-vien',
    name: 'Sinh viên năm cuối',
    summary: 'Làm thêm 6 triệu, ở ghép, chưa có nợ',
    profile: {
      income: 6_000_000, essential: 3_600_000, discretionary: 1_200_000,
      liquidAssets: 8_000_000, debts: [], incomeStability: 'variable',
      goals: [
        { name: 'Quỹ dự phòng', target: 21_600_000, saved: 8_000_000, deadlineMonth: 24, allocWeight: 0.6 },
        { name: 'Khoá học tiếng Anh', target: 12_000_000, saved: 1_000_000, deadlineMonth: 10, allocWeight: 0.4 },
      ],
    },
  },
  {
    id: 'moi-di-lam',
    name: 'Người mới đi làm',
    summary: 'Thu nhập 12 triệu tại TP.HCM, chưa có nợ',
    profile: {
      income: 12_000_000, essential: 6_500_000, discretionary: 2_000_000,
      liquidAssets: 25_000_000, debts: [], incomeStability: 'stable',
      goals: [
        { name: 'Quỹ dự phòng 6 tháng', target: 39_000_000, saved: 25_000_000, deadlineMonth: 18, allocWeight: 0.6 },
        { name: 'Học chứng chỉ nghề', target: 20_000_000, saved: 2_000_000, deadlineMonth: 12, allocWeight: 0.4 },
      ],
    },
  },
  {
    id: 'di-lam-hai-nam',
    name: 'Đi làm hai năm, đang trả nợ',
    summary: 'Thu nhập 18 triệu, còn khoản vay xe 3,2 triệu mỗi tháng',
    profile: {
      income: 18_000_000, essential: 8_500_000, discretionary: 3_000_000,
      liquidAssets: 30_000_000,
      debts: [{ name: 'Vay mua xe', monthlyPayment: 3_200_000, remainingMonths: 20 }],
      incomeStability: 'stable',
      goals: [
        { name: 'Quỹ dự phòng', target: 70_200_000, saved: 30_000_000, deadlineMonth: 24, allocWeight: 0.5 },
        { name: 'Tiền đặt cọc thuê nhà riêng', target: 40_000_000, saved: 4_000_000, deadlineMonth: 15, allocWeight: 0.5 },
      ],
    },
  },
];

/** Bốn nhóm quyết định trong phạm vi MVP. */
export const DECISION_KINDS = [
  {
    id: 'purchase',
    name: 'Mua sắm giá trị lớn',
    blurb: 'So sánh trả thẳng, trả góp và trì hoãn cho một khoản chi lớn.',
    example: 'Mua laptop 25 triệu',
  },
  {
    id: 'installment',
    name: 'Chọn gói trả góp',
    blurb: 'Đặt cạnh nhau nhiều gói trả góp và phơi bày lãi suất thực của từng gói.',
    example: 'Gói 6 tháng so với gói 12 tháng',
  },
  {
    id: 'allocation',
    name: 'Phân bổ giữa các mục tiêu',
    blurb: 'Thử các cách chia dòng tiền dư và xem mục tiêu nào về đích sớm hơn.',
    example: 'Ưu tiên quỹ dự phòng hay ưu tiên đi học',
  },
  {
    id: 'savings',
    name: 'Điều chỉnh kế hoạch tiết kiệm',
    blurb: 'Xem việc tăng hoặc giảm mức tiết kiệm dịch chuyển các mục tiêu bao xa.',
    example: 'Tiết kiệm thêm 1 triệu mỗi tháng',
  },
];
