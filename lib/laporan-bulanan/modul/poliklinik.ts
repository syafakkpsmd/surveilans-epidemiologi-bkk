import "server-only";
import { DAFTAR_WILKER_POLIKLINIK, getKunjunganRawData, hitungBreakdownWilker, hitungDonutJenisKelaminKunjungan, hitungDonutKelompokUsia, hitungTopDiagnosa } from "@/lib/turso/poliklinik";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah } from "./_bantu";

const JUDUL = "Kunjungan Poliklinik";

const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};
function keDonat(judul: string, item: { label: string; jumlah: number }[], warna?: string[]): Donat | null {
  const irisan = item
    .map((x, i) => ({ label: x.label, nilai: x.jumlah, warna: warna?.[i] }))
    .filter((x) => Number.isFinite(x.nilai) && x.nilai > 0);
  return irisan.length > 0 ? { judul, irisan } : null;
}

/** Kategori pasien dari kolom kategori_pasien; digabung tanpa membedakan huruf besar/kecil. */
function hitungKategoriPasien(rows: { kategori_pasien?: string | null }[], maks = 8) {
  const peta = new Map<string, { label: string; nilai: number }>();
  for (const r of rows) {
    const asli = (r.kategori_pasien ?? "").trim() || "Tanpa kategori";
    const kunci = asli.toLowerCase();
    const ada = peta.get(kunci);
    if (ada) ada.nilai += 1;
    else peta.set(kunci, { label: asli, nilai: 1 });
  }
  const urut = [...peta.values()].sort((a, b) => b.nilai - a.nilai);
  if (urut.length <= maks) return urut;
  const sisa = urut.slice(maks - 1).reduce((a, x) => a + x.nilai, 0);
  return [...urut.slice(0, maks - 1), { label: "Lainnya", nilai: sisa }];
}
export const modulPoliklinik: ModulLaporan = {
  kunci: "poliklinik",
  judul: JUDUL,
  kelompok: "Klinik Binaan BKK",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const semua = await getKunjunganRawData(tahun);
    const rows = semua.filter((r) => {
      const b = bulanDari(r.tanggal_pemeriksaan);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const kunjunganBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) kunjunganBulan[bulanDari(r.tanggal_pemeriksaan)! - 1] += 1;
    const total = jumlah(kunjunganBulan);

    const topDiagnosa = hitungTopDiagnosa(rows, 10);
    const perWilker = hitungBreakdownWilker(rows);
    const gender = hitungDonutJenisKelaminKunjungan(rows);
    const usia = hitungDonutKelompokUsia(rows);
    const diagnosaUnik = new Set(rows.map((r) => (r.diagnosa ?? "").trim()).filter(Boolean)).size;
    const i = bulanAkhir - 1;
    const donat = [
      keDonat("Jenis Kelamin", gender, ["3F6FB5", "D98C8C"]),
      keDonat("Kelompok Usia", usia, ["2A7A4B", "C9781F", "0A7A78", "7A5C99"]),
    ].filter((d): d is Donat => d !== null);
    const kategoriPasien = hitungKategoriPasien(rows);

    const temuan: string[] = [];
    if (topDiagnosa.length > 0) temuan.push(`Diagnosa terbanyak: ${topDiagnosa[0].diagnosa} (${fmtAngka(topDiagnosa[0].jumlah)} kunjungan).`);
    const wilkerTerbanyak = [...perWilker].sort((a, b) => b.jumlah - a.jumlah)[0];
    if (wilkerTerbanyak && wilkerTerbanyak.jumlah > 0) temuan.push(`Kunjungan terbanyak di wilayah kerja ${wilkerTerbanyak.wilayahKerja} (${fmtAngka(wilkerTerbanyak.jumlah)}).`);

    return {
      kunci: "poliklinik",
      judul: JUDUL,
      kelompok: "Klinik Binaan BKK",
      kartu: [
        { label: "Total kunjungan", nilai: fmtAngka(total), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Diagnosa unik", nilai: fmtAngka(diagnosaUnik) },
        { label: `Kunjungan ${BULAN[i]}`, nilai: fmtAngka(kunjunganBulan[i]) },
        { label: "Rata-rata per bulan", nilai: fmtAngka(Math.round(total / bulanAkhir)) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Kunjungan", nilai: kunjunganBulan, warna: "0A7A78" }], satuan: "Jumlah kunjungan" },
      tabel: {
        kepala: ["Diagnosa", "Jumlah"],
        kanan: [1],
        lebar: [4, 1.5],
        baris: topDiagnosa.map((d) => [d.diagnosa, fmtAngka(d.jumlah)]),
      },
      donat: donat.length > 0 ? donat : undefined,
      batangMendatar: kategoriPasien.length > 0
        ? [{ judul: "Kategori Pasien", item: kategoriPasien, satuan: "Jumlah kunjungan" }]
        : undefined,
      temuan,
      narasi: [`Jenis kelamin: ${gender.map((g) => `${g.label} ${fmtAngka(g.jumlah)}`).join(", ")}. Kelompok usia: ${usia.map((u) => `${u.label} ${fmtAngka(u.jumlah)}`).join(", ")}.`],
    };
  },
};
