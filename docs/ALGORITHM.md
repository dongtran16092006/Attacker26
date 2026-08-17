# Đặc tả thuật toán

Mọi con số trong tài liệu này đều do chương trình sinh ra và được khoá lại bằng
phép kiểm thử trong `test/`. Nếu bạn sửa công thức mà bộ kiểm thử vẫn xanh, hãy
kiểm tra lại xem phép kiểm thử có đủ chặt không.

## Quy ước

- Tiền tính bằng đồng Việt Nam. Không làm tròn trong lúc tính, chỉ làm tròn khi hiển thị.
- Thời gian tính bằng tháng. Lãi suất nhập theo năm, quy về tháng bằng cách chia 12.
- Thời điểm `t = 0` là hiện tại, `t = 1` là cuối tháng thứ nhất.

## 1. Chỉ số nền

```
tổngTrảNợ      = Σ debts[i].monthlyPayment
chiTốiThiểu    = essential + tổngTrảNợ
dòngTiềnDư     = income − essential − discretionary − tổngTrảNợ
tỷLệTiếtKiệm   = dòngTiềnDư / income
tỷLệNợ         = tổngTrảNợ / income
quỹDựPhòng     = liquidAssets / chiTốiThiểu     (đơn vị: tháng)
```

Chi phí tối thiểu cố ý **không** gồm chi tiêu linh hoạt. Quỹ dự phòng đo khả năng
cầm cự khi mất thu nhập, mà trong tình huống đó người ta cắt ngay khoản linh hoạt
nhưng vẫn phải trả tiền nhà, tiền ăn và tiền nợ. Đưa nó vào mẫu số sẽ làm mọi
phương án bị đánh giá bi quan hơn thực tế.

## 2. Trả góp

### Lãi phẳng, cách thị trường niêm yết

Lãi tính trên toàn bộ dư nợ gốc ban đầu suốt kỳ hạn, dù người vay đã trả dần gốc.

```
trảHằngTháng = P / N + P × r_phẳng
```

### Dư nợ giảm dần, cách tính đúng bản chất

```
i = APR / 12
trảHằngTháng = P × i × (1+i)^N / ((1+i)^N − 1)
```

### Quy đổi sang lãi suất thực

Lãi suất thực là mức lãi làm cho giá trị hiện tại của dòng tiền hoàn trả bằng
đúng số tiền vay. Không có công thức đóng.

```
Tìm i sao cho   P = Σ (t = 1..N)  M / (1+i)^t
lãiSuấtThực = i × 12
```

Giải bằng chia đôi khoảng trên `[1e-9, 5]`, 300 vòng hoặc tới khi khoảng hẹp hơn
`1e-12`. Chọn chia đôi thay vì Newton vì nó luôn hội tụ và không phụ thuộc điểm
khởi tạo, còn tốc độ thì không thành vấn đề ở quy mô này.

**Cách tự kiểm tra:** đưa lãi suất thực vừa tính vào công thức dư nợ giảm dần,
phải ra lại đúng khoản trả ban đầu, sai lệch dưới `1e-4`.

### Bảng tra cứu, khoản vay 20.000.000 đ

| Kỳ hạn | 0,5%/th | 0,8%/th | 1,0%/th | 1,5%/th |
|---|---|---|---|---|
| 6 tháng | 10,21% | 16,27% | 20,29% | 30,23% |
| 12 tháng | 10,90% | 17,27% | **21,46%** | 31,72% |
| 18 tháng | 11,08% | 17,47% | 21,64% | 31,76% |
| 24 tháng | 11,13% | 17,47% | 21,57% | 31,46% |
| *Người mua tưởng là* | *6,0%* | *9,6%* | *12,0%* | *18,0%* |
| **Hệ số chênh lệch** | 1,82x | 1,80x | **1,79x** | 1,76x |

Hệ số ổn định quanh 1,74 đến 1,82 lần, nên đây là đặc điểm hệ thống của cách
niêm yết lãi suất phẳng chứ không phải trường hợp cá biệt của một gói vay nào.

## 3. Giá trị hiện tại

```
GTHT = upfront
     + Σ (t = 1..recurringMonths)  recurring / (1+d)^t
     + delayed / (1+d)^delayMonths

  với d = lãiSuấtTiếtKiệm / 12    (lãi suất cơ hội)
```

Một triệu phải trả sau 12 tháng nhẹ hơn một triệu phải trả hôm nay, vì trong 12
tháng đó tiền vẫn có thể sinh lời. Tổng tiền chi không phản ánh điều này, giá trị
hiện tại thì có. Cả hai được hiển thị song song.

## 4. Thời điểm đạt mục tiêu

Suy ra từ đẳng thức giá trị tương lai của dòng tiền đều có gốc ban đầu:

```
target = saved × (1+r)^n + monthly × ((1+r)^n − 1) / r
```

Giải ra `n`:

```
n = ⌈ ln((target×r + monthly) / (saved×r + monthly)) / ln(1+r) ⌉
```

Trường hợp biên: `saved ≥ target` trả về 0, `monthly ≤ 0` trả về vô cực, `r = 0`
rơi về phép chia đơn giản.

Kiểm chứng với mục tiêu 20 triệu, đã có 2 triệu, lãi 5% một năm:

| Góp mỗi tháng | 500.000 | 1.000.000 | 1.400.000 | 2.000.000 | 3.000.000 |
|---|---|---|---|---|---|
| Số tháng cần | 34 | 18 | 13 | 9 | 6 |

## 5. Điểm an toàn tài chính

