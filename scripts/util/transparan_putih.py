"""
Membuat latar putih pada gambar ornamen menjadi transparan.
Semua piksel putih (termasuk celah putih di dalam bentuk) dihapus; warna lain dipertahankan.

Pemakaian:
  python transparan_putih.py input.png output.png [batas_bawah] [batas_atas] [penguat]

  batas_bawah, batas_atas (default 6 dan 40): rentang jarak dari putih untuk transisi
    transparan -> opak. Untuk ornamen yang warnanya sangat pucat (watermark), pakai 3 dan 18.
  penguat (default 1.0): memperkuat warna. 1.0 = warna asli, 2.0 = dua kali lebih pekat.
    Berguna bila watermark terlalu pucat sehingga tidak terlihat di latar slide.
"""
import sys
from PIL import Image

def proses(src, dst, bawah=6, atas=40, penguat=1.0):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            jarak = max(255 - r, 255 - g, 255 - b)  # 0 = putih murni
            if jarak <= bawah:
                alpha = 0.0
            elif jarak >= atas:
                alpha = 1.0
            else:
                alpha = (jarak - bawah) / (atas - bawah)
            if penguat != 1.0:
                r = max(0, min(255, int(255 - (255 - r) * penguat)))
                g = max(0, min(255, int(255 - (255 - g) * penguat)))
                b = max(0, min(255, int(255 - (255 - b) * penguat)))
            px[x, y] = (r, g, b, int(a * alpha))
    im.save(dst)

if __name__ == "__main__":
    bawah = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    atas = int(sys.argv[4]) if len(sys.argv) > 4 else 40
    penguat = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    proses(sys.argv[1], sys.argv[2], bawah, atas, penguat)