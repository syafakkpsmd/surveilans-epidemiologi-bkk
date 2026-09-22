import "server-only";
import { getRingkasanKlinikBulanan } from "@/lib/klinik/ringkasanPeriode";
import { BULAN, fmtAngka, fmtPersen, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, persenDari } from "./_bantu";

const JUDUL = "Klinik Binaan dan BKK (ICV)";

/** Baris hasil getRingkasanKlinikBulanan: satu baris per bulan per klinik/BKK. */
interface Baris {
  bulan: number;
  wilayah_kerja: string | null; // berisi NAMA klinik atau BKK
  kategori: string | null;
  total_layanan: number | null;
  jumlah_icv: number | null;
  patuh: number | null;
  tidak_patuh: number | null;
}

export const modulKlinik: ModulLaporan = {
  kunci: "klinik",
  judul: JUDUL,
  kelompok: "Klinik Binaan BKK",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    // getRingkasanKlinikBulanan hanya menghitung TAHUN BERJALAN (memfilter tahun sekarang di dalamnya).
    if (tahun !== new Date().getUTCFullYear()) {
      throw new Error(`Ringkasan klinik hanya tersedia untuk tahun berjalan (${new Date().getUTCFullYear()}); laporan tahun ${tahun} belum didukung.`);
    }
    const semua = (await getRingkasanKlinikBulanan()) as unknown as Baris[];
    const baris = semua.filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    if (baris.length === 0) return null;

    const kategoriBkk = (b: Baris) => b.kategori === "bkk";
    const layananKlinik = jumlahPerBulan(baris.filter((b) => !kategoriBkk(b)), bulanAkhir, (b) => b.total_layanan ?? 0);
    const layananBkk = jumlahPerBulan(baris.filter(kategoriBkk), bulanAkhir, (b) => b.total_layanan ?? 0);
    const layanan = layananKlinik.map((v, i) => v + layananBkk[i]);
    const totalLayanan = jumlah(layanan);
    if (totalLayanan === 0) return null;

    const totalIcv = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_icv ?? 0));
    const patuh = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.patuh ?? 0));
    const tidakPatuh = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.tidak_patuh ?? 0));
    const i = bulanAkhir - 1;

    const perFasilitas = new Map<string, { kategori: string; layanan: number; icv: number; patuh: number; tidak: number }>();
    for (const b of baris) {
      const nama = (b.wilayah_kerja ?? "-").trim() || "-";
      const x = perFasilitas.get(nama) ?? { kategori: kategoriBkk(b) ? "BKK" : "Klinik", layanan: 0, icv: 0, patuh: 0, tidak: 0 };
      x.layanan += b.total_layanan ?? 0;
      x.icv += b.jumlah_icv ?? 0;
      x.patuh += b.patuh ?? 0;
      x.tidak += b.tidak_patuh ?? 0;
      perFasilitas.set(nama, x);
    }
    const daftar = Array.from(perFasilitas, ([nama, v]) => ({ nama, ...v })).sort((a, b) => b.layanan - a.layanan);

    const temuan: string[] = [];
    if (daftar.length > 0 && daftar[0].layanan > 0) temuan.push(`Layanan terbanyak: ${daftar[0].nama} (${fmtAngka(daftar[0].layanan)} layanan, ${fmtPersen((daftar[0].layanan / totalLayanan) * 100, 0)} dari total).`);
    const rendah = daftar.filter((d) => d.patuh + d.tidak >= 10).map((d) => ({ ...d, p: persenDari(d.patuh, d.patuh + d.tidak) as number })).sort((a, b) => a.p - b.p)[0];
    if (rendah && rendah.p < 100) temuan.push(`Kepatuhan vaksin terendah: ${rendah.nama} (${fmtPersen(rendah.p)}).`);

    return {
      kunci: "klinik",
      judul: JUDUL,
      kelompok: "Klinik Binaan BKK",
      kartu: [
        { label: "Total layanan", nilai: fmtAngka(totalLayanan), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Dokumen ICV diterbitkan", nilai: fmtAngka(totalIcv) },
        { label: "Kepatuhan vaksin", nilai: fmtPersen(persenDari(patuh, patuh + tidakPatuh)), catatan: `${fmtAngka(patuh)} patuh, ${fmtAngka(tidakPatuh)} tidak patuh` },
        { label: `Layanan ${BULAN[i]}`, nilai: fmtAngka(layanan[i]), catatan: bulanAkhir >= 2 ? fmtPerubahan(layanan[i], layanan[i - 1]) : undefined },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Klinik binaan", nilai: layananKlinik, warna: "0A7A78" },
          { nama: "BKK", nilai: layananBkk, warna: "C9781F" },
        ],
        satuan: "Jumlah layanan",
      },
      tabel: {
        kepala: ["Klinik / BKK", "Kategori", "Layanan", "Dokumen ICV", "Kepatuhan"],
        kanan: [2, 3, 4],
        lebar: [4, 1.2, 1.2, 1.5, 1.3],
        baris: daftar.map((d) => [d.nama, d.kategori, fmtAngka(d.layanan), fmtAngka(d.icv), fmtPersen(persenDari(d.patuh, d.patuh + d.tidak))]),
      },
      temuan,
      narasi: ["Kepatuhan vaksin dihitung dari selisih tanggal terbit dan tanggal berangkat sesuai standar hari yang diatur di pengaturan klinik. Data dengan tanggal tidak valid tidak dihitung."],
    };
  },
};
