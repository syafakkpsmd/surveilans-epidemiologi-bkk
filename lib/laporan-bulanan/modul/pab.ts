import "server-only";
import { getRingkasanPabBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, persenDari, temuanPoin, temuanTmsTerbanyak } from "./_bantu";

const JUDUL = "Surveilans PAB";

/** Kolom view_pab_bulanan yang dipakai. */
interface Baris {
  bulan: number;
  wilayah_kerja: string | null;
  jumlah_pemeriksaan: number | null;
  jumlah_ms: number | null;
  jumlah_tms: number | null;
  tms_fisik: number | null;
  tms_kimia: number | null;
  tms_bakteriologis: number | null;
}

export const modulPab: ModulLaporan = {
  kunci: "pab",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = ((await getRingkasanPabBulanan(tahun)) as Baris[]).filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    if (baris.length === 0) return null;

    const periksa = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_pemeriksaan ?? 0);
    const ms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_ms ?? 0);
    const tms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_tms ?? 0);
    if (jumlah(periksa) + jumlah(ms) + jumlah(tms) === 0) return null;

    const persenMs = ms.map((m, i) => persenDari(m, m + tms[i]));
    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      periksa: (b) => b.jumlah_pemeriksaan ?? 0,
      ms: (b) => b.jumlah_ms ?? 0,
      tms: (b) => b.jumlah_tms ?? 0,
    });
    const tmsParameter = [
      { nama: "Fisik", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.tms_fisik ?? 0)) },
      { nama: "Kimia", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.tms_kimia ?? 0)) },
      { nama: "Bakteriologis", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.tms_bakteriologis ?? 0)) },
    ];

    return {
      kunci: "pab",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Pemeriksaan PAB", nilai: fmtAngka(jumlah(periksa)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Memenuhi syarat (MS)", nilai: fmtAngka(jumlah(ms)), catatan: `${fmtPersen(persenDari(jumlah(ms), jumlah(ms) + jumlah(tms)))} dari hasil pemeriksaan`, nada: "ok" },
        { label: "Tidak memenuhi syarat (TMS)", nilai: fmtAngka(jumlah(tms)), nada: jumlah(tms) > 0 ? "warn" : undefined },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(periksa[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(periksa[bulanAkhir - 1], periksa[bulanAkhir - 2]) : undefined },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Memenuhi syarat (MS)", nilai: ms, warna: "0A7A78" },
          { nama: "Tidak memenuhi syarat (TMS)", nilai: tms, warna: "B3362C" },
        ],
        satuan: "Jumlah hasil pemeriksaan",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Pemeriksaan", "MS", "TMS", "% MS"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1.4, 1, 1, 1],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.periksa), fmtAngka(w.nilai.ms), fmtAngka(w.nilai.tms), fmtPersen(persenDari(w.nilai.ms, w.nilai.ms + w.nilai.tms))]),
      },
      temuan: [...temuanTmsTerbanyak(tmsParameter), ...temuanPoin(persenMs, "Persentase memenuhi syarat")],
    };
  },
};
