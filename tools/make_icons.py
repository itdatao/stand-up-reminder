#!/usr/bin/env python3
"""生成插件图标（无需第三方依赖，纯标准库输出 PNG）。

用法: python3 tools/make_icons.py
"""
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
SIZES = (16, 32, 48, 128)
SS = 3  # 超采样倍数，用于抗锯齿

GREEN = (34, 197, 94)
BLUE = (14, 165, 233)
WHITE = (255, 255, 255)


def rounded_rect_alpha(x, y, r):
    """圆角矩形内部判定，返回 1(内部) / 0(外部)。"""
    if x < r and y < r:
        return 1.0 if (x - r) ** 2 + (y - r) ** 2 <= r * r else 0.0
    if x > 1 - r and y < r:
        return 1.0 if (x - (1 - r)) ** 2 + (y - r) ** 2 <= r * r else 0.0
    if x < r and y > 1 - r:
        return 1.0 if (x - r) ** 2 + (y - (1 - r)) ** 2 <= r * r else 0.0
    if x > 1 - r and y > 1 - r:
        return 1.0 if (x - (1 - r)) ** 2 + (y - (1 - r)) ** 2 <= r * r else 0.0
    return 1.0


def in_arrow(x, y):
    """白色向上箭头（起身）。"""
    if 0.435 <= x <= 0.565 and 0.42 <= y <= 0.80:
        return True
    top, bottom = 0.20, 0.475
    if top <= y <= bottom:
        t = (y - top) / (bottom - top)
        return abs(x - 0.5) <= 0.225 * t
    return False


def color_at(x, y):
    r = 0.24
    a = rounded_rect_alpha(x, y, r)
    if a <= 0:
        return (0, 0, 0, 0)
    # 对角线渐变
    t = (x + y) / 2.0
    base = tuple(GREEN[i] + (BLUE[i] - GREEN[i]) * t for i in range(3))
    if in_arrow(x, y):
        base = WHITE
    return (base[0], base[1], base[2], 255)


def render(size):
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            tr = tg = tb = ta = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / size
                    y = (py + (sy + 0.5) / SS) / size
                    c = color_at(x, y)
                    a = c[3] / 255.0
                    tr += c[0] * a
                    tg += c[1] * a
                    tb += c[2] * a
                    ta += c[3]
            n = SS * SS
            alpha = ta / n
            if alpha <= 0:
                row += bytes((0, 0, 0, 0))
                continue
            scale = n * (alpha / 255.0)  # 反预乘
            row += bytes((
                min(255, max(0, int(round(tr / scale)))),
                min(255, max(0, int(round(tg / scale)))),
                min(255, max(0, int(round(tb / scale)))),
                min(255, max(0, int(round(alpha)))),
            ))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b''.join(b'\x00' + r for r in rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        rows = render(size)
        path = os.path.join(OUT_DIR, 'icon-%d.png' % size)
        write_png(path, size, rows)
        print('generated', path)


if __name__ == '__main__':
    main()
