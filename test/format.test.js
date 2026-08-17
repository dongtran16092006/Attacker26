import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, runwayMonths, decimal, percent, money } from '../src/ui/format.js';

/**
 * Đọc số người dùng gõ là chỗ dễ sai mà khó thấy: kết quả vẫn ra một con số
 * trông hợp lý, chỉ là sai bậc. Nên khoá lại bằng kiểm thử.
 */

test('tiền kiểu Việt Nam đọc đúng, dấu chấm là ngăn nghìn', () => {
  assert.equal(parseAmount('25.000.000'), 25_000_000);
  assert.equal(parseAmount('12.345.678'), 12_345_678);
  assert.equal(parseAmount('25000000'), 25_000_000);
});

test('dấu phẩy là dấu thập phân kiểu Việt Nam', () => {
  assert.equal(parseAmount('1,5'), 1.5);
  assert.equal(parseAmount('0,5'), 0.5);
  assert.equal(parseAmount('25.000,50'), 25_000.5);
});

test('ô nhập số của trình duyệt trả về dấu chấm thập phân, không được coi là ngăn nghìn', () => {
  // Đây là lỗi thật đã gặp: ô lãi phẳng đặt sẵn 0,8%/tháng đọc ra chuỗi "0.8",
  // bị hiểu thành 8 nên cả nhóm quyết định trả góp tính sai gấp mười lần.
  assert.equal(parseAmount('0.8'), 0.8);
  assert.equal(parseAmount('1.5'), 1.5);
  assert.equal(parseAmount('2.75'), 2.75);
  assert.equal(parseAmount('-3.5'), -3.5);
});

test('chuỗi rỗng và chuỗi rác trả về 0 chứ không trả về NaN', () => {
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('abc'), 0);
  assert.equal(parseAmount(Number.NaN), 0);
  assert.equal(parseAmount(1234), 1234);
});

test('quỹ dự phòng vô hạn không in ra chữ tiếng Anh', () => {
  // Xảy ra khi hồ sơ chưa khai chi phí thiết yếu nào, mẫu số bằng 0.
  const text = runwayMonths(Number.POSITIVE_INFINITY);
  assert.ok(!text.includes('Infinity'), 'lọt chữ Infinity vào giao diện tiếng Việt');
  assert.equal(runwayMonths(3.85), '3,9 tháng');
});

test('số hiển thị dùng dấu phẩy thập phân', () => {
  assert.equal(decimal(21.4589, 2), '21,46');
  assert.equal(percent(0.2146, 2), '21,46%');
  assert.equal(money(25_000_000), '25.000.000 đ');
});
