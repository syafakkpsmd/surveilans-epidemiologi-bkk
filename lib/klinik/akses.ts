// lib/klinik/akses.ts
// Siapa boleh melihat/mengisi data klinik mana.
//  * admin dan petugas (BKK): semua klinik.
//  * petugas_klinik: HANYA klinik yang ditautkan di `klinik_akses`; tanpa tautan = tidak ada klinik (gagal tertutup).
//  * peran lain / belum login: tidak boleh mengisi data klinik. Dashboard agregat tetap terbuka seperti semula
//    (getAksesKlinik().semua = true), kecuali untuk petugas_klinik yang dipersempit ke kliniknya.
// Penyaringan dilakukan di server (dataset), bukan di tampilan.
import { getPengguna, type Pengguna } from '@/lib/auth/session';
import { sql } from '@/lib/auth/db';

export interface KlinikRingkas {
  id: string;
  nama_klinik: string;
  spreadsheet_id: string | null;
  kategori: string | null;
}

/** Kunci sumber untuk baris ICV yang diinput lewat aplikasi (terpisah dari spreadsheet_id Google Sheets). */
export const kunciSumberApp = (klinikId: string) => `app-${klinikId}`;
export async function pastikanKunciSumber(klinik: Pick<KlinikRingkas, 'id'>): Promise<string> {
  return kunciSumberApp(klinik.id);
}

const KOLOM = 'k.id, k.nama_klinik, k.spreadsheet_id, k.kategori';

/** Klinik yang boleh diisi/dilihat per orang untuk fitur input. null/peran lain = tidak ada. */
export async function daftarKlinikDiizinkan(pengguna: Pengguna | null): Promise<KlinikRingkas[]> {
  if (!pengguna) return [];
  if (pengguna.role === 'admin' || pengguna.role === 'petugas') {
    return sql<KlinikRingkas>(`SELECT ${KOLOM} FROM klinik_binaan k ORDER BY k.nama_klinik`);
  }
  if (pengguna.role === 'petugas_klinik') {
    return sql<KlinikRingkas>(
      `SELECT ${KOLOM} FROM klinik_binaan k JOIN klinik_akses a ON a.klinik_id = k.id WHERE a.user_id = ? ORDER BY k.nama_klinik`,
      [pengguna.id],
    );
  }
  return [];
}

/** Klinik ini bila boleh diakses orang ini, selain itu null. */
export async function klinikBolehDiakses(pengguna: Pengguna | null, klinikId: string): Promise<KlinikRingkas | null> {
  return (await daftarKlinikDiizinkan(pengguna)).find((k) => k.id === klinikId) ?? null;
}

// ---------------------------------------------------------------- penyempitan dashboard

export interface AksesKlinik {
  pengguna: Pengguna | null;
  /** true = tidak dipersempit per klinik */
  semua: boolean;
  /** id klinik yang boleh dilihat bila semua=false */
  klinikIds: string[];
}

export async function getAksesKlinik(): Promise<AksesKlinik> {
  const pengguna = await getPengguna();
  if (pengguna?.role === 'petugas_klinik') {
    const rows = await sql<{ klinik_id: string }>('SELECT klinik_id FROM klinik_akses WHERE user_id = ?', [pengguna.id]);
    return { pengguna, semua: false, klinikIds: rows.map((r) => r.klinik_id) };
  }
  return { pengguna, semua: true, klinikIds: [] };
}

/** Opsi untuk getDatasetKlinik & turunannya; undefined = semua klinik. */
export function opsiDariAkses(a: AksesKlinik): { klinikIds: string[] } | undefined {
  return a.semua ? undefined : { klinikIds: a.klinikIds };
}
