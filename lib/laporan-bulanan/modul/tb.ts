import "server-only";
import { getWilkerRef } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { ambilSemuaHalaman, jumlah, jumlahPerBulan, persenDari, petaNamaWilker } from "./_bantu";

const JUDUL = "Surveilans TB";

const akhirBulan = (tahun: number, bulan: number): string => new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);

/** Kolom tabel tb_data yang dipakai. Dashboard TB hanya mingguan, jadi bulanan dihitung dari data mentah. */
interface Baris {
  tgl_penemuan: string;
  kode_wilker: string | null;
  jml_suspek: number | null;
  jml_diperiksa_tcm: number | null;
  jml_positif_tcm: number | null;
  jml_kontak_erat: number | null;
  jml_kontak_diperiksa: number | null;
  jml_mulai_pengobatan: number | null;
}

export const modulTb: ModulLaporan = {
  kunci: "tb",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const supabase = await createClient();
    const [data, wilker] = await Promise.all([
      ambilSemuaHalaman((dari, sampai) =>
        supabase
          .from("tb_data")
          .select("tgl_penemuan, kode_wilker, jml_suspek, jml_diperiksa_tcm, jml_positif_tcm, jml_kontak_erat, jml_kontak_diperiksa, jml_mulai_pengobatan")
          .gte("tgl_penemuan", `${tahun}-01-01`)
          .lte("tgl_penemuan", akhirBulan(tahun, bulanAkhir))
          .order("tgl_penemuan")
          .order("id")
          .range(dari, sampai),
      ),
      getWilkerRef(),
    ]);
    const baris = (data as Baris[]).map((b) => ({ ...b, bulan: Number(String(b.tgl_penemuan).slice(5, 7)), wilayah_kerja: b.kode_wilker }));
    if (baris.length === 0) return null;

    const suspek = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_suspek ?? 0);
    const diperiksa = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_diperiksa_tcm ?? 0);
    const positif = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_positif_tcm ?? 0);
    const kontakErat = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_kontak_erat ?? 0));
    const kontakPeriksa = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_kontak_diperiksa ?? 0));
    const pengobatan = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_mulai_pengobatan ?? 0));
    if (jumlah(suspek) + jumlah(diperiksa) + jumlah(positif) === 0) return null;

    const nama = petaNamaWilker(wilker as unknown as Parameters<typeof petaNamaWilker>[0]);
    const perWilker = new Map<string, { suspek: number; diperiksa: number; positif: number }>();
    for (const b of baris) {
      if (b.bulan < 1 || b.bulan > bulanAkhir) continue;
      const k = nama.get(b.kode_wilker ?? "") ?? b.kode_wilker ?? "-";
      const x = perWilker.get(k) ?? { suspek: 0, diperiksa: 0, positif: 0 };
      x.suspek += b.jml_suspek ?? 0;
      x.diperiksa += b.jml_diperiksa_tcm ?? 0;
      x.positif += b.jml_positif_tcm ?? 0;
      perWilker.set(k, x);
    }
    const tabel = Array.from(perWilker, ([w, v]) => ({ w, ...v })).sort((a, b) => b.positif - a.positif || b.suspek - a.suspek);
    const i = bulanAkhir - 1;
    const totalPositif = jumlah(positif);

    const temuan: string[] = [];
    if (totalPositif > 0) {
      temuan.push(`Terdapat ${fmtAngka(totalPositif)} hasil TCM positif dari ${fmtAngka(jumlah(diperiksa))} orang diperiksa (${fmtPersen(persenDari(totalPositif, jumlah(diperiksa)))}).`);
      if (tabel.length > 1 && tabel[0].positif > 0) temuan.push(`TCM positif terbanyak di ${tabel[0].w} (${fmtAngka(tabel[0].positif)}).`);
    } else temuan.push("Tidak ada hasil TCM positif pada periode ini.");
    if (kontakErat > 0) temuan.push(`Kontak erat teridentifikasi ${fmtAngka(kontakErat)} orang, ${fmtAngka(kontakPeriksa)} di antaranya diperiksa.`);

    return {
      kunci: "tb",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Suspek TB", nilai: fmtAngka(jumlah(suspek)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Diperiksa TCM", nilai: fmtAngka(jumlah(diperiksa)) },
        { label: "Positif TCM", nilai: fmtAngka(totalPositif), nada: totalPositif > 0 ? "bad" : "ok", catatan: `${fmtAngka(pengobatan)} mulai pengobatan` },
        { label: `Suspek ${BULAN[i]}`, nilai: fmtAngka(suspek[i]) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Suspek", nilai: suspek, warna: "6B8E9B" },
          { nama: "Diperiksa TCM", nilai: diperiksa, warna: "0A7A78" },
          { nama: "Positif TCM", nilai: positif, warna: "B3362C" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Suspek", "Diperiksa TCM", "Positif TCM"],
        kanan: [1, 2, 3],
        lebar: [3, 1.2, 1.7, 1.5],
        baris: tabel.map((t) => [t.w, fmtAngka(t.suspek), fmtAngka(t.diperiksa), fmtAngka(t.positif)]),
      },
      temuan,
    };
  },
};
