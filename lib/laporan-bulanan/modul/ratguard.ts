import "server-only";
import { getRingkasanRatGuardBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, persenDari, temuanPoin } from "./_bantu";

const JUDUL = "Pengawasan Kepatuhan Pemasangan Rat Guard";

/**
 * Urutan legenda disesuaikan secara presisi:
 * 1. Samarinda
 * 2. Tanjung Santan
 * 3. Tanjung Laut
 * 4. Lhoktuan
 * 5. Sangatta
 * 6. Sangkulirang
 */
const URUTAN_WILKER = [
  "samarinda",
  "santan",
  "tanjunglaut",
  "lhoktuan",
  "sangatta",
  "sangkulirang",
];

/**
 * Palette Warna (Palet dibuat sangat kontras):
 * - Samarinda   : 0A7A78 (Tosca)
 * - Santan      : 10293A (Biru Gelap/Navy)
 * - Tanjung Laut: 6B8E9B (Biru Abu-abu)
 * - Lhoktuan    : B3362C (Merah)
 * - Sangatta    : E67E22 (Orange Cerah - Pengganti Hijau agar tidak mirip Samarinda)
 * - Sangkulirang: 7A5C99 (Ungu)
 */
const WARNA_WILKER = [
  "0A7A78", // Samarinda
  "10293A", // Tanjung Santan
  "6B8E9B", // Tanjung Laut
  "B3362C", // Lhoktuan
  "E67E22", // Sangatta (Sudah diubah)
  "7A5C99", // Sangkulirang
];
const WARNA_LAIN = "B8A24A";

function urutWilker(nama: string): number {
  const n = nama.toLowerCase().replace(/\s+/g, "");
  
  // Mencari index urutan wilker secara tepat
  for (let i = 0; i < URUTAN_WILKER.length; i++) {
    if (n.includes(URUTAN_WILKER[i])) {
      return i;
    }
  }
  return URUTAN_WILKER.length;
}

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

    // Menyusun seri grafik batang per wilayah kerja
    const wilkerDari = (b: Baris) => b.wilayah_kerja ?? "Lainnya";
    const seriWilker = [...new Set(baris.map(wilkerDari))]
      .map((k) => {
        const sub = baris.filter((b) => wilkerDari(b) === k);
        const nama =
          jumlahPerWilker(sub, bulanAkhir, { kapal: (b) => b.jumlah_kapal ?? 0 })[0]?.nama ?? String(k);
        return { nama, nilai: jumlahPerBulan(sub, bulanAkhir, (b) => b.jumlah_kapal ?? 0) };
      })
      .filter((s) => jumlah(s.nilai) > 0)
      .map((s) => ({ nama: s.nama, nilai: s.nilai, urut: urutWilker(s.nama) }))
      .sort((a, b) => a.urut - b.urut)
      .map(({ nama, nilai, urut }) => ({
        nama,
        nilai,
        warna: WARNA_WILKER[urut] ?? WARNA_LAIN,
      }));

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

      // Grafik Tren dalam bentuk BATANG per Wilayah Kerja (Sesuai COP/PHQC)
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