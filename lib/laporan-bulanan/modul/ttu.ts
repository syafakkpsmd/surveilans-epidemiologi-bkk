import "server-only";
import { getRingkasanTtuBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, persenDari, temuanPoin, temuanTmsTerbanyak } from "./_bantu";

const JUDUL = "Surveilans TTU";

/** Kolom view_ttu_bulanan yang dipakai. */
interface Baris {
  bulan: number;
  wilayah_kerja: string | null;
  jumlah_diperiksa: number | null;
  jumlah_ms: number | null;
  jumlah_tms: number | null;
  [kolomTms: string]: number | string | null;
}

/** Komponen inspeksi TTU yang dicatat sebagai TMS. */
const KOMPONEN: { kolom: string; nama: string }[] = [
  { kolom: "tms_getaran_diruang_kerja", nama: "Getaran di ruang kerja" },
  { kolom: "tms_instalasi", nama: "Instalasi" },
  { kolom: "tms_kebisingan", nama: "Kebisingan" },
  { kolom: "tms_lingkungan_luar_halaman", nama: "Lingkungan luar dan halaman" },
  { kolom: "tms_pemeliharaan_jamban_kamar_mandi", nama: "Pemeliharaan jamban dan kamar mandi" },
  { kolom: "tms_pencahayaan", nama: "Pencahayaan" },
  { kolom: "tms_pengelolaan_limbah", nama: "Pengelolaan limbah" },
  { kolom: "tms_pengendalian_vektor_penyakit", nama: "Pengendalian vektor penyakit" },
  { kolom: "tms_penyehatan_air", nama: "Penyehatan air" },
  { kolom: "tms_penyehatan_udara_ruang", nama: "Penyehatan udara ruang" },
  { kolom: "tms_ruang_bangunan", nama: "Ruang bangunan" },
];

export const modulTtu: ModulLaporan = {
  kunci: "ttu",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = ((await getRingkasanTtuBulanan(tahun)) as Baris[]).filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    if (baris.length === 0) return null;

    const diperiksa = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_diperiksa ?? 0);
    const ms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_ms ?? 0);
    const tms = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_tms ?? 0);
    if (jumlah(diperiksa) + jumlah(ms) + jumlah(tms) === 0) return null;

    const persenMs = ms.map((m, i) => persenDari(m, m + tms[i]));
    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      diperiksa: (b) => b.jumlah_diperiksa ?? 0,
      ms: (b) => b.jumlah_ms ?? 0,
      tms: (b) => b.jumlah_tms ?? 0,
    });
    const tmsKomponen = KOMPONEN.map((k) => ({ nama: k.nama, nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => Number(b[k.kolom]) || 0)) }));

    return {
      kunci: "ttu",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "TTU diperiksa", nilai: fmtAngka(jumlah(diperiksa)), catatan: labelRentang(tahun, bulanAkhir) },
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
        satuan: "Jumlah TTU",
      },
      tabel: {
        kepala: ["Wilayah kerja", "TTU diperiksa", "MS", "TMS", "% MS"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1.4, 1, 1, 1],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.diperiksa), fmtAngka(w.nilai.ms), fmtAngka(w.nilai.tms), fmtPersen(persenDari(w.nilai.ms, w.nilai.ms + w.nilai.tms))]),
      },
      temuan: [...temuanTmsTerbanyak(tmsKomponen), ...temuanPoin(persenMs, "Persentase memenuhi syarat")],
    };
  },
};
