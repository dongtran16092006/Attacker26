/**
 * Tham số mô hình. Toàn bộ giá trị ở đây là giả định do nhóm đặt, không phải
 * số liệu chính thức. Chúng được công bố nguyên vẹn trên màn hình "Giả định"
 * để người dùng biết kết quả mô phỏng dựa trên cái gì.
 *
 * Quy ước đơn vị toàn hệ thống: tiền = VND, thời gian = tháng, lãi suất nhập
 * theo năm. Không làm tròn trong lúc tính, chỉ làm tròn khi hiển thị.
 */

export const ASSUMPTIONS = {
  savingsApr: 0.05,
  inflationApr: 0.04,
  runwaySafe: 6,
  runwayCaution: 3,
  dtiSafe: 0.3,
  dtiCaution: 0.4,
  dtiHardStop: 0.5,
  runwayHardStop: 1,
  gateScoreCap: 35,
};

/** Nguồn gốc từng tham số. Hiển thị nguyên bảng này trên màn hình Giả định. */
export const ASSUMPTION_NOTES = [
  {
    key: 'savingsApr',
    label: 'Lãi suất tiết kiệm tham chiếu',
    value: '5,0%/năm',
    status: 'unverified',
    note: 'Nhóm tự đặt. Cần thay bằng trung bình lãi suất tiền gửi 12 tháng của 3-5 ngân hàng lớn, ghi rõ ngày tra cứu.',
  },
  {
    key: 'inflationApr',
    label: 'Tỷ lệ lạm phát',
    value: '4,0%/năm',
    status: 'unverified',
    note: 'Nhóm tự đặt. Cần thay bằng chỉ số giá tiêu dùng công bố gần nhất.',
  },
  {
    key: 'runwaySafe',
    label: 'Quỹ dự phòng mức an toàn',
    value: '6 tháng chi phí',
    status: 'convention',
    note: 'Thông lệ quản lý tài chính cá nhân, chưa phải chuẩn mực bắt buộc tại Việt Nam.',
  },
  {
    key: 'runwayCaution',
    label: 'Quỹ dự phòng mức thận trọng',
    value: '3 tháng chi phí',
    status: 'convention',
    note: 'Cùng nguồn với mức an toàn.',
  },
  {
    key: 'dtiSafe',
    label: 'Ngưỡng nợ an toàn',
    value: '30% thu nhập',
    status: 'unverified',
    note: 'Nhóm tự đặt. Không được trình bày như quy định pháp luật khi chưa đối chiếu chính sách tín dụng công bố của ngân hàng.',
  },
  {
    key: 'dtiCaution',
    label: 'Ngưỡng nợ cảnh báo',
    value: '40% thu nhập',
    status: 'unverified',
    note: 'Cùng nguồn với ngưỡng an toàn.',
  },
  {
    key: 'dtiHardStop',
    label: 'Ngưỡng nợ chặn cứng',
    value: '50% thu nhập',
    status: 'unverified',
    note: 'Cùng nguồn với ngưỡng an toàn.',
  },
  {
    key: 'weights',
    label: 'Trọng số điểm an toàn',
    value: 'Thanh khoản 30% · Nợ 25% · Dòng tiền 20% · Mục tiêu 15% · Ổn định thu nhập 10%',
    status: 'design',
    note: 'Lựa chọn thiết kế của nhóm, phản ánh quan điểm rằng mất khả năng ứng phó sự cố là rủi ro lớn nhất với người 18-25 tuổi. Không dựa trên chuẩn mực được công nhận nào.',
  },
];

/** Đổi lãi suất năm sang lãi suất tháng. */
export const monthlyRate = (apr) => apr / 12;
