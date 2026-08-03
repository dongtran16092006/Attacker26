# -*- coding: utf-8 -*-
"""
Sinh các hình minh hoạ trong README.

Dùng cùng bảng màu với ứng dụng để tài liệu và sản phẩm nhìn như một thể.
Chạy lại bằng: python3 tools/make_diagrams.py
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'images')
S = 2  # vẽ ở 2x cho nét trên màn hình mật độ cao

PAPER, SURFACE, SUNKEN = '#faf9f6', '#ffffff', '#f2f0ea'
INK, SOFT, MUTED, LINE = '#16171a', '#43464d', '#6e7078', '#e6e3dc'
SAFE, CAUTION, RISK = '#1b7a4c', '#9a6400', '#ae2e24'

FD = '/usr/share/fonts/truetype/dejavu'
def font(size, weight='regular'):
    name = {'regular': 'DejaVuSans.ttf', 'bold': 'DejaVuSans-Bold.ttf',
            'mono': 'DejaVuSansMono.ttf', 'monob': 'DejaVuSansMono-Bold.ttf'}[weight]
    return ImageFont.truetype(os.path.join(FD, name), size * S)

def canvas(w, h, bg=PAPER):
    im = Image.new('RGB', (w * S, h * S), bg)
    return im, ImageDraw.Draw(im)

def text(d, xy, s, f, fill=INK, anchor='la'):
    d.text((xy[0] * S, xy[1] * S), s, font=f, fill=fill, anchor=anchor)

def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([box[0] * S, box[1] * S, box[2] * S, box[3] * S],
                        radius=r * S, fill=fill, outline=outline, width=width * S)

def line(d, a, b, fill=LINE, width=1):
    d.line([a[0] * S, a[1] * S, b[0] * S, b[1] * S], fill=fill, width=width * S)

def save(im, name):
    path = os.path.abspath(os.path.join(OUT, name))
    im.save(path, optimize=True)
    print('->', os.path.relpath(path))


# ---------------------------------------------------------------- 1. lãi suất
def rate_reveal():
    W, H = 880, 406
    im, d = canvas(W, H)
    f_t, f_b, f_s, f_m, f_mb = font(19, 'bold'), font(12), font(11), font(13, 'mono'), font(16, 'monob')

    text(d, (36, 30), 'Lãi phẳng che đi bao nhiêu phần chi phí vay thật', f_t)
    text(d, (36, 58), 'Khoản vay 20.000.000 đ. Cột nhạt là con số người bán báo, cột đậm là lãi suất thực.', f_b, MUTED)

    rows = [('6 tháng', [(6.0, 10.21), (9.6, 16.27), (12.0, 20.29), (18.0, 30.23)]),
            ('12 tháng', [(6.0, 10.90), (9.6, 17.27), (12.0, 21.46), (18.0, 31.72)]),
            ('24 tháng', [(6.0, 11.13), (9.6, 17.47), (12.0, 21.57), (18.0, 31.46)])]
    labels = ['0,5%/th', '0,8%/th', '1,0%/th', '1,5%/th']

    x0, y0 = 116, 108
    col_w, gap, group_h = 172, 12, 88
    scale = 1.9  # px trên mỗi phần trăm

    for gi, (period, pairs) in enumerate(rows):
        gy = y0 + gi * group_h
        text(d, (x0 - 14, gy + 30), period, f_b, SOFT, anchor='ra')
        for ci, (adv, real) in enumerate(pairs):
            cx = x0 + ci * col_w
            if gi == 0:
                text(d, (cx + 4, gy - 26), labels[ci], f_s, MUTED)
            # cột quảng cáo
            w1 = adv * scale
            rrect(d, (cx, gy + 6, cx + w1, gy + 22), 3, fill=SUNKEN, outline=LINE)
            text(d, (cx + w1 + 7, gy + 8), f'{adv:.1f}'.replace('.', ',') + '%', f_s, MUTED)
            # cột lãi thực
            w2 = real * scale
            rrect(d, (cx, gy + 28, cx + w2, gy + 48), 3, fill=RISK)
            text(d, (cx + w2 + 7, gy + 31), f'{real:.2f}'.replace('.', ',') + '%', f_s, RISK)

    line(d, (36, 348), (W - 36, 348))
    text(d, (36, 364), 'Hệ số chênh lệch giữ nguyên trong khoảng 1,74 đến 1,82 lần ở mọi kỳ hạn và mọi mức lãi phẳng', f_b, SOFT)
    text(d, (36, 382), 'thông dụng, nên đây là đặc điểm hệ thống của cách niêm yết, không phải trường hợp cá biệt.', f_b, SOFT)
    save(im, 'rate-reveal.png')


# ------------------------------------------------------------- 2. kiến trúc
def architecture():
    W, H = 880, 492
    im, d = canvas(W, H)
    f_t, f_h, f_b, f_s = font(19, 'bold'), font(13, 'bold'), font(11), font(10)

    text(d, (36, 28), 'Kiến trúc: engine tách rời hoàn toàn khỏi giao diện', f_t)
    text(d, (36, 56), 'Không máy chủ, không cơ sở dữ liệu, không lệnh gọi mạng nào trong mã nguồn.', f_b, MUTED)

    def block(y, h, title, items, accent=LINE, fill=SURFACE):
        rrect(d, (36, y, W - 36, y + h), 12, fill=SUNKEN, outline=LINE)
        rrect(d, (42, y + 6, W - 42, y + h - 6), 8, fill=fill, outline=accent)
        text(d, (60, y + 18), title, f_h)
        for i, it in enumerate(items):
            text(d, (60, y + 40 + i * 18), it, f_b, SOFT)

    block(88, 78, 'Trình duyệt người dùng', [
        'index.html mở trực tiếp, không cần bước biên dịch',
        'Hồ sơ lưu trong localStorage của chính máy này'])

    block(180, 96, 'Tầng giao diện  ·  src/ui', [
        'Sáu màn hình dựng bằng chuỗi template, nên kiểm thử được trong Node',
        'Biểu đồ SVG tự vẽ  ·  Nền sáng tối  ·  Tôn trọng prefers-reduced-motion',
        'scenarios.js quy dữ liệu người dùng nhập thành các phương án chuẩn hoá'])

    block(294, 142, 'Engine mô phỏng  ·  src/engine', [
        'config.js     tham số mô hình, công bố công khai trên màn hình Giả định',
        'finance.js    trả góp, quy đổi lãi phẳng sang lãi thực, giá trị hiện tại',
        'goals.js      thời điểm đạt mục tiêu  ·  profile.js  chỉ số nền',
        'scoring.js    điểm an toàn và tầng chặn cứng  ·  explain.js  diễn giải',
        'Không phụ thuộc thư viện ngoài. Không biết gì về DOM.'], accent='#c9c5ba')

    text(d, (W // 2, 458), '51 phép kiểm thử tự động  ·  0 phụ thuộc  ·  0 bước build',
         font(12, 'mono'), MUTED, anchor='ma')

    for y in (170, 284):
        text(d, (W // 2, y), '▼', f_s, MUTED, anchor='ma')
    save(im, 'architecture.png')


# ------------------------------------------------------------- 3. luồng engine
def pipeline():
    W, H = 880, 330
    im, d = canvas(W, H)
    f_t, f_h, f_b, f_n = font(19, 'bold'), font(12, 'bold'), font(10), font(15, 'monob')

    text(d, (36, 28), 'Năm lớp xử lý, dùng chung cho cả bốn nhóm quyết định', f_t)
    text(d, (36, 56), 'Mua sắm lớn, trả góp, phân bổ mục tiêu và điều chỉnh tiết kiệm đều quy về cùng một bài toán.', f_b, MUTED)

    steps = [('1', 'Hồ sơ', ['thu nhập, chi phí', 'nợ, tài sản, mục tiêu']),
             ('2', 'Quy đổi', ['phương án thành', 'sự kiện dòng tiền']),
             ('3', 'Mô phỏng', ['tính lại mọi chỉ số', 'theo trục thời gian']),
             ('4', 'Chấm điểm', ['trọng số công khai', 'kèm chặn cứng']),
             ('5', 'Diễn giải', ['sinh cảnh báo', 'theo bộ quy tắc'])]

    gap = 20
    bw = (W - 72 - gap * 4) / 5
    bh = 118
    x = 36
    for i, (n, title, lines) in enumerate(steps):
        y = 100
        rrect(d, (x, y, x + bw, y + bh), 12, fill=SUNKEN, outline=LINE)
        rrect(d, (x + 5, y + 5, x + bw - 5, y + bh - 5), 8, fill=SURFACE, outline=LINE)
        text(d, (x + 18, y + 18), n, f_n, MUTED)
        text(d, (x + 18, y + 44), title, f_h)
        for j, ln in enumerate(lines):
            text(d, (x + 18, y + 66 + j * 15), ln, f_b, MUTED)
        if i < len(steps) - 1:
            text(d, (x + bw + gap / 2, y + bh / 2 - 8), '›', font(20), MUTED, anchor='ma')
        x += bw + gap

    rrect(d, (36, 248, W - 36, 300), 10, fill=SURFACE, outline=LINE)
    text(d, (56, 262), 'Vì bốn nhóm quyết định đồng nhất về cấu trúc toán học, chỉ cần một engine kèm bốn biểu mẫu', f_b, SOFT)
    text(d, (56, 279), 'nhập liệu, thay vì bốn hệ thống riêng. Đây là điều khiến phạm vi MVP trở nên khả thi.', f_b, SOFT)
    save(im, 'engine-pipeline.png')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    rate_reveal(); architecture(); pipeline()
