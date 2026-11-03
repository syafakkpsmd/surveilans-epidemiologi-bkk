import type { HasilModul, KonteksLaporan, ModulLaporan } from "./types";

export interface OpsiJalan {
  /** Jumlah modul yang dibaca bersamaan (bawaan 4) agar tidak membanjiri Supabase/Turso. */
  konkurensi?: number;
  /** Batas waktu tiap modul dalam milidetik (bawaan 15.000). */
  batasMs?: number;
}

function denganBatas<T>(p: Promise<T>, ms: number, nama: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const habis = new Promise<never>((_, tolak) => {
    timer = setTimeout(() => tolak(new Error(`Waktu habis (${Math.round(ms / 1000)} detik) saat membaca ${nama}.`)), ms);
  });
  return Promise.race([p, habis]).finally(() => clearTimeout(timer));
}

async function jalankanSatu(m: ModulLaporan, k: KonteksLaporan, batasMs: number): Promise<HasilModul> {
  const dasar = { kunci: m.kunci, judul: m.judul, kelompok: m.kelompok };
  try {
    const data = await denganBatas(m.ambil(k), batasMs, m.judul);
    return data ? { status: "ok", ...dasar, data } : { status: "kosong", ...dasar };
  } catch (e) {
    return { status: "gagal", ...dasar, galat: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Menjalankan semua modul dengan konkurensi terbatas. Satu modul gagal atau lambat
 * tidak menggagalkan laporan: hasilnya bertanda "gagal" dan urutan sesuai daftar.
 */
export async function jalankanModul(daftar: ModulLaporan[], konteks: KonteksLaporan, opsi: OpsiJalan = {}): Promise<HasilModul[]> {
  const konkurensi = Math.max(1, opsi.konkurensi ?? 4);
  const batasMs = opsi.batasMs ?? 15_000;
  const hasil: HasilModul[] = new Array(daftar.length);
  let berikut = 0;

  async function pekerja() {
    while (berikut < daftar.length) {
      const i = berikut++;
      hasil[i] = await jalankanSatu(daftar[i], konteks, batasMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(konkurensi, daftar.length) }, pekerja));
  return hasil;
}

/** Mengelompokkan hasil menurut kelompok sambil mempertahankan urutan kemunculan. */
export function kelompokkan(hasil: HasilModul[]): { kelompok: string; item: HasilModul[] }[] {
  const peta = new Map<string, HasilModul[]>();
  for (const h of hasil) {
    const arr = peta.get(h.kelompok) ?? [];
    arr.push(h);
    peta.set(h.kelompok, arr);
  }
  return Array.from(peta, ([kelompok, item]) => ({ kelompok, item }));
}
