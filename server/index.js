import { startServer } from './server.js';
import { startMockBankApi } from './mockBankApi.js';

startServer();

// Bật kèm dịch vụ ngân hàng mô phỏng để `npm run server` demo được ngay bước
// "nhập hồ sơ từ Open API" mà không cần chạy thêm lệnh. Tắt bằng
// DECIFIN_MOCK_BANK=false khi không cần (ví dụ môi trường thật sau này).
if (process.env.DECIFIN_MOCK_BANK !== 'false') {
  startMockBankApi();
}
