import "server-only";
import { getRingkasanTppBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, persenDari, temuanPoin, temuanTmsTerbanyak } from "./_bantu";

const JUDUL = "Surveilans TPP";

/** Kolom view_tpp_bulanan yang dipakai. */
interface Baris {
  bulan: number;
  wilayah_kerja: string | null;
  jumlah_tpp_diperiksa: number | null;
  jumlah_ms: number | null;
  jumlah_tms: number | null;
  ikl_tms: number | null;
  tms_bakteriologis: number | null;
  tms_borax: number | null;
  tms_formaldehyde: number | null;
  tms_hy_rise: number | null;
  tms_metyl_yellow: number | null;
  tms_rodamin_b: number | null;
}

/** Parameter pemeriksaan TPP (label sama dengan halaman TPP). */
const PARAMETER: { kolom: keyof Baris; nama: string }[] = [
  { kolom: "ikl_tms", nama: "Inspeksi kesehatan lingkungan (IKL)" },
  { kolom: "tms_bakteriologis", nama: "Bakteriologis" },
  { kolom: "tms_borax", nama: "Borax" },
  { kolom: "tms_formaldehyde", nama: "Formaldehyde" },
  { kolom: "tms_metyl_yellow", nama: "Metyl Yellow" },
  { kolom: "tms_rodamin_b", nama: "Rodamin B" },
  { kolom: "tms_hy_rise", nama: "Hy-Rise" },
];

export const modulTpp: ModulLaporan = {
  kunci: "tpp",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = ((await getRingkasanTppBulanan(tahun)) as Baris[]).filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    if (baris.length === 0) return null;

    const diperiksa = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_tpp_diperiksa ?? 0);
    const ms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_ms ?? 0);
    const tms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_tms ?? 0);
    const totalDiperiksa = jumlah(diperiksa);
    if (totalDiperiksa === 0 && jumlah(ms) + jumlah(tms) === 0) return null;

    const persenMs = ms.map((m, i) => persenDari(m, m + tms[i]));
    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      diperiksa: (b) => b.jumlah_tpp_diperiksa ?? 0,
      ms: (b) => b.jumlah_ms ?? 0,
      tms: (b) => b.jumlah_tms ?? 0,
    });
    const tmsParameter = PARAMETER.map((p) => ({ nama: p.nama, nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => Number(b[p.kolom]) || 0)) }));

    return {
      kunci: "tpp",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "TPP diperiksa", nilai: fmtAngka(totalDiperiksa), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Memenuhi syarat (MS)", nilai: fmtAngka(jumlah(ms)), catatan: `${fmtPersen(persenDari(jumlah(ms), jumlah(ms) + jumlah(tms)))} dari hasil pemeriksaan`, nada: "ok" },
        { label: "Tidak memenuhi syarat (TMS)", nilai: fmtAngka(jumlah(tms)), nada: jumlah(tms) > 0 ? "warn" : undefined },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(diperiksa[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(diperiksa[bulanAkhir - 1], diperiksa[bulanAkhir - 2]) : undefined },
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
        kepala: ["Wilayah kerja", "TPP diperiksa", "MS", "TMS", "% MS"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1.4, 1, 1, 1],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.diperiksa), fmtAngka(w.nilai.ms), fmtAngka(w.nilai.tms), fmtPersen(persenDari(w.nilai.ms, w.nilai.ms + w.nilai.tms))]),
      },
      temuan: [...temuanTmsTerbanyak(tmsParameter), ...temuanPoin(persenMs, "Persentase memenuhi syarat")],
    };
  },
};
