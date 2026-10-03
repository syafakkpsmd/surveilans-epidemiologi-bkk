import "server-only";
import { DAFTAR_WILKER_KIER, getDaftarWilkerAktif, getTrenBulananKier, getTrenBulananPerWilkerKier } from "@/lib/turso/kier";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah } from "./_bantu";

const JUDUL = "Surveilans Kesehatan Kerja";

export const modulKier: ModulLaporan = {
  kunci: "kier",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    // CATATAN: lib/turso/kier.ts tidak mengekspor breakdown kesimpulan/jenis kelamin yang
    // dibatasi rentang bulan (getRingkasanKier() selalu 1 tahun penuh, bukan sampai
    // bulanAkhir). Supaya angka laporan ini tetap akurat untuk periode Januari sampai
    // bulan laporan, modul ini HANYA memakai fungsi yang memang menerima rentang bulan
    // (getTrenBulananKier/getTrenBulananPerWilkerKier). Kartu "kesimpulan terbanyak" dan
    // "tujuan terbanyak" sengaja tidak disertakan dulu — beri tahu saya kalau perlu, tinggal
    // menambah satu fungsi kecil di kier.ts yang menerima bulanAkhir.
    const daftarWilker = await getDaftarWilkerAktif(tahun);
    const [tren, trenWilker] = await Promise.all([
      getTrenBulananKier(tahun, 1, bulanAkhir),
      getTrenBulananPerWilkerKier(tahun, 1, bulanAkhir, daftarWilker),
    ]);
    const nilaiBulan = tren.map((t) => t.jumlah);
    const total = jumlah(nilaiBulan);
    if (total === 0) return null;

    const totalPerWilker = daftarWilker.map((w) => ({ w, n: trenWilker.reduce((s, t) => s + (Number(t[w]) || 0), 0) })).sort((a, b) => b.n - a.n);
    const i = bulanAkhir - 1;
    const wilkerResmi = totalPerWilker.filter((w) => (DAFTAR_WILKER_KIER as readonly string[]).includes(w.w));
    const wilkerAsing = totalPerWilker.filter((w) => !(DAFTAR_WILKER_KIER as readonly string[]).includes(w.w) && w.n > 0);

    const temuan: string[] = [];
    if (totalPerWilker.length > 0 && totalPerWilker[0].n > 0) temuan.push(`Pemeriksaan terbanyak di wilayah kerja ${totalPerWilker[0].w} (${fmtAngka(totalPerWilker[0].n)}).`);
    if (wilkerAsing.length > 0) temuan.push(`Ditemukan ${fmtAngka(wilkerAsing.length)} nama wilayah kerja di luar 5 wilker resmi (kemungkinan beda ejaan di sheet): ${wilkerAsing.map((w) => w.w).join(", ")}.`);

    return {
      kunci: "kier",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total pemeriksaan KIER", nilai: fmtAngka(total), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Pemeriksaan ${BULAN[i]}`, nilai: fmtAngka(nilaiBulan[i]) },
        { label: "Wilayah kerja aktif", nilai: fmtAngka(wilkerResmi.filter((w) => w.n > 0).length), catatan: `dari ${fmtAngka(DAFTAR_WILKER_KIER.length)} wilker` },
        { label: "Rata-rata per bulan", nilai: fmtAngka(Math.round(total / bulanAkhir)) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Pemeriksaan KIER", nilai: nilaiBulan, warna: "0A7A78" }], satuan: "Jumlah pemeriksaan" },
      tabel: {
        kepala: ["Wilayah kerja", "Pemeriksaan"],
        kanan: [1],
        lebar: [4, 1.5],
        baris: totalPerWilker.map((w) => [w.w, fmtAngka(w.n)]),
      },
      temuan,
    };
  },
};
