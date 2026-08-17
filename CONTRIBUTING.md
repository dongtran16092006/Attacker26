# Đóng góp

## Chạy dự án

```bash
npm start     # http://localhost:5173
npm test      # 57 phép kiểm thử
```

Cần Node 20 trở lên. Không cài đặt gì thêm, dự án không có dependency.

## Quy tắc bắt buộc

**Engine không được biết gì về giao diện.** Không có tệp nào trong `src/engine`
được nhập từ `src/ui` hay đụng tới `document`, `window`, `localStorage`.

**Mọi thay đổi công thức phải kèm phép kiểm thử.** Nếu bạn sửa `finance.js`,
`goals.js` hay `scoring.js` mà bộ kiểm thử vẫn xanh nguyên, tức là phép kiểm thử
chưa đủ chặt. Hãy bổ sung trước khi gửi.

**Số liệu trong tài liệu phải khớp chương trình.** Bảng trong `docs/ALGORITHM.md`
được khoá bằng phép kiểm thử. Sửa một chỗ thì sửa cả hai.

**Thoát ký tự mọi dữ liệu người dùng.** Bất kỳ chuỗi nào do người dùng nhập, khi
ghép vào HTML, phải đi qua `escapeHtml`. Đã từng có lỗi thật ở chú giải biểu đồ.

**Tham số mô hình mới phải khai báo nguồn gốc.** Thêm vào `ASSUMPTION_NOTES`
trong `config.js` kèm trạng thái xác minh trung thực. Nếu bạn tự đặt con số đó
thì ghi rõ là tự đặt.

## Phong cách

- Bình luận giải thích **vì sao**, không giải thích **cái gì**. Nếu phải viết
  bình luận để giải thích đoạn mã làm gì, thường là nên đặt lại tên biến.
- Tên hàm và biến bằng tiếng Anh, bình luận bằng tiếng Việt.
- Không thêm dependency. Nếu bạn nghĩ thật sự cần một thư viện, hãy mở issue bàn
  trước, vì đó là quyết định kiến trúc chứ không phải chi tiết cài đặt.

## Sinh lại tài liệu

```bash
node tools/build_preview.js     # dựng lại docs/preview.html từ mã giao diện
python3 tools/make_diagrams.py  # sinh lại hình trong docs/images (cần Pillow)
```
