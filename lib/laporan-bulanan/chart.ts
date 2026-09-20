import type { Tren } from "./types";

/**
 * Menggambar grafik tren ke PNG memakai canvas 2D.
 * Di browser dipakai `pabrikKanvasBrowser` (font asli perangkat, tanpa batas ukuran Vercel);
 * di Node cukup berikan pabrik lain (mis. @napi-rs/canvas).
 */
export interface KanvasLike {
  ctx: CanvasRenderingContext2D;
  keBytes(): Promise<Uint8Array>;
}
export type PabrikKanvas = (lebar: number, tinggi: number) => KanvasLike;

export const pabrikKanvasBrowser: PabrikKanvas = (lebar, tinggi) => {
  const c = document.createElement("canvas");
  c.width = lebar;
  c.height = tinggi;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  return {
    ctx,
    keBytes: () =>
      new Promise<Uint8Array>((selesai, tolak) => {
        c.toBlob(async (b) => (b ? selesai(new Uint8Array(await b.arrayBuffer())) : tolak(new Error("Gagal membuat gambar grafik."))), "image/png");
      }),
  };
};

const PALET = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B"];
const INK = "#10293A";
const SOFT = "#4A6472";
const GARIS = "#D3DDE0";

function skalaBagus(maks: number): { maks: number; langkah: number } {
  if (!(maks > 0)) return { maks: 5, langkah: 1 };
  const kasar = maks / 5;
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const f = kasar / pangkat;
  const langkah = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pangkat;
  return { maks: Math.ceil(maks / langkah) * langkah, langkah };
}

export interface OpsiGambar {
  lebar?: number;
  tinggi?: number;
  font?: string;
}

export async function gambarTren(t: Tren, pabrik: PabrikKanvas, opsi: OpsiGambar = {}): Promise<{ png: Uint8Array; lebar: number; tinggi: number }> {
  const W = opsi.lebar ?? 1160;
  const H = opsi.tinggi ?? 560;
  const font = opsi.font ?? "Arial, Helvetica, sans-serif";
  const { ctx, keBytes } = pabrik(W, H);
  const banyakSeri = t.seri.length;
  const n = t.label.length;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const kiri = 110;
  const kanan = 30;
  const atas = t.satuan ? 62 : 30;
  const bawah = banyakSeri > 1 ? 120 : 70;
  const pw = W - kiri - kanan;
  const ph = H - atas - bawah;

  const semua = t.seri.flatMap((s) => s.nilai).filter((v): v is number => v != null && Number.isFinite(v));
  const { maks, langkah } = t.sumbuY?.maks != null ? { maks: t.sumbuY.maks, langkah: t.sumbuY.maks / 5 } : skalaBagus(Math.max(0, ...semua));
  const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: langkah < 1 ? 2 : 0 });
  const yDari = (v: number) => atas + ph - (v / maks) * ph;

  if (t.satuan) {
    ctx.fillStyle = SOFT;
    ctx.font = `22px ${font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(t.satuan, 6, 8);
  }

  // Garis bantu dan label sumbu Y
  ctx.lineWidth = 1.5;
  ctx.font = `21px ${font}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let v = 0; v <= maks + langkah / 2; v += langkah) {
    const y = yDari(v);
    ctx.strokeStyle = GARIS;
    ctx.beginPath();
    ctx.moveTo(kiri, y);
    ctx.lineTo(kiri + pw, y);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.fillText(fmt.format(v), kiri - 12, y);
  }

  // Label sumbu X
  const lebarGrup = pw / Math.max(1, n);
  ctx.fillStyle = SOFT;
  ctx.font = `21px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  t.label.forEach((l, i) => ctx.fillText(l, kiri + lebarGrup * (i + 0.5), atas + ph + 12));

  const warna = (i: number) => `#${t.seri[i].warna ?? PALET[i % PALET.length]}`;

  if (t.jenis === "batang") {
    const lebarBatang = (lebarGrup * 0.72) / banyakSeri;
    const mulaiGrup = (lebarGrup - lebarBatang * banyakSeri) / 2;
    t.seri.forEach((se, si) => {
      se.nilai.forEach((v, i) => {
        if (v == null || !Number.isFinite(v)) return;
        const x = kiri + lebarGrup * i + mulaiGrup + lebarBatang * si;
        const y = yDari(v);
        ctx.fillStyle = warna(si);
        ctx.fillRect(x, y, lebarBatang, atas + ph - y);
        if (banyakSeri === 1 && n <= 12) {
          ctx.fillStyle = INK;
          ctx.font = `bold 20px ${font}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(fmt.format(v), x + lebarBatang / 2, y - 5);
        }
      });
    });
  } else {
    t.seri.forEach((se, si) => {
      ctx.strokeStyle = warna(si);
      ctx.fillStyle = warna(si);
      ctx.lineWidth = 4;
      let sedangMenggambar = false;
      ctx.beginPath();
      se.nilai.forEach((v, i) => {
        if (v == null || !Number.isFinite(v)) {
          sedangMenggambar = false;
          return;
        }
        const x = kiri + lebarGrup * (i + 0.5);
        const y = yDari(v);
        if (!sedangMenggambar) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        sedangMenggambar = true;
      });
      ctx.stroke();
      se.nilai.forEach((v, i) => {
        if (v == null || !Number.isFinite(v)) return;
        ctx.beginPath();
        ctx.arc(kiri + lebarGrup * (i + 0.5), yDari(v), 6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // Sumbu dasar
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(kiri, atas + ph);
  ctx.lineTo(kiri + pw, atas + ph);
  ctx.stroke();

  // Legenda
  if (banyakSeri > 1) {
    ctx.font = `21px ${font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const lebarItem = t.seri.map((s) => ctx.measureText(s.nama).width + 46);
    let x = kiri + Math.max(0, (pw - lebarItem.reduce((a, b) => a + b, 0)) / 2);
    const y = H - 30;
    t.seri.forEach((s, i) => {
      ctx.fillStyle = warna(i);
      ctx.fillRect(x, y - 9, 20, 18);
      ctx.fillStyle = INK;
      ctx.fillText(s.nama, x + 28, y);
      x += lebarItem[i];
    });
  }

  return { png: await keBytes(), lebar: W, tinggi: H };
}
