import "server-only";
import { getHasilPengamatanBulanan, getLokasiTidakMemenuhiSyarat, getRekapDiarePerWilker, getTrenDiareBulanan } from "@/lib/supabase/queriesVektorDiareEnhanced";
import { getWilkerRef } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal, jumlah, persenDari, petaNamaWilker } from "./_bantu";

type Jenis = "lalat" | "kecoa";

interface HasilBulan {
  label: string;
  memenuhi: number;
  tidakMemenuhi: number;
}
interface IndeksBulan {
  bulanLabel: string;
  fly_index_rerata: number | null;
  kepadatan_kecoa_rerata: number | null;
}
interface Lokasi {
  tgl_kegiatan: string;
  lokasi: string | null;
}

/** "-" bila tidak ada data sama sekali (bukan 0). */
const angka = (v: number | null | undefined) => (v == null ? "-" : fmtAngka(v));
const totalAtau = (a: (number | null)[]) => (a.some((v) => v != null) ? fmtAngka(jumlah(a.map((v) => v ?? 0))) : "-");

function buat(jenis: Jenis): ModulLaporan {
  const judul = jenis === "lalat" ? "Surveilans Vektor Diare: Lalat" : "Surveilans Vektor Diare: Kecoa";
  const namaIndeks = jenis === "lalat" ? "Fly Index" : "Kepadatan kecoa";
  const satuanIndeks = jenis === "lalat" ? "" : " per m²";
  return {
    kunci: `diare-${jenis}`,
    judul,
    kelompok: "Vektor",
    async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
      const [hasil, indeks, rekap, lokasi, wilkerRef] = await Promise.all([
        getHasilPengamatanBulanan(tahun, jenis),
        getTrenDiareBulanan(tahun, jenis),
        getRekapDiarePerWilker(tahun, jenis, bulanAkhir),
        getLokasiTidakMemenuhiSyarat(tahun, jenis),
        getWilkerRef(),
      ]);
      const h = hasil as unknown as HasilBulan[];
      const memenuhi = deretDariLabel(h, tahun, bulanAkhir, (b) => b.label, (b) => b.memenuhi, 0) as number[];
      const tidak = deretDariLabel(h, tahun, bulanAkhir, (b) => b.label, (b) => b.tidakMemenuhi, 0) as number[];
      const totalMs = jumlah(memenuhi);
      const totalTms = jumlah(tidak);
      if (totalMs + totalTms === 0) return null;

      const idx = deretDariLabel(indeks as unknown as IndeksBulan[], tahun, bulanAkhir, (b) => b.bulanLabel, (b) => (jenis === "lalat" ? b.fly_index_rerata : b.kepadatan_kecoa_rerata), null);
      const i = bulanAkhir - 1;

      // Lokasi tidak memenuhi syarat sampai bulan laporan, dikelompokkan per lokasi.
      const perLokasi = new Map<string, number>();
      for (const l of lokasi as unknown as Lokasi[]) {
        const bulan = Number(String(l.tgl_kegiatan).slice(5, 7));
        if (bulan < 1 || bulan > bulanAkhir) continue;
        const k = (l.lokasi ?? "Tanpa nama lokasi").trim() || "Tanpa nama lokasi";
        perLokasi.set(k, (perLokasi.get(k) ?? 0) + 1);
      }
      const lokasiTeratas = Array.from(perLokasi, ([nama, n]) => ({ nama, n })).sort((a, b) => b.n - a.n);

      const temuan: string[] = [];
      if (lokasiTeratas.length > 0) {
        temuan.push(`Lokasi tidak memenuhi syarat: ${fmtAngka(lokasiTeratas.reduce((s, l) => s + l.n, 0))} kejadian di ${fmtAngka(lokasiTeratas.length)} lokasi; terbanyak ${lokasiTeratas[0].nama} (${fmtAngka(lokasiTeratas[0].n)}).`);
      }

      // Tabel per wilayah kerja (kode wilker diubah menjadi nama)
      const namaWilker = petaNamaWilker(wilkerRef as unknown as Parameters<typeof petaNamaWilker>[0]);

      return {
        kunci: `diare-${jenis}`,
        judul,
        kelompok: "Vektor",
        kartu: [
          { label: "Pengamatan", nilai: fmtAngka(totalMs + totalTms), catatan: labelRentang(tahun, bulanAkhir) },
          { label: "Memenuhi syarat", nilai: fmtAngka(totalMs), catatan: fmtPersen(persenDari(totalMs, totalMs + totalTms)), nada: "ok" },
          { label: "Tidak memenuhi syarat", nilai: fmtAngka(totalTms), nada: totalTms > 0 ? "warn" : undefined },
          { label: `${namaIndeks} ${BULAN[i]}`, nilai: idx[i] == null ? "-" : `${desimal(idx[i])}${satuanIndeks}`, catatan: "rata-rata antar wilayah kerja" },
        ],
        tren: {
          jenis: "batang",
          label: labelBulanan(bulanAkhir),
          seri: [
            { nama: "Memenuhi syarat", nilai: memenuhi, warna: "0A7A78" },
            { nama: "Tidak memenuhi syarat", nilai: tidak, warna: "B3362C" },
          ],
          satuan: "Jumlah pengamatan",
        },
        tabel:
          rekap.length > 0
            ? {
                kepala: ["Wilayah kerja", "Pengamatan", "MS", "TMS", "Jml Insektisida (ml)", "Luas Area (m²)"],
                kanan: [1, 2, 3, 4, 5],
                lebar: [3, 1.2, 0.8, 0.8, 1.9, 1.7],
                baris: [
                  ...rekap.map((w) => [namaWilker.get(w.kode_wilker) ?? w.kode_wilker, fmtAngka(w.pengamatan), fmtAngka(w.ms), fmtAngka(w.tms), angka(w.insektisida_ml), angka(w.luas_m2)]),
                  [
                    "Total",
                    fmtAngka(jumlah(rekap.map((w) => w.pengamatan))),
                    fmtAngka(jumlah(rekap.map((w) => w.ms))),
                    fmtAngka(jumlah(rekap.map((w) => w.tms))),
                    totalAtau(rekap.map((w) => w.insektisida_ml)),
                    totalAtau(rekap.map((w) => w.luas_m2)),
                  ],
                ],
              }
            : undefined,
        temuan,
      };
    },
  };
}

export const modulDiareLalat = buat("lalat");
export const modulDiareKecoa = buat("kecoa");