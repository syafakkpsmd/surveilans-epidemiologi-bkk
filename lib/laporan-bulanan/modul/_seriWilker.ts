import "server-only";
import { getKamusWilker } from "@/lib/wilayah-kerja/server";
import { jumlah, jumlahPerBulan } from "./_bantu";

const PALET_WILKER = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B", "7A5C99", "B8A24A", "4A6FA5", "8C5A3C"];

/**
 * Seri grafik batang per wilayah kerja: digabung ke wilker induk, diurutkan menurut master (kolom urutan),
 * diwarnai menurut master (kolom warna; kosong = palet cadangan).
 */
export async function susunSeriWilker<T extends { bulan: number; wilayah_kerja: string | null }>(
  baris: T[],
  bulanAkhir: number,
  nilaiDari: (b: T) => number
) {
  const kamus = await getKamusWilker();
  const kodeRekap = (teks: string | null) => kamus.kodeRekapDariTeks(teks) ?? String(teks ?? "Lainnya");
  const kelompok = [...new Set(baris.map((b) => kodeRekap(b.wilayah_kerja)))];

  return kelompok
    .map((kode) => {
      const sub = baris.filter((b) => kodeRekap(b.wilayah_kerja) === kode);
      const w = kamus.dapatkan(kode);
      return {
        nama: w?.namaPendek ?? kode,
        nilai: jumlahPerBulan(sub, bulanAkhir, nilaiDari),
        urut: w?.urutan ?? 9999,
        warna: (w?.warna ?? "").replace("#", ""),
      };
    })
    .filter((s) => jumlah(s.nilai) > 0)
    .sort((a, b) => a.urut - b.urut)
    .map(({ nama, nilai, warna }, i) => ({ nama, nilai, warna: warna || PALET_WILKER[i % PALET_WILKER.length] }));
}