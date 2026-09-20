import "server-only";
import { getHasilPengamatanBulanan, getHasilPengamatanPerWilkerBulanan, getLokasiTidakMemenuhiSyarat, getTrenDiareBulanan } from "@/lib/supabase/queriesVektorDiareEnhanced";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal, jumlah, persenDari } from "./_bantu";

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

function buat(jenis: Jenis): ModulLaporan {
  const judul = jenis === "lalat" ? "Vektor Diare: Lalat" : "Vektor Diare: Kecoa";
  const namaIndeks = jenis === "lalat" ? "Fly Index" : "Kepadatan kecoa";
  const satuanIndeks = jenis === "lalat" ? "" : " per m²";
  return {
    kunci: `diare-${jenis}`,
    judul,
    kelompok: "Vektor",
    async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
      const [hasil, indeks, wilker, lokasi] = await Promise.all([
        getHasilPengamatanBulanan(tahun, jenis),
        getTrenDiareBulanan(tahun, jenis),
        getHasilPengamatanPerWilkerBulanan(tahun, jenis, 1, bulanAkhir),
        getLokasiTidakMemenuhiSyarat(tahun, jenis),
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
        tabel: {
          kepala: ["Wilayah kerja", "Pengamatan"],
          kanan: [1],
          lebar: [4, 1.5],
          baris: (wilker as unknown as { wilayah: string; jumlah: number }[]).map((w) => [w.wilayah, fmtAngka(w.jumlah)]),
        },
        temuan,
      };
    },
  };
}

export const modulDiareLalat = buat("lalat");
export const modulDiareKecoa = buat("kecoa");
