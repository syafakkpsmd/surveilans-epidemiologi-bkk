import "server-only";
import { getTrenAnophelesDewasa } from "@/lib/supabase/queries";
import { BULAN, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal } from "./_bantu";

const JUDUL = "Vektor Anopheles (Nyamuk Dewasa)";

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
        jenis: "garis",
        label,
        seri: [
          { nama: "MHD", nilai: mhd, warna: "0A7A78" },
          { nama: "MBR", nilai: mbr, warna: "C9781F" },
        ],
        satuan: "Nilai rata-rata survei",
      },
      tabel: {
        kepala: ["Bulan", "MHD", "MBR", "Suhu (°C)", "Kelembapan (%)"],
        kanan: [1, 2, 3, 4],
        lebar: [1.6, 1, 1, 1.2, 1.5],
        baris: label.map((nama, k) => [nama, desimal(mhd[k]), desimal(mbr[k]), desimal(suhu[k], 1), desimal(lembab[k], 1)]),
      },
      temuan: Number.isFinite(maksMhd) ? [`MHD tertinggi pada bulan ${BULAN[mhd.indexOf(maksMhd)]} (${desimal(maksMhd)}).`] : [],
    };
  },
};
