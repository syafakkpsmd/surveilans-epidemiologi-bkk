import "server-only";
import { getRingkasanRatGuardBulanan } from "@/lib/db/queries/umum";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, persenDari, temuanPoin } from "./_bantu";
import { susunSeriWilker } from "./_seriWilker";

const JUDUL = "Pengawasan Kepatuhan Pemasangan Rat Guard";

/** Kolom view_rat_guard_bulanan yang dipakai. */
interface Baris {
  bulan: number;
  wilayah_kerja: string | null;
  jumlah_kapal: number | null;
  pasang: number | null;
  tidak_pasang: number | null;
}

export const modulRatGuard: ModulLaporan = {
  kunci: "ratguard",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = ((await getRingkasanRatGuardBulanan(tahun)) as Baris[]).filter(
      (b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir
    );
    if (baris.length === 0) return null;

    const kapal = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_kapal ?? 0);
    const pasang = jumlahPerBulan(baris, bulanAkhir, (b) => b.pasang ?? 0);
    const tidak = jumlahPerBulan(baris, bulanAkhir, (b) => b.tidak_pasang ?? 0);
    const totalKapal = jumlah(kapal);
    if (totalKapal === 0) return null;

    // Kepatuhan kumulatif
    const kepatuhan = pasang.map((p, i) => persenDari(p, p + tidak[i]));
    const totalPasang = jumlah(pasang);
    const totalTidak = jumlah(tidak);

    // Rekap Per Wilayah Kerja
    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      kapal: (b) => b.jumlah_kapal ?? 0,
      pasang: (b) => b.pasang ?? 0,
      tidak: (b) => b.tidak_pasang ?? 0,
    }).map((w) => ({
      ...w,
      persen: persenDari(w.nilai.pasang, w.nilai.pasang + w.nilai.tidak),
    }));

    // Seri grafik batang per wilayah kerja
    const seriWilker = await susunSeriWilker(baris, bulanAkhir, (b) => b.jumlah_kapal ?? 0);

    // Menyusun temuan otomatis
    const temuan = temuanPoin(kepatuhan, "Kepatuhan pemasangan rat guard");
    const denganPersen = perWilker.filter((w): w is typeof w & { persen: number } => w.persen != null);
    if (denganPersen.length >= 2) {
      const terendah = [...denganPersen].sort((a, b) => a.persen - b.persen)[0];
      const tertinggi = [...denganPersen].sort((a, b) => b.persen - a.persen)[0];
      if (terendah.persen < tertinggi.persen) {
        temuan.push(
          `Kepatuhan terendah di ${terendah.nama} (${fmtPersen(terendah.persen)}), tertinggi di ${tertinggi.nama} (${fmtPersen(tertinggi.persen)}).`
        );
      }
    }

    return {
      kunci: "ratguard",
      judul: JUDUL,
      kelompok: "Faktor Risiko",

      // Kartu statistik utama
      kartu: [
        { label: "Kapal diperiksa", nilai: fmtAngka(totalKapal), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Rat guard terpasang", nilai: fmtAngka(totalPasang), catatan: `Kepatuhan ${fmtPersen(persenDari(totalPasang, totalPasang + totalTidak))}` },
        { label: "Tidak terpasang", nilai: fmtAngka(totalTidak), nada: totalTidak > 0 ? "warn" : undefined },
        { label: `Kepatuhan ${BULAN[bulanAkhir - 1]}`, nilai: fmtPersen(kepatuhan[bulanAkhir - 1]) },
      ],

      // Grafik Tren dalam bentuk BATANG per Wilayah Kerja (sesuai COP/PHQC)
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: seriWilker,
        satuan: "Jumlah kapal",
      },

      // Tabel Rincian per Wilayah Kerja
      tabel: {
        kepala: ["Wilayah kerja", "Kapal", "Terpasang", "Tidak terpasang", "Kepatuhan"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1, 1.2, 1.5, 1.3],
        baris: perWilker.map((w) => [
          w.nama,
          fmtAngka(w.nilai.kapal),
          fmtAngka(w.nilai.pasang),
          fmtAngka(w.nilai.tidak),
          fmtPersen(w.persen),
        ]),
      },

      temuan,
    };
  },
};