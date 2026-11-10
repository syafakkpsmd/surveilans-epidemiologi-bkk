// lib/input-data/perbarui.ts
// Baca dan perbarui SATU baris modul input data (tombol "Edit" di daftar). Hanya dipanggil dari route
// /api/input-data/{modul}/..., SETELAH pemeriksaan peran dan validasiBaris. Nama tabel/kolom berasal dari
// konfigurasi modul (hardcode), bukan dari input pengguna; nilai selalu lewat parameter (?).
import { getDbClient } from '@/lib/db/client';
import type { DbValue } from '@/lib/db/client';
import type { ModulInput } from './modul';
import type { NilaiBaris } from './validasi';

export type HasilPerbarui = 'ok' | 'tidak_ada' | 'duplikat';

const ID_SAH = /^[0-9a-fA-F-]{1,36}$/;
const dua = (n: number) => String(n).padStart(2, '0');

/** Kolom yang benar-benar ada di tabel (kolom turunan dihitung ulang saat validasi, tetap ikut ditulis). */
const kolomTabel = (m: ModulInput) => m.kolom.filter((k) => !k.turunan);

/** SQL: huruf kecil, spasi beruntun jadi satu, pinggir dipangkas (sama dengan cara kunciBaris membandingkan). */
const rapi = (kol: string) => `lower(regexp_replace(trim("${kol}"::text), '\\s+', ' ', 'g'))`;
const rapiJs = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function ambilBaris(modul: ModulInput, id: string): Promise<NilaiBaris | null> {
  if (!ID_SAH.test(id)) return null;
  const kolom = kolomTabel(modul);
  const hasil = await getDbClient().execute({
    sql: `SELECT ${kolom.map((k) => `"${k.nama}"`).join(', ')} FROM "${modul.tabel}" WHERE id::text = ? LIMIT 1`,
    args: [id],
  });
  const baris = hasil.rows[0] as Record<string, unknown> | undefined;
  if (!baris) return null;
  const keluar: NilaiBaris = {};
  for (const k of kolom) {
    const v = baris[k.nama];
    if (v == null) keluar[k.nama] = null;
    else if (typeof v === 'number') keluar[k.nama] = v;
    else if (v instanceof Date) keluar[k.nama] = k.tipe === 'tanggal' ? `${v.getFullYear()}-${dua(v.getMonth() + 1)}-${dua(v.getDate())}` : v.toISOString();
    else keluar[k.nama] = String(v);
  }
  return keluar;
}

/** `nilai` = hasil validasiBaris (sudah lengkap dan sah). Menimpa SEMUA kolom, termasuk mengosongkan isian. */
export async function perbaruiBaris(modul: ModulInput, id: string, nilai: NilaiBaris): Promise<HasilPerbarui> {
  if (!ID_SAH.test(id)) return 'tidak_ada';
  const db = getDbClient();
  const tabel = `"${modul.tabel}"`;

  // Jangan sampai suntingan menyamai baris LAIN (kunci: wilayah + kunci + tanggal [+ pembeda]).
  const w = nilai[modul.kolomWilayah];
  const k = nilai[modul.kolomKunci];
  const t = nilai[modul.kolomTanggal];
  if (w != null && k != null && t != null) {
    const syarat = [
      'id::text <> ?',
      `lower(replace("${modul.kolomWilayah}"::text, ' ', '')) = ?`,
      `${rapi(modul.kolomKunci)} = ?`,
      `"${modul.kolomTanggal}"::text = ?`,
    ];
    const args: DbValue[] = [id, String(w).toLowerCase().replace(/\s+/g, ''), rapiJs(k), String(t)];
    for (const c of modul.kolomKunciTambahan ?? []) {
      syarat.push(`${rapi(c)} = ?`);
      args.push(rapiJs(nilai[c]));
    }
    const bentrok = await db.execute({ sql: `SELECT 1 FROM ${tabel} WHERE ${syarat.join(' AND ')} LIMIT 1`, args });
    if (bentrok.rows.length) return 'duplikat';
  }

  const kolom = modul.kolom.filter((c) => c.nama in nilai);
  const hasil = await db.execute({
    sql: `UPDATE ${tabel} SET ${[...kolom.map((c) => `"${c.nama}" = ?`), 'updated_at = now()'].join(', ')} WHERE id::text = ? RETURNING id::text AS id`,
    args: [...kolom.map((c) => nilai[c.nama] as DbValue), id],
  });
  return hasil.rows.length ? 'ok' : 'tidak_ada';
}