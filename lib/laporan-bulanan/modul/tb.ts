import "server-only";
import {
  DAFTAR_WILKER_TB,
  getTbRawData,
  hitungBreakdownFaktorRisikoTb,
  hitungBreakdownWilkerTb,
  hitungCascadeTb,
  hitungDelayDiagnosisTb,
} from "@/lib/turso/tb";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah } from "./_bantu";

const JUDUL = "Surveilans TB";

/** Bulan kalender (1-12) dari tanggal_pelaksanaan (format YYYY-MM-DD). */
const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

export const modulTb: ModulLaporan = {
  kunci: "tb",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const semua = await getTbRawData(tahun);
    const rows = semua.filter((r) => {
      const b = bulanDari(r.tanggal_pelaksanaan);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const cascade = hitungCascadeTb(rows);
    const perWilker = hitungBreakdownWilkerTb(rows).filter((w) => DAFTAR_WILKER_TB.includes(w.wilayahKerja as (typeof DAFTAR_WILKER_TB)[number]));
    const faktor = hitungBreakdownFaktorRisikoTb(rows).filter((f) => f.totalDiskrining > 0).slice(0, 5);
    const delay = hitungDelayDiagnosisTb(rows);

    // Deret skrining per bulan, untuk grafik dan kartu "bulan ini".
    const skriningBulan = new Array<number>(bulanAkhir).fill(0);
    const terkonfirmasiBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) {
      const b = bulanDari(r.tanggal_pelaksanaan)!;
      skriningBulan[b - 1] += 1;
      if ((r.terkonfirmasi_tbc ?? "").trim().toLowerCase() === "ya") terkonfirmasiBulan[b - 1] += 1;
    }

    const temuan: string[] = [
      `Case Detection Rate ${fmtPersen(cascade.caseDetectionRate, 2)} (${fmtAngka(cascade.totalTerkonfirmasi)} terkonfirmasi dari ${fmtAngka(cascade.totalSkrining)} skrining); yield dari terduga ${fmtPersen(cascade.yieldRateTerduga, 1)}.`,
    ];
    if (faktor.length > 0) temuan.push(`Yield tertinggi pada kelompok ${faktor[0].faktor} (${fmtPersen(faktor[0].yieldPersen, 1)}, ${fmtAngka(faktor[0].totalTerkonfirmasi)} dari ${fmtAngka(faktor[0].totalDiskrining)} diskrining).`);
    if (delay.jumlahKasusDihitung > 0) temuan.push(`Rata-rata waktu skrining sampai hasil diagnosis ${desimal1(delay.rataRataHari)} hari (median ${fmtAngka(delay.medianHari)}, maksimal ${fmtAngka(delay.maksimalHari)} hari), dari ${fmtAngka(delay.jumlahKasusDihitung)} kasus dengan tanggal hasil tercatat.`);
    const wilkerTerbanyak = [...perWilker].sort((a, b) => b.totalSkrining - a.totalSkrining)[0];
    if (wilkerTerbanyak && wilkerTerbanyak.totalSkrining > 0) temuan.push(`Skrining terbanyak di wilayah kerja ${wilkerTerbanyak.wilayahKerja} (${fmtAngka(wilkerTerbanyak.totalSkrining)}).`);

    return {
      kunci: "tb",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total skrining", nilai: fmtAngka(cascade.totalSkrining), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Terduga TBC", nilai: fmtAngka(cascade.totalTerduga), catatan: `${fmtAngka(cascade.totalDiperiksa)} sudah diperiksa` },
        { label: "Terkonfirmasi TBC", nilai: fmtAngka(cascade.totalTerkonfirmasi), nada: cascade.totalTerkonfirmasi > 0 ? "bad" : "ok" },
        { label: `Skrining ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(skriningBulan[bulanAkhir - 1]) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Skrining", nilai: skriningBulan, warna: "6B8E9B" },
          { nama: "Terkonfirmasi", nilai: terkonfirmasiBulan, warna: "B3362C" },
        ],
        satuan: "Jumlah peserta",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Skrining", "Terduga", "Terkonfirmasi"],
        kanan: [1, 2, 3],
        lebar: [3, 1.2, 1.2, 1.6],
        baris: perWilker.map((w) => [w.wilayahKerja, fmtAngka(w.totalSkrining), fmtAngka(w.totalTerduga), fmtAngka(w.totalTerkonfirmasi)]),
      },
      temuan,
      narasi: [
        "Skrining mencakup peserta dari seluruh Indonesia (kabupaten/kota asal peserta), sementara wilayah kerja menunjukkan BKK yang melaksanakan skrining. Case Detection Rate dan yield rate dihitung dari data periode laporan, bukan kumulatif sejak awal program.",
      ],
    };
  },
};

function desimal1(n: number): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}
