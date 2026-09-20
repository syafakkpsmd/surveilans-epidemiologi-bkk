import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { ambilSemuaHalaman, CATATAN_MINGGU_KE_BULAN, jumlah, mingguDalamPeriode } from "./_bantu";

const JUDUL = "SKDR BKK Samarinda";
const MAKS_BARIS_TABEL = 15;

/** Kolom view_skdr_alert_mingguan yang dipakai. */
interface Baris {
  minggu_epid: number | null;
  jenis_penyakit: string | null;
  jumlah_kasus: number | null;
  status_alert: boolean | null;
  wilayah_kerja: string | null;
}

export const modulSkdr: ModulLaporan = {
  kunci: "skdr",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const minggu = mingguDalamPeriode(tahun, bulanAkhir);
    if (minggu.length === 0) return null;
    const bulanDariMinggu = new Map(minggu.map((m) => [m.minggu, m.bulan]));
    const supabase = await createClient();

    const baris = (await ambilSemuaHalaman((dari, sampai) =>
      supabase
        .from("view_skdr_alert_mingguan")
        .select("minggu_epid, jenis_penyakit, jumlah_kasus, status_alert, wilayah_kerja")
        .eq("tahun_epid", tahun)
        .in("minggu_epid", minggu.map((m) => m.minggu))
        .order("id")
        .range(dari, sampai),
    )) as Baris[];
    if (baris.length === 0) return null;

    const kasusBulan = new Array<number>(bulanAkhir).fill(0);
    const alertBulan = new Array<number>(bulanAkhir).fill(0);
    const perPenyakit = new Map<string, { kasus: number; alert: number }>();
    const alertWilker = new Map<string, number>();
    for (const b of baris) {
      const bulan = bulanDariMinggu.get(Number(b.minggu_epid));
      if (!bulan) continue;
      const kasus = Number(b.jumlah_kasus) || 0;
      const nama = (b.jenis_penyakit ?? "Tanpa nama").trim();
      const x = perPenyakit.get(nama) ?? { kasus: 0, alert: 0 };
      x.kasus += kasus;
      kasusBulan[bulan - 1] += kasus;
      if (b.status_alert === true) {
        x.alert += 1;
        alertBulan[bulan - 1] += 1;
        const w = (b.wilayah_kerja ?? "-").trim() || "-";
        alertWilker.set(w, (alertWilker.get(w) ?? 0) + 1);
      }
      perPenyakit.set(nama, x);
    }
    const totalKasus = jumlah(kasusBulan);
    const totalAlert = jumlah(alertBulan);
    if (totalKasus === 0 && totalAlert === 0) return null;

    const daftar = Array.from(perPenyakit, ([nama, v]) => ({ nama, ...v }))
      .filter((p) => p.kasus > 0 || p.alert > 0)
      .sort((a, b) => b.alert - a.alert || b.kasus - a.kasus);
    const penyakitAlert = daftar.filter((p) => p.alert > 0);
    const wilkerAlert = Array.from(alertWilker, ([nama, n]) => ({ nama, n })).sort((a, b) => b.n - a.n);

    const temuan: string[] = [];
    if (penyakitAlert.length > 0) temuan.push(`Alert terbanyak: ${penyakitAlert[0].nama} (${fmtAngka(penyakitAlert[0].alert)} kali).`);
    if (wilkerAlert.length > 1) temuan.push(`Wilayah kerja dengan alert terbanyak: ${wilkerAlert[0].nama} (${fmtAngka(wilkerAlert[0].n)} kali).`);

    return {
      kunci: "skdr",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total kasus dilaporkan", nilai: fmtAngka(totalKasus), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Alert SKDR", nilai: fmtAngka(totalAlert), nada: totalAlert > 0 ? "warn" : "ok", catatan: "penyakit x wilayah x minggu" },
        { label: "Penyakit dengan alert", nilai: fmtAngka(penyakitAlert.length) },
        { label: `Alert ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(alertBulan[bulanAkhir - 1]) },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Jumlah alert", nilai: alertBulan, warna: "8F5B00" }], satuan: "Jumlah alert" },
      tabel: {
        kepala: ["Penyakit", "Total kasus", "Alert (kali)"],
        kanan: [1, 2],
        lebar: [5, 1.4, 1.4],
        baris: daftar.slice(0, MAKS_BARIS_TABEL).map((p) => [p.nama, fmtAngka(p.kasus), fmtAngka(p.alert)]),
      },
      temuan,
      narasi: [CATATAN_MINGGU_KE_BULAN],
    };
  },
};
