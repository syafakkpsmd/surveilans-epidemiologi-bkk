import "server-only";
import { getTrenAnophelesDewasa } from "@/lib/supabase/queries";
import { BULAN, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal } from "./_bantu";
import { seriPerWilker } from "./_perWilker";

const JUDUL = "Surveilans Vektor Nyamuk Anopheles";

interface BarisBulan {
  bulanLabel: string;
  mhd: number;
  mbr: number;
  suhu: number;
  kelembaban: number;
}

export const modulAnopheles: ModulLaporan = {
  kunci: "anopheles",
  judul: JUDUL,
  kelompok: "Vektor",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = (await getTrenAnophelesDewasa(tahun, undefined, "bulanan")) as unknown as BarisBulan[];
    if (baris.length === 0) return null;

    const ambil = (f: (b: BarisBulan) => number) => deretDariLabel(baris, tahun, bulanAkhir, (b) => b.bulanLabel, f, null);
    const mhd = ambil((b) => b.mhd);
    const mbr = ambil((b) => b.mbr);
    const suhu = ambil((b) => b.suhu);
    const lembab = ambil((b) => b.kelembaban);
    if (mhd.every((v) => v == null)) return null;
    // MHD per wilayah kerja (batang berdampingan; laju tidak boleh ditumpuk)
    const seriWilker = await seriPerWilker(
      (kode) => getTrenAnophelesDewasa(tahun, kode, "bulanan").then((r) => r as unknown as BarisBulan[]),
      (rows) => deretDariLabel(rows, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.mhd, null),
    );
    const puncakWilker = seriWilker
      .flatMap((s) => s.nilai.map((v, k) => ({ nama: s.nama, bulan: BULAN[k], nilai: v })))
      .filter((x): x is { nama: string; bulan: string; nilai: number } => x.nilai != null)
      .sort((a, b) => b.nilai - a.nilai)[0];

    const i = bulanAkhir - 1;
    const label = labelBulanan(bulanAkhir);
    const ada = (a: (number | null)[]) => a.filter((v): v is number => v != null);
    const rata = (a: (number | null)[]) => (ada(a).length ? ada(a).reduce((s, v) => s + v, 0) / ada(a).length : null);
    const maksMhd = Math.max(...ada(mhd));

    return {
      kunci: "anopheles",
      judul: JUDUL,
      kelompok: "Vektor",
      kartu: [
        { label: `MHD ${BULAN[i]}`, nilai: desimal(mhd[i]), catatan: "kepadatan nyamuk per orang per jam" },
        { label: `MBR ${BULAN[i]}`, nilai: desimal(mbr[i]), catatan: "rata-rata survei" },
        { label: "Suhu rata-rata", nilai: rata(suhu) == null ? "-" : `${desimal(rata(suhu), 1)} °C`, catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Kelembapan rata-rata", nilai: rata(lembab) == null ? "-" : `${desimal(rata(lembab), 1)}%` },
      ],
      tren: {
        jenis: "batang",
        label,
          seri: [
            ...(seriWilker.length > 0
              ? seriWilker
              : [
                  { nama: "MHD", nilai: mhd, warna: "0A7A78" },
                  { nama: "MBR", nilai: mbr, warna: "C9781F" },
                ]),
            { nama: "Suhu (°C)", nilai: suhu, warna: "E11D48", garis: true, sumbuKanan: 1 as const },
            { nama: "Kelembapan (%)", nilai: lembab, warna: "0284C7", garis: true, sumbuKanan: 2 as const },
          ],
        satuan: "MHD (nyamuk per orang per jam)",
      },
      tabel: {
        kepala: ["Bulan", "MHD", "MBR", "Suhu (°C)", "Kelembapan (%)"],
        kanan: [1, 2, 3, 4],
        lebar: [1.6, 1, 1, 1.2, 1.5],
        baris: label.map((nama, k) => [nama, desimal(mhd[k]), desimal(mbr[k]), desimal(suhu[k], 1), desimal(lembab[k], 1)]),
      },
            temuan: [
        ...(Number.isFinite(maksMhd) ? [`MHD tertinggi pada bulan ${BULAN[mhd.indexOf(maksMhd)]} (${desimal(maksMhd)}).`] : []),
        ...(puncakWilker ? [`MHD tertinggi per wilayah kerja tercatat di ${puncakWilker.nama} pada ${puncakWilker.bulan} (${desimal(puncakWilker.nilai)}).`] : []),
      ],
    };
  },
};