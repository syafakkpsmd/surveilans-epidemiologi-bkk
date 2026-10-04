import "server-only";
import { getWilkerRef } from "@/lib/supabase/queries";
import type { SeriTren } from "../types";

const WARNA_WILKER = ["0A7A78", "C9781F", "10293A", "6B8E9B", "2A7A4B", "7A5C99", "3F6FB5"];
const namaPendek = (n: string) => n.replace(/^(Pelabuhan|Bandara)\s+/i, "");

/** Satu seri per wilayah kerja aktif (WK01 sampai WK07). Wilayah tanpa data sama sekali dilewati. */
export async function seriPerWilker<T>(
  ambilBaris: (kodeWilker: string) => Promise<T[]>,
  ekstrak: (baris: T[]) => (number | null)[],
): Promise<SeriTren[]> {
  const semua = await getWilkerRef().catch(() => [] as Awaited<ReturnType<typeof getWilkerRef>>);
  const daftar = semua.filter((w) => w.kode <= "WK07");
    const hasil = await Promise.all(
    daftar.map(async (w, idx) => {
      const baris = await ambilBaris(w.kode).catch((e: unknown) => {
        console.error(`[laporan] gagal ambil data wilker ${w.kode}`, e);
        return [] as T[];
      });
      return { nama: namaPendek(w.nama), nilai: ekstrak(baris), warna: WARNA_WILKER[idx % WARNA_WILKER.length] };
    }),
  );
  return hasil.filter((s) => s.nilai.some((v) => v != null));
}
/** Seri per wilayah kerja dari baris yang sudah dimuat (tanpa query tambahan). Warna konsisten dengan seriPerWilker. */
export function seriDariWilker<T>(
  daftarWilker: { kode: string; nama: string }[],
  baris: T[],
  kodeDari: (b: T) => string | null,
  ekstrak: (barisWilker: T[]) => (number | null)[],
): SeriTren[] {
  return daftarWilker
    .filter((w) => w.kode <= "WK07")
    .map((w, idx) => ({
      nama: namaPendek(w.nama),
      nilai: ekstrak(baris.filter((b) => kodeDari(b) === w.kode)),
      warna: WARNA_WILKER[idx % WARNA_WILKER.length],
    }))
    .filter((s) => s.nilai.some((v) => v != null));
}