# Kiến trúc

Tài liệu này giải thích các quyết định kỹ thuật và lý do đằng sau chúng. Nếu bạn
chỉ cần biết cách chạy dự án, đọc [README](../README.md).

## Nguyên tắc chi phối

Engine tài chính không được biết gì về giao diện, và giao diện không được chứa
phép tính tài chính nào. Ranh giới này là thứ giữ cho dự án kiểm thử được và cho
phép mang engine sang nền tảng khác về sau mà không viết lại.

## Ba quyết định lớn

### 1. Không phụ thuộc thư viện ngoài

Dự án có 0 dependency, kể cả dev dependency. Bộ kiểm thử dùng `node:test` có sẵn
trong Node 20 trở lên.

Lý do: đây là công cụ tài chính chạy trên máy người dùng. Mỗi thư viện kéo theo
là một bề mặt rủi ro chuỗi cung ứng, và với thứ đọc số liệu thu nhập của người
khác thì cái giá đó không đáng.

Cái phải đánh đổi: biểu đồ phải tự vẽ. Hoá ra chỉ tốn khoảng 190 dòng trong
`src/ui/components/chart.js` vì cả ứng dụng chỉ cần đúng một loại đồ thị đường.

Biểu đồ chia đôi có chủ đích: phần hình học nằm trong SVG với hệ toạ độ vuông
1000x1000 kéo giãn cho vừa khung, còn toàn bộ chữ và chấm dựng bằng HTML đặt
chồng lên theo toạ độ phần trăm. Lý do là SVG co theo bề ngang khung chứa, nên
trên điện thoại cả hình bị thu còn khoảng 38% và chữ 11px hiển thị ra chưa tới
7px. Tách chữ ra HTML thì nó giữ đúng cỡ thật ở mọi bề ngang màn hình, còn nét
vẽ giữ nguyên độ dày nhờ `vector-effect="non-scaling-stroke"`.

### 2. Không máy chủ, không cơ sở dữ liệu

Không có lệnh gọi mạng nào trong mã nguồn. Hồ sơ tài chính nằm trong
`localStorage` của chính trình duyệt đó và không đi đâu cả.

Lý do: thu nhập, nợ và tài sản là dữ liệu cá nhân nhạy cảm. Ở giai đoạn kiểm
chứng sản phẩm, việc thu thập chúng lên máy chủ chưa mang lại lợi ích nào cho
người dùng mà lại tạo ra nghĩa vụ bảo vệ dữ liệu ngay lập tức. Không thu thập là
lựa chọn đúng cho đến khi có lý do rõ ràng để làm khác đi.

Cái phải đánh đổi: không đồng bộ giữa các thiết bị, và xoá dữ liệu trình duyệt là
mất hồ sơ. Cả hai đều chấp nhận được ở giai đoạn này và đều được nói rõ trong sản phẩm.

### 3. Giao diện dựng bằng chuỗi template

Mỗi hàm dựng màn hình là hàm thuần: nhận trạng thái, trả về chuỗi HTML. Ứng dụng
gán chuỗi đó vào `innerHTML` và bắt sự kiện bằng uỷ quyền ở gốc.

Lý do: cách này khiến tầng giao diện kiểm thử được ngay trong Node mà không cần
`jsdom` hay trình duyệt không đầu. `test/render.test.js` chạy đúng các hàm mà
ứng dụng chạy, kiểm tra cân bằng thẻ, kiểm tra không lọt `undefined`, và kiểm tra
chuỗi độc hại bị thoát ký tự.

Cái phải đánh đổi: render lại toàn bộ màn hình mỗi lần trạng thái đổi. Với sáu
màn hình tĩnh thì chi phí đó không đáng kể. Nếu sau này có danh sách dài hoặc
cập nhật liên tục thì đây là chỗ đầu tiên cần đổi.

## Sơ đồ phụ thuộc

