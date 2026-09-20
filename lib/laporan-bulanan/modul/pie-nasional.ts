import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { ambilSemuaHalaman, CATATAN_MINGGU_KE_BULAN, jumlah, mingguDalamPeriode } from "./_bantu";

const JUDUL = "PIE Nasional";
const MAKS_BARIS_TABEL = 15;

/** Kolom v_nasional_emerging_mingguan yang dipakai. */
interface Baris {
  minggu_epid: number | null;
  penyakit: string | null;
  total_kasus: number | null;
  total_kematian: number | null;
}

export const modulPieNasional: ModulLaporan = {
  kunci: "pie-nasional",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const minggu = mingguDalamPeriode(tahun, bulanAkhir);
    if (minggu.length === 0) return null;
    const bulanDariMinggu = new Map(minggu.map((m) => [m.minggu, m.bulan]));
    const supabase = await createClient();

    const baris = (await ambilSemuaHalaman((dari, sampai) =>
      supabase
        .from("v_nasional_emerging_mingguan")
        .select("minggu_epid, penyakit, total_kasus, total_kematian")
        .eq("tahun_epid", tahun)
        .in("minggu_epid", minggu.map((m) => m.minggu))
        .order("minggu_epid")
        .order("penyakit")
        .range(dari, sampai),
    )) as Baris[];
    if (baris.length === 0) return null;

    const kasusBulan = new Array<number>(bulanAkhir).fill(0);
    const matiBulan = new Array<number>(bulanAkhir).fill(0);
    const perPenyakit = new Map<string, { kasus: number; mati: number }>();
    for (const b of baris) {
      const bulan = bulanDariMinggu.get(Number(b.minggu_epid));
      if (!bulan) continue;
      const kasus = Number(b.total_kasus) || 0;
      const mati = Number(b.total_kematian) || 0;
      kasusBulan[bulan - 1] += kasus;
      matiBulan[bulan - 1] += mati;
      const nama = (b.penyakit ?? "Tanpa nama").trim();
      const x = perPenyakit.get(nama) ?? { kasus: 0, mati: 0 };
      x.kasus += kasus;
      x.mati += mati;
      perPenyakit.set(nama, x);
    }
    const totalKasus = jumlah(kasusBulan);
    const totalMati = jumlah(matiBulan);
    if (totalKasus === 0 && totalMati === 0) return null;

    const daftar = Array.from(perPenyakit, ([nama, v]) => ({ nama, ...v })).filter((p) => p.kasus > 0 || p.mati > 0).sort((a, b) => b.kasus - a.kasus);
    const temuan: string[] = [];
    if (daftar.length > 0) temuan.push(`Kasus terbanyak: ${daftar[0].nama} (${fmtAngka(daftar[0].kasus)} kasus).`);
    const denganKematian = daftar.filter((p) => p.mati > 0).sort((a, b) => b.mati - a.mati);
    if (denganKematian.length > 0) temuan.push(`Kematian terbanyak: ${denganKematian[0].nama} (${fmtAngka(denganKematian[0].mati)} orang).`);

    return {
      kunci: "pie-nasional",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total kasus", nilai: fmtAngka(totalKasus), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Total kematian", nilai: fmtAngka(totalMati), nada: totalMati > 0 ? "bad" : undefined },
        { label: "Penyakit dilaporkan", nilai: fmtAngka(daftar.length) },
        { label: `Kasus ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kasusBulan[bulanAkhir - 1]) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Kasus", nilai: kasusBulan, warna: "0A7A78" }], satuan: "Jumlah kasus" },
      tabel: {
        kepala: ["Penyakit", "Kasus", "Kematian"],
        kanan: [1, 2],
        lebar: [5, 1.4, 1.4],
        baris: daftar.slice(0, MAKS_BARIS_TABEL).map((p) => [p.nama, fmtAngka(p.kasus), fmtAngka(p.mati)]),
      },
      temuan,
      narasi: [CATATAN_MINGGU_KE_BULAN],
    };
  },
};
