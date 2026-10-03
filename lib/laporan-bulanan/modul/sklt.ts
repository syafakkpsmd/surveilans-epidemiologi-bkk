import "server-only";
import { getSkltData } from "@/lib/turso/sklt";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, persenDari } from "./_bantu";

const JUDUL = "Pemeriksaan Laik Terbang Calon Penumpang";

const bulanDari = (iso: string): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

export const modulSklt: ModulLaporan = {
  kunci: "sklt",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const semua = await getSkltData(tahun);
    const rows = semua.filter((r) => {
      const b = bulanDari(r.tanggal);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const periksaBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) periksaBulan[bulanDari(r.tanggal)! - 1] += 1;
    const total = jumlah(periksaBulan);
    const laik = rows.filter((r) => r.laik === "Laik").length;
    const tidakLaik = rows.filter((r) => r.laik === "Tidak Laik").length;

    const perRute = new Map<string, number>();
    const perMaskapai = new Map<string, number>();
    for (const r of rows) {
      perRute.set(r.rute, (perRute.get(r.rute) ?? 0) + 1);
      perMaskapai.set(r.maskapai, (perMaskapai.get(r.maskapai) ?? 0) + 1);
    }
    const rute = Array.from(perRute, ([nama, n]) => ({ nama, n })).sort((a, b) => b.n - a.n).slice(0, 10);
    const maskapaiTerbanyak = Array.from(perMaskapai, ([nama, n]) => ({ nama, n })).sort((a, b) => b.n - a.n)[0];
    const i = bulanAkhir - 1;

    const temuan: string[] = [];
    if (tidakLaik > 0) temuan.push(`${fmtAngka(tidakLaik)} calon penumpang dinyatakan tidak laik terbang (${fmtPersen(persenDari(tidakLaik, total))}).`);
    if (rute.length > 0) temuan.push(`Tujuan terbanyak: ${rute[0].nama} (${fmtAngka(rute[0].n)} pemeriksaan).`);
    if (maskapaiTerbanyak) temuan.push(`Maskapai terbanyak: ${maskapaiTerbanyak.nama} (${fmtAngka(maskapaiTerbanyak.n)}).`);

    return {
      kunci: "sklt",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Total pemeriksaan", nilai: fmtAngka(total), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Laik terbang", nilai: fmtAngka(laik), nada: "ok", catatan: fmtPersen(persenDari(laik, total)) },
        { label: "Tidak laik terbang", nilai: fmtAngka(tidakLaik), nada: tidakLaik > 0 ? "warn" : undefined },
        { label: `Pemeriksaan ${BULAN[i]}`, nilai: fmtAngka(periksaBulan[i]) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Pemeriksaan", nilai: periksaBulan, warna: "0A7A78" }], satuan: "Jumlah pemeriksaan" },
      tabel: {
        kepala: ["Tujuan", "Jumlah"],
        kanan: [1],
        lebar: [4, 1.5],
        baris: rute.map((r) => [r.nama, fmtAngka(r.n)]),
      },
      temuan,
      narasi: ["Identitas calon penumpang tidak ditampilkan (disamarkan jadi inisial di sumber datanya) untuk menjaga kerahasiaan data pribadi."],
    };
  },
};