```
index.html
  └── src/app.js                điều phối, bắt sự kiện, chuyển màn hình
        ├── src/ui/state.js     trạng thái + localStorage
        ├── src/ui/scenarios.js dựng phương án từ dữ liệu nhập  (thuần, kiểm thử được)
        ├── src/ui/views/*.js   sáu màn hình                    (thuần, kiểm thử được)
        │     └── src/ui/components/chart.js
        └── src/engine/index.js
              ├── config.js     tham số mô hình
              ├── profile.js    chỉ số nền, kiểm tra hợp lệ
              ├── finance.js    trả góp, lãi thực, giá trị hiện tại
              ├── goals.js      thời điểm đạt mục tiêu
              ├── scoring.js    điểm an toàn + chặn cứng
              └── explain.js    sinh câu diễn giải
```

Mũi tên chỉ đi một chiều. `src/engine` không nhập gì từ `src/ui`.

## Vì sao bốn nhóm quyết định dùng chung một engine

Đây là nhận định làm cho phạm vi dự án khả thi.

Mua sắm giá trị lớn, chọn gói trả góp, phân bổ giữa các mục tiêu và điều chỉnh
tiết kiệm khác nhau về bối cảnh nhưng giống hệt nhau về cấu trúc toán học. Tất cả
đều hỏi cùng một câu: một sự kiện dòng tiền tác động thế nào lên hồ sơ hiện tại
và lên thời điểm đạt mục tiêu.

Mọi phương án của cả bốn nhóm đều mô tả được bằng đúng sáu trường:

| Trường | Ý nghĩa |
|---|---|
| `upfront` | chi ngay tại thời điểm hiện tại |
| `recurring` | chi đều mỗi tháng |
| `recurringMonths` | số tháng phải trả khoản định kỳ |
| `delayMonths` | số tháng trì hoãn trước khi chi |
| `delayed` | số tiền chi sau khi trì hoãn |
| `surplusDelta` | thay đổi dòng tiền dư |

Nhóm phân bổ mục tiêu là ngoại lệ duy nhất: thay đổi tỷ trọng là thay đổi hồ sơ
chứ không phải thay đổi sự kiện. Vì vậy `rankScenarios` nhận từng cặp hồ sơ và sự
kiện, còn `rank` chỉ là lớp bọc mỏng cho trường hợp mọi phương án dùng chung một
hồ sơ.

## Kiểm thử

57 phép kiểm thử, chia theo tầng:

| Tệp | Bao phủ |
|---|---|
| `test/finance.test.js` | toán trả góp, quy đổi lãi suất thực, giá trị hiện tại |
| `test/goals.test.js` | thời điểm đạt mục tiêu, chuẩn hoá tỷ trọng |
| `test/engine.test.js` | mô phỏng, chấm điểm, chặn cứng, xếp hạng |
| `test/scenarios.test.js` | dựng phương án cho cả bốn nhóm quyết định |
| `test/render.test.js` | sáu màn hình dựng ra HTML hợp lệ và an toàn |
| `test/format.test.js` | đọc số người dùng gõ, định dạng hiển thị tiếng Việt |

Bốn loại kiểm thử đáng chú ý vì chúng bắt được lỗi mà kiểm tra từng giá trị không bắt được:

- **Kiểm tra ngược.** Lấy lãi suất thực vừa tính, đưa vào công thức dư nợ giảm
  dần, phải ra lại đúng khoản trả ban đầu.
- **Tính đơn điệu.** Tăng dần khoản trả hằng tháng thì điểm an toàn phải giảm
  dần, không được có chỗ tăng ngược.
- **Thoát ký tự.** Nhét chuỗi `<img src=x onerror=...>` vào tên mục tiêu và kiểm
  tra nó không lọt nguyên vào HTML. Phép kiểm thử này từng bắt được một lỗi thật
  ở chú giải biểu đồ.
- **Đọc số người dùng gõ.** Ô `<input type="number">` của trình duyệt luôn trả về
  dấu chấm thập phân, trong khi người Việt gõ tiền dùng dấu chấm ngăn nghìn. Hai
  quy ước này từng va nhau: chuỗi `"0.8"` bị hiểu thành `8`, làm nhóm quyết định
  trả góp tính sai gấp mười lần mà kết quả vẫn trông hợp lý. Đây là loại lỗi chỉ
  lộ ra khi có phép kiểm thử khoá đúng từng chuỗi đầu vào.

