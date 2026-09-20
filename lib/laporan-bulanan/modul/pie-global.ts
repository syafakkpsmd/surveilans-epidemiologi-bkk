import "server-only";
import { getRingkasanPenyakitEmerging } from "@/lib/supabase/global-emerging-queries";
import { createClient } from "@/lib/supabase/server";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan } from "./_bantu";

const JUDUL = "PIE Global";
const MAKS_BARIS_TABEL = 15;

/** Baris view_bulanan_penyakit_emerging (lihat RingkasanPenyakitEmerging). */
interface Baris {
  bulan: number | null;
  penyakit: string | null;
  negara: string | null;
  total_kasus: number | null;
  total_kematian: number | null;
}

export const modulPieGlobal: ModulLaporan = {
  kunci: "pie-global",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const supabase = await createClient();
    const semua = (await getRingkasanPenyakitEmerging(supabase, { jenis: "bulanan", tahunEpid: tahun })) as unknown as Baris[];
    const baris = semua.filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir).map((b) => ({ ...b, bulan: Number(b.bulan) }));
    if (baris.length === 0) return null;

    const kasus = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_kasus ?? 0);
    const mati = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_kematian ?? 0);
    const totalKasus = jumlah(kasus);
    const totalMati = jumlah(mati);
    if (totalKasus === 0 && totalMati === 0) return null;

    const perPenyakit = new Map<string, { kasus: number; mati: number }>();
    const perNegara = new Map<string, number>();
    for (const b of baris) {
      const p = (b.penyakit ?? "Tanpa nama").trim();
      const x = perPenyakit.get(p) ?? { kasus: 0, mati: 0 };
      x.kasus += Number(b.total_kasus) || 0;
      x.mati += Number(b.total_kematian) || 0;
      perPenyakit.set(p, x);
      const n = (b.negara ?? "-").trim();
      perNegara.set(n, (perNegara.get(n) ?? 0) + (Number(b.total_kasus) || 0));
    }
    const daftar = Array.from(perPenyakit, ([nama, v]) => ({ nama, ...v })).filter((p) => p.kasus > 0 || p.mati > 0).sort((a, b) => b.kasus - a.kasus);
    const negara = Array.from(perNegara, ([nama, n]) => ({ nama, n })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);

    const temuan: string[] = [];
    if (daftar.length > 0) temuan.push(`Kasus terbanyak: ${daftar[0].nama} (${fmtAngka(daftar[0].kasus)} kasus).`);
    if (negara.length > 0) temuan.push(`Negara dengan kasus terbanyak: ${negara[0].nama} (${fmtAngka(negara[0].n)} kasus).`);

    return {
      kunci: "pie-global",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total kasus", nilai: fmtAngka(totalKasus), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Total kematian", nilai: fmtAngka(totalMati), nada: totalMati > 0 ? "bad" : undefined },
        { label: "Penyakit dilaporkan", nilai: fmtAngka(daftar.length), catatan: `${fmtAngka(negara.length)} negara` },
        { label: `Kasus ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kasus[bulanAkhir - 1]) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Kasus", nilai: kasus, warna: "0A7A78" }], satuan: "Jumlah kasus" },
      tabel: {
        kepala: ["Penyakit", "Kasus", "Kematian"],
        kanan: [1, 2],
        lebar: [5, 1.4, 1.4],
        baris: daftar.slice(0, MAKS_BARIS_TABEL).map((p) => [p.nama, fmtAngka(p.kasus), fmtAngka(p.mati)]),
      },
      temuan,
    };
  },
};
