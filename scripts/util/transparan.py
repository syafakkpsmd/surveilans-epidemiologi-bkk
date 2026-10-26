"""
Membuat logo header transparan.
Pemakaian:  python transparan.py input.png output.png
"""
import sys
from collections import deque
from PIL import Image

INK = (16, 41, 58)

def proses(src, dst, toleransi=40):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[0, 0][:3]

    def mirip(c):
        return all(abs(c[i] - bg[i]) <= toleransi for i in range(3))

    # flood fill dari semua tepi: hanya latar yang tersambung ke tepi yang dihapus
    terbuang = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or terbuang[y][x]:
            continue
        if not mirip(px[x, y][:3]):
            continue
        terbuang[y][x] = True
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    lum_bg = sum(bg) / 3
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if terbuang[y][x]:
                px[x, y] = (0, 0, 0, 0)
                continue
            lum = (r + g + b) / 3
            # teks putih/abu terang diubah ke warna tinta agar terbaca di latar terang
            if max(r, g, b) - min(r, g, b) < 60 and lum > lum_bg + 40:
                alpha = min(1.0, (lum - lum_bg) / (255 - lum_bg))
                px[x, y] = (*INK, int(255 * alpha))
    im.save(dst)

if __name__ == "__main__":
    proses(sys.argv[1], sys.argv[2])