Thang 0 đến 100, càng cao càng an toàn. Năm thành phần, mỗi thành phần chuẩn hoá
bằng nội suy tuyến tính từng đoạn.

| Thành phần | Trọng số | Căn cứ đo |
|---|---|---|
| Thanh khoản | 30% | số tháng quỹ dự phòng sau quyết định |
| Gánh nặng nợ | 25% | tỷ lệ nghĩa vụ nợ trên thu nhập |
| Đệm dòng tiền | 20% | dòng tiền dư còn lại chia cho thu nhập |
| Ảnh hưởng mục tiêu | 15% | tỷ lệ mục tiêu bị trễ hạn |
| Ổn định thu nhập | 10% | người dùng tự khai |

### Đường chuẩn hoá

```
thanhKhoản:   (0 tháng → 0)  (1 → 20)  (3 → 55)  (6 → 85)  (12 → 100)
nợ:           (0% → 100)  (30% → 80)  (40% → 45)  (50% → 15)  (60% → 0)
đệmDòngTiền:  (−10% → 0)  (0% → 25)  (10% → 55)  (20% → 80)  (30% → 100)
mụcTiêu:      100 × (1 − sốMụcTiêuTrễHạn / tổngSốMụcTiêu)
ổnĐịnh:       85 nếu ổn định, 50 nếu biến động
```

### Phân mức

| Điểm | Mức |
|---|---|
| ≥ 70 | An toàn |
| 45 đến 69 | Cần thận trọng |
| < 45 | Rủi ro cao |

**Bộ trọng số này do nhóm đặt ra.** Nó không dựa trên chuẩn mực được công nhận
nào, và được công bố nguyên vẹn trên màn hình Giả định trong ứng dụng.

## 6. Tầng chặn cứng

Áp sau khi chấm điểm. Vi phạm bất kỳ ràng buộc nào thì điểm bị hạ trần xuống 35
và mức xếp loại bị ghi đè thành "Không khuyến nghị", bất kể điểm gốc bao nhiêu.

| Mã | Điều kiện |
|---|---|
| `NEGATIVE_CASHFLOW` | dòng tiền dư sau quyết định < 0 |
| `LIQUIDITY_DRAINED` | quỹ dự phòng sau quyết định < 1 tháng |
| `DEBT_OVER_LIMIT` | tỷ lệ nợ sau quyết định > 50% |

Tầng này tồn tại vì điểm trọng số có thể bị các thành phần phụ kéo lên. Trong ví
dụ kiểm chứng, phương án trả thẳng đạt điểm gốc 60,7 dù quỹ dự phòng về 0, vì nó
không phát sinh nợ và không ảnh hưởng mục tiêu. Không có tầng chặn cứng thì engine
sẽ khuyên sai đúng vào tình huống nguy hiểm nhất.

## 7. Bộ kiểm chứng chuẩn

Hồ sơ: thu nhập 12.000.000, chi thiết yếu 6.500.000, chi linh hoạt 2.000.000,
tài sản thanh khoản 25.000.000, không nợ, thu nhập ổn định. Hai mục tiêu: quỹ dự
phòng 39 triệu đã có 25 triệu hạn 18 tháng tỷ trọng 0,6; học chứng chỉ 20 triệu
đã có 2 triệu hạn 12 tháng tỷ trọng 0,4.

Chỉ số nền phải ra: dòng tiền dư 3.500.000, tỷ lệ tiết kiệm 29,17%, quỹ dự phòng
3,85 tháng, tỷ lệ nợ 0%.

Quyết định: mua thiết bị 25.000.000, trả trước 5.000.000, kỳ hạn 12 tháng, lãi
phẳng 1%/tháng, phương án trì hoãn 4 tháng.

| Hạng | Phương án | Tổng chi | Giá trị hiện tại | Quỹ DP | Tỷ lệ nợ | Điểm | Mức |
|---|---|---|---|---|---|---|---|
| 1 | Trì hoãn 4 tháng | 25.335.004 | 24.917.116 | 2,18 | 0,0% | 72,9 | An toàn |
| 2 | Trả góp 12 tháng | 27.400.000 | 26.804.948 | 2,39 | 15,56% | 64,5 | Cần thận trọng |
| 3 | Trả thẳng toàn bộ | 25.000.000 | 25.000.000 | 0,00 | 0,0% | 35,0 | Không khuyến nghị |

Lãi suất thực của phương án 2 phải ra đúng 21,46%/năm.

## 8. Tham số mô hình

| Tham số | Giá trị | Tình trạng |
|---|---|---|
| Lãi suất tiết kiệm tham chiếu | 5,0%/năm | nhóm tự đặt, chưa xác minh |
| Tỷ lệ lạm phát | 4,0%/năm | nhóm tự đặt, chưa xác minh |
| Quỹ dự phòng an toàn | 6 tháng | thông lệ quốc tế |
| Quỹ dự phòng thận trọng | 3 tháng | thông lệ quốc tế |
| Ngưỡng nợ an toàn | 30% | nhóm tự đặt, chưa xác minh |
| Ngưỡng nợ cảnh báo | 40% | nhóm tự đặt, chưa xác minh |
| Ngưỡng nợ chặn cứng | 50% | nhóm tự đặt, chưa xác minh |
| Trần điểm khi vi phạm chặn cứng | 35 | lựa chọn thiết kế |

Các tham số ghi "nhóm tự đặt, chưa xác minh" cần được thay bằng số liệu có nguồn
trước khi sản phẩm ra khỏi giai đoạn kiểm chứng. Chúng được đánh dấu đúng như vậy
trong `src/engine/config.js` và hiển thị nguyên trạng cho người dùng.