## Hệ thiết kế

Nằm trong `assets/styles.css`, định nghĩa bằng biến CSS.

**Màu chỉ mang nghĩa trạng thái.** Xanh, vàng, đỏ dành riêng cho mức an toàn tài
chính. Mọi thành phần tương tác dùng sắc mực trung tính. Nhờ vậy khi người dùng
thấy màu trên màn hình, họ biết đó là tín hiệu chứ không phải trang trí.

**Bo góc theo ba mức**: vỏ ngoài 20px, lõi trong 14px, ô điều khiển 10px. Thẻ
quan trọng dùng cấu trúc lồng vỏ ngoài mềm bọc lõi trong sắc nét.

**Chữ số dùng phông đẳng khoảng và `tabular-nums`** để các cột số thẳng hàng.

**Phông chữ Be Vietnam Pro**, chọn vì được thiết kế riêng cho dấu tiếng Việt.
Tải qua Google Fonts kèm chuỗi phông hệ thống dự phòng, nên mất mạng vẫn đọc được.

**Chuyển động chỉ ở nơi nó truyền tải thông tin.** Mỗi hiệu ứng trong sản phẩm
đều nói được một câu tại sao nó tồn tại:

| Chuyển động | Nó nói điều gì |
|---|---|
| Thứ tự xếp hạng hiện dần theo độ trễ | thứ tự đọc, phương án nào nên nhìn trước |
| Biểu đồ hiện dần từ trái sang phải | trục hoành là thời gian, hướng chuyển động trùng hướng dữ liệu chảy |
| Vạch màu bên trái thẻ chỉ số mọc xuống | đèn giao thông, thấy được từ xa mà không cần đọc chữ số |
| Lãi suất thực và điểm an toàn chạy từ 0 lên | đây là kết quả được tính ra, không phải chữ in sẵn |
| Vạch tiến trình biểu mẫu trượt sang | còn mấy bước nữa thì xong |
| Nút lún xuống khi bấm | máy đã nhận thao tác |
| Đổi nền sáng tối hoà hai ảnh | cùng một trang, chỉ đổi lớp áo, mắt không mất chỗ đang đọc |

Toàn bộ chỉ dùng `transform` và `opacity`, không có vòng lặp vô hạn nào, và tắt
hết khi người dùng bật `prefers-reduced-motion`.

Lớp chuyển động nằm riêng trong `src/ui/motion.js`, chạy sau khi màn hình đã
dựng xong. Đây không phải chuyện sắp xếp cho gọn: các hàm dựng giao diện phải
giữ nguyên tính thuần để bộ kiểm thử chạy được trong Node. Hệ quả kèm theo là
HTML dựng ra đã chứa sẵn con số cuối cùng, nên nếu phần chuyển động không chạy
được thì sản phẩm vẫn hiển thị đúng số. Chuyển động là lớp phủ, không phải điều
kiện. Trang `docs/preview.html` là bằng chứng: nó chỉ có HTML và CSS, không chạy
`motion.js`, mà mọi con số vẫn đúng.

## Những chỗ sẽ phải đổi trước

Ghi lại để người tiếp nhận biết đâu là điểm yếu đã biết:

1. **Render lại toàn màn hình** sẽ thành nút thắt nếu thêm danh sách dài.
2. **Chỉ hỗ trợ hai mục tiêu và một khoản nợ** trong biểu mẫu, dù engine không
   giới hạn số lượng.
3. **Chưa có định tuyến theo URL**, nên không chia sẻ được liên kết tới một kết
   quả cụ thể.
4. **Vạch dò trên biểu đồ chỉ đọc bằng chuột và chạm**, chưa đi được bằng bàn
   phím. Người dùng bàn phím hiện đọc số qua bảng số liệu mở ra dưới biểu đồ.
