import "server-only";
import { ambilDataSiaos } from "@/lib/turso/queriesSiaos";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, persenDari } from "./_bantu";

const JUDUL = "Pemeriksaan Ijin Angkut Orang Sakit";

/** "Ya"/"ya"/"YA" dianggap ya; kosong, "Tidak", "-", dan sejenisnya dianggap bukan. */
const ya = (v: string | null): boolean => (v ?? "").trim().toLowerCase() === "ya";

const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

export const modulSiaos: ModulLaporan = {
  kunci: "siaos",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    // ambilDataSiaos() mengembalikan SEMUA baris sejak awal (tidak ada parameter tahun),
    // jadi penyaringan tahun dan bulan dilakukan di sini.
    const semua = await ambilDataSiaos();
    const rows = semua.filter((r) => {
      if (!r.tanggal || r.tanggal.slice(0, 4) !== String(tahun)) return false;
      const b = bulanDari(r.tanggal);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const kasusBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) kasusBulan[bulanDari(r.tanggal)! - 1] += 1;
    const total = jumlah(kasusBulan);
    const butuhMedis = rows.filter((r) => ya(r.butuh_bantuan_medis)).length;
    const ambulance = rows.filter((r) => ya(r.ambulance)).length;
    const kursiDorong = rows.filter((r) => ya(r.perlu_kursi_dorong)).length;

    const perWilker = new Map<string, number>();
    const perDiagnosa = new Map<string, number>();
    for (const r of rows) {
      perWilker.set(r.wilayah_kerja, (perWilker.get(r.wilayah_kerja) ?? 0) + 1);
      const d = (r.diagnosa ?? "").trim() || "Tidak dicatat";
      perDiagnosa.set(d, (perDiagnosa.get(d) ?? 0) + 1);
    }
    const wilker = Array.from(perWilker, ([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n);
    const diagnosa = Array.from(perDiagnosa, ([d, n]) => ({ d, n })).sort((a, b) => b.n - a.n).slice(0, 10);
    const i = bulanAkhir - 1;

    const temuan: string[] = [`${fmtAngka(butuhMedis)} dari ${fmtAngka(total)} kasus membutuhkan bantuan medis (${fmtPersen(persenDari(butuhMedis, total))}); ${fmtAngka(ambulance)} di antaranya dirujuk dengan ambulans.`];
    if (wilker.length > 0 && wilker[0].n > 0) temuan.push(`Kasus terbanyak di wilayah kerja ${wilker[0].w} (${fmtAngka(wilker[0].n)}).`);

    return {
      kunci: "siaos",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Total kasus", nilai: fmtAngka(total), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Butuh bantuan medis", nilai: fmtAngka(butuhMedis), catatan: fmtPersen(persenDari(butuhMedis, total)) },
        { label: "Dirujuk ambulans", nilai: fmtAngka(ambulance) },
        { label: "Perlu kursi dorong", nilai: fmtAngka(kursiDorong), catatan: `Kasus ${BULAN[i]}: ${fmtAngka(kasusBulan[i])}` },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Kasus", nilai: kasusBulan, warna: "C9781F" }], satuan: "Jumlah kasus" },
      tabel: {
        kepala: ["Diagnosa", "Jumlah"],
        kanan: [1],
        lebar: [4, 1.5],
        baris: diagnosa.map((d) => [d.d, fmtAngka(d.n)]),
      },
      temuan,
    };
  },
};
