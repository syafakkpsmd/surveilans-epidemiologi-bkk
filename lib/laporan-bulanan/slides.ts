import { labelRentang } from "./periode";
import type { BahanLaporan, DataModul, HasilModul, OpsiPresentasi, Slide, SlideBlok } from "./types";

export const INSTANSI = "Balai Kekarantinaan Kesehatan Kelas I Samarinda";
/** Baris tabel maksimal per slide; tabel bulanan (sampai 12 baris) muat dalam satu slide dengan baris dirapatkan. */
const BARIS_PER_SLIDE = 12;
const MAKS_TEMUAN = 4;

/** Memecah menjadi bagian sama rata (13 baris menjadi 7 + 6, bukan 12 + 1) agar tidak ada slide yatim. */
function pecah<T>(arr: T[], maks: number): T[][] {
  const n = Math.max(1, Math.ceil(arr.length / maks));
  const ukuran = Math.ceil(arr.length / n);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += ukuran) out.push(arr.slice(i, i + ukuran));
  return out;
}

export function potong(s: string, maks: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > maks ? `${t.slice(0, maks - 1).trimEnd()}...` : t;
}

function slideModulOk(d: DataModul, subjudul: string): Slide[] {
  const slides: Slide[] = [];
  const temuan = (d.temuan ?? []).slice(0, MAKS_TEMUAN).map((t) => potong(t, 150));
  const tabelKecil = !d.tren && d.tabel && d.tabel.baris.length <= 6 ? d.tabel : undefined;

  const blok: SlideBlok[] = [];
  if (d.kartu.length > 0) blok.push({ tipe: "statistik", items: d.kartu.slice(0, 4) });

  if (d.tren) {
    const grafik: SlideBlok = { tipe: "grafik", ...d.tren };
    blok.push(temuan.length > 0 ? { tipe: "dua_kolom", kiri: grafik, kanan: { tipe: "poin", items: temuan }, rasioKiri: 0.62 } : grafik);
  } else {
    if (tabelKecil) blok.push({ tipe: "tabel", ...tabelKecil });
    if (temuan.length > 0) blok.push({ tipe: "poin", items: temuan });
  }
  if (blok.length === 0) blok.push({ tipe: "teks", teks: "Tidak ada ringkasan yang dapat ditampilkan." });
  slides.push({ kunci: `modul-${d.kunci}`, tipe: "isi", judul: d.judul, subjudul, blok });

  if (d.tabel && !tabelKecil) {
    const halaman = pecah(d.tabel.baris, BARIS_PER_SLIDE);
    halaman.forEach((baris, i) => {
      slides.push({
        kunci: `modul-${d.kunci}-rincian-${i}`,
        tipe: "isi",
        judul: `${d.judul}: rincian${halaman.length > 1 ? ` (${i + 1} dari ${halaman.length})` : ""}`,
        subjudul,
        blok: [{ tipe: "tabel", kepala: d.tabel!.kepala, baris, kanan: d.tabel!.kanan, lebar: d.tabel!.lebar }],
      });
    });
  }
  return slides;
}

function slideModul(h: HasilModul, subjudul: string, rentang: string): Slide[] {
  if (h.status === "ok") return slideModulOk(h.data, subjudul);
  if (h.status === "kosong") {
    return [
      {
        kunci: `modul-${h.kunci}`,
        tipe: "isi",
        judul: h.judul,
        subjudul,
        blok: [{ tipe: "teks", teks: `Belum ada data ${h.judul} untuk periode ${rentang}.`, nada: "muted" }],
      },
    ];
  }
  return [
    {
      kunci: `modul-${h.kunci}`,
      tipe: "isi",
      judul: h.judul,
      subjudul,
      blok: [{ tipe: "teks", teks: "Data modul ini tidak dapat dimuat saat laporan dibuat. Periksa koneksi sumber data lalu buat ulang laporan.", nada: "warn" }],
    },
  ];
}

/**
 * Slide 1 = sampul, lalu (opsional) slide anggaran yang disisipkan pemanggil,
 * lalu satu atau lebih slide per modul, catatan isu, dan penutup.
 */
export function buildSlides(
  bahan: BahanLaporan,
  opsi: OpsiPresentasi,
  sisipan: Slide[] = [],
  judulRapat = "Rapat Bulanan Kinerja Surveilans",
): Slide[] {
  const rentang = labelRentang(bahan.tahun, bahan.bulanAkhir);
  const slides: Slide[] = [];

  slides.push({
    kunci: "sampul",
    tipe: "sampul",
    judul: judulRapat,
    subjudul: `Data ${rentang}`,
    blok: [{ tipe: "teks", teks: INSTANSI }],
  });

  slides.push(...sisipan);

  for (const h of bahan.hasil) {
    if (opsi.modulDikecualikan.includes(h.kunci)) continue;
    const kelompok = h.kelompok;
    slides.push(...slideModul(h, `${kelompok} | ${rentang}`, rentang));
  }

  const catatan = opsi.catatan
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (catatan.length > 0) {
    slides.push({
      kunci: "catatan",
      tipe: "isi",
      judul: "Isu untuk diputuskan",
      blok: [{ tipe: "poin", items: catatan.slice(0, 8) }],
    });
  }

  if (opsi.penutup) {
    slides.push({
      kunci: "penutup",
      tipe: "sampul",
      judul: "Diskusi dan arahan pimpinan",
      subjudul: `Data ${rentang}`,
      blok: [{ tipe: "teks", teks: "Terima kasih" }],
    });
  }
  return slides;
}
