/**
 * Sinh câu diễn giải từ bộ quy tắc xác định.
 *
 * Cố ý không dùng mô hình ngôn ngữ ở giai đoạn này vì hai lý do: kết quả phải
 * lặp lại y hệt giữa các lần chạy để người dùng và bên thứ ba kiểm chứng được,
 * và mô hình ngôn ngữ có thể sinh ra con số không tồn tại trong dữ liệu đầu vào.
 * Lớp này tách riêng nên sau này gắn mô hình vào để diễn đạt lại là việc dễ,
 * miễn nó không tham gia tính toán.
 */

import { ASSUMPTIONS } from './config.js';

const SEVERITY = { block: 3, warn: 2, note: 1 };

export function explain(profile, outcome, extras = {}) {
  const messages = [];
  const push = (severity, text) => messages.push({ severity, text });

  const runway = outcome.runwayAfter;
  if (runway < ASSUMPTIONS.runwayHardStop) {
    push('block', `Quỹ dự phòng chỉ còn ${fmtMonths(runway)}, dưới mức tối thiểu để xử lý sự cố.`);
  } else if (runway < ASSUMPTIONS.runwayCaution) {
    push('warn', `Quỹ dự phòng còn ${fmtMonths(runway)}, dưới ngưỡng thận trọng ${ASSUMPTIONS.runwayCaution} tháng.`);
  } else if (runway < ASSUMPTIONS.runwaySafe) {
    push('note', `Quỹ dự phòng còn ${fmtMonths(runway)}, chưa đạt mức an toàn ${ASSUMPTIONS.runwaySafe} tháng.`);
  } else {
    push('note', `Quỹ dự phòng còn ${fmtMonths(runway)}, đạt mức an toàn.`);
  }

  if (outcome.surplusAfter < 0) {
    push('block', `Dòng tiền âm ${fmtMoney(Math.abs(outcome.surplusAfter))} mỗi tháng.`);
  }

  if (outcome.dtiAfter > ASSUMPTIONS.dtiCaution) {
    push('warn', `Nghĩa vụ nợ chiếm ${fmtPercent(outcome.dtiAfter)} thu nhập, vượt ngưỡng tham chiếu ${fmtPercent(ASSUMPTIONS.dtiCaution)}.`);
  } else if (outcome.dtiAfter > ASSUMPTIONS.dtiSafe) {
    push('note', `Nghĩa vụ nợ chiếm ${fmtPercent(outcome.dtiAfter)} thu nhập.`);
  }

  outcome.goals.forEach((goal) => {
    if (!Number.isFinite(goal.etaAfter)) {
      push('warn', `Mục tiêu "${goal.name}" sẽ không đạt được với dòng tiền còn lại.`);
    } else if (goal.delayMonths > 0) {
      const suffix = goal.missesDeadline ? ' và trễ hạn mong muốn' : '';
      push(goal.missesDeadline ? 'warn' : 'note',
        `Mục tiêu "${goal.name}" chậm thêm ${goal.delayMonths} tháng, dự kiến đạt sau ${goal.etaAfter} tháng${suffix}.`);
    }
  });

  if (extras.installment) {
    const { trueApr, advertisedApr, spread } = extras.installment;
    push('warn',
      `Lãi suất thực của gói trả góp là ${fmtPercent(trueApr, 2)}/năm, trong khi mức quảng cáo quy đổi chỉ ${fmtPercent(advertisedApr, 1)}/năm, gấp ${spread.toFixed(2)} lần.`);
  }

  return messages.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]);
}

const fmtMonths = (m) => `${m.toFixed(1)} tháng`;
const fmtPercent = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const fmtMoney = (v) => `${Math.round(v).toLocaleString('vi-VN')} đ`;
