import "server-only";
import { getWilkerRef } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { ambilSemuaHalaman, jumlah, jumlahPerBulan, persenDari, petaNamaWilker } from "./_bantu";

const JUDUL = "Surveilans HIV";

const akhirBulan = (tahun: number, bulan: number): string => new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);

/** Kolom tabel hiv_data yang dipakai. Dashboard HIV hanya mingguan, jadi bulanan dihitung dari data mentah. */
interface Baris {
  tgl_skrining: string;
  kode_wilker: string | null;
  jml_ditawarkan: number | null;
  jml_diperiksa: number | null;
  jml_reaktif: number | null;
  jml_konfirmasi_positif: number | null;
  jml_dirujuk_vct: number | null;
}

export const modulHiv: ModulLaporan = {
  kunci: "hiv",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const supabase = await createClient();
    const [data, wilker] = await Promise.all([
      ambilSemuaHalaman((dari, sampai) =>
        supabase
          .from("hiv_data")
          .select("tgl_skrining, kode_wilker, jml_ditawarkan, jml_diperiksa, jml_reaktif, jml_konfirmasi_positif, jml_dirujuk_vct")
          .gte("tgl_skrining", `${tahun}-01-01`)
          .lte("tgl_skrining", akhirBulan(tahun, bulanAkhir))
          .order("tgl_skrining")
          .order("id")
          .range(dari, sampai),
      ),
      getWilkerRef(),
    ]);
    const baris = (data as Baris[]).map((b) => ({ ...b, bulan: Number(String(b.tgl_skrining).slice(5, 7)), wilayah_kerja: b.kode_wilker }));
    if (baris.length === 0) return null;

    const ditawarkan = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_ditawarkan ?? 0);
    const diperiksa = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_diperiksa ?? 0);
    const reaktif = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_reaktif ?? 0);
    const konfirmasi = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_konfirmasi_positif ?? 0);
    const vct = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_dirujuk_vct ?? 0));
    if (jumlah(diperiksa) + jumlah(ditawarkan) === 0) return null;

    const nama = petaNamaWilker(wilker as unknown as Parameters<typeof petaNamaWilker>[0]);
    const perWilker = new Map<string, { diperiksa: number; reaktif: number; konfirmasi: number }>();
    for (const b of baris) {
      if (b.bulan < 1 || b.bulan > bulanAkhir) continue;
      const k = nama.get(b.kode_wilker ?? "") ?? b.kode_wilker ?? "-";
      const x = perWilker.get(k) ?? { diperiksa: 0, reaktif: 0, konfirmasi: 0 };
      x.diperiksa += b.jml_diperiksa ?? 0;
      x.reaktif += b.jml_reaktif ?? 0;
      x.konfirmasi += b.jml_konfirmasi_positif ?? 0;
      perWilker.set(k, x);
    }
    const tabel = Array.from(perWilker, ([w, v]) => ({ w, ...v })).sort((a, b) => b.diperiksa - a.diperiksa);
    const i = bulanAkhir - 1;
    const totalDiperiksa = jumlah(diperiksa);
    const totalReaktif = jumlah(reaktif);

    const temuan: string[] = [];
    if (totalDiperiksa > 0) temuan.push(`Hasil reaktif ${fmtAngka(totalReaktif)} dari ${fmtAngka(totalDiperiksa)} orang diperiksa (${fmtPersen(persenDari(totalReaktif, totalDiperiksa))}).`);
    if (jumlah(konfirmasi) > 0) temuan.push(`${fmtAngka(jumlah(konfirmasi))} orang terkonfirmasi positif; ${fmtAngka(vct)} dirujuk ke layanan VCT.`);

    return {
      kunci: "hiv",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Ditawarkan skrining", nilai: fmtAngka(jumlah(ditawarkan)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Diperiksa", nilai: fmtAngka(totalDiperiksa) },
        { label: "Reaktif", nilai: fmtAngka(totalReaktif), nada: totalReaktif > 0 ? "warn" : "ok", catatan: `${fmtAngka(jumlah(konfirmasi))} konfirmasi positif` },
        { label: `Diperiksa ${BULAN[i]}`, nilai: fmtAngka(diperiksa[i]) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Diperiksa", nilai: diperiksa, warna: "0A7A78" },
          { nama: "Reaktif", nilai: reaktif, warna: "B3362C" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Diperiksa", "Reaktif", "Konfirmasi positif"],
        kanan: [1, 2, 3],
        lebar: [3, 1.3, 1.3, 2],
        baris: tabel.map((t) => [t.w, fmtAngka(t.diperiksa), fmtAngka(t.reaktif), fmtAngka(t.konfirmasi)]),
      },
      temuan,
    };
  },
};
