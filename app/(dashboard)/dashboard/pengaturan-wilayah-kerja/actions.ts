// app/(dashboard)/dashboard/pengaturan-wilayah-kerja/actions.ts
'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getDbClient } from '@/lib/db/client';
import { DAFTAR_JENIS_WILKER, type JenisWilker } from '@/lib/wilayah-kerja';
import { TAG_WILKER } from '@/lib/wilayah-kerja/server';
import { DAFTAR_KUNCI_MODUL } from '@/lib/wilayah-kerja/modul';

const HALAMAN = '/dashboard/pengaturan-wilayah-kerja';

async function wajibAdmin() {
  if ((await getUserRole()) !== 'admin') throw new Error('Hanya admin yang boleh mengubah wilayah kerja.');
}

function kembali(pesan: string): never {
  redirect(`${HALAMAN}?error=${encodeURIComponent(pesan)}`);
}

function selesai(): never {
  updateTag(TAG_WILKER);
  revalidatePath('/', 'layout');
  redirect(`${HALAMAN}?ok=1`);
}

const teks = (f: FormData, k: string) => String(f.get(k) ?? '').replace(/\s+/g, ' ').trim();

function bacaKoordinat(f: FormData): { lat: number; lng: number } {
  const lat = Number(String(f.get('lat') ?? '').replace(',', '.'));
  const lng = Number(String(f.get('lng') ?? '').replace(',', '.'));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) kembali('Lintang (lat) harus berupa angka antara -90 dan 90.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) kembali('Bujur (lng) harus berupa angka antara -180 dan 180.');
  return { lat, lng };
}

function bacaJenis(f: FormData): JenisWilker {
  const j = teks(f, 'jenis');
  const ketemu = DAFTAR_JENIS_WILKER.find((x) => x === j);
  if (!ketemu) kembali('Jenis wilayah tidak valid.');
  return ketemu!;
}

/** Pusat tampilan peta (opsional, harus berpasangan) dan zoom 3-19. */
function bacaPeta(f: FormData): { petaLat: number | null; petaLng: number | null; zoom: number } {
  const lat = String(f.get('peta_lat') ?? '').trim().replace(',', '.');
  const lng = String(f.get('peta_lng') ?? '').trim().replace(',', '.');
  const zoom = Math.trunc(Number(String(f.get('zoom') ?? '13').trim() || 13));
  if (!Number.isFinite(zoom) || zoom < 3 || zoom > 19) kembali('Zoom peta harus antara 3 dan 19.');
  if (!lat && !lng) return { petaLat: null, petaLng: null, zoom };
  const a = Number(lat);
  const b = Number(lng);
  if (!lat || !lng || !Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) {
    kembali('Pusat peta harus diisi lintang dan bujur yang valid, atau dikosongkan keduanya.');
  }
  return { petaLat: a, petaLng: b, zoom };
}

/** Unit pelapor SKDR (satu per baris): semuanya harus melapor agar wilayah dianggap "Sudah"; kosong = cukup 1 laporan. */
function bacaUnitSkdr(f: FormData): string[] {
  return String(f.get('skdr_unit') ?? '')
    .split(/\r?\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function bacaSubLokasi(f: FormData): string[] {
  return String(f.get('sub_lokasi') ?? '')
    .split(/\r?\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function bacaWarna(f: FormData): string | null {
  const w = teks(f, 'warna');
  if (!w) return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(w)) kembali('Warna harus berformat #RRGGBB.');
  return w;
}

function pesanGalat(e: unknown, bawaan: string): string {
  const err = e as { code?: string; constraint?: string; message?: string };
  if (err?.code === '42703') return 'Kolom database belum lengkap. Jalankan migrasi 20, 22, 23, 24, dan 25 (scripts/migrate/).';
  if (err?.code === '23505') {
    if (err.constraint?.includes('nama')) return 'Nama wilayah kerja itu sudah ada.';
    if (err.constraint?.includes('alias')) return 'Penulisan itu sudah terdaftar untuk wilayah kerja lain.';
    return 'Data yang sama sudah ada.';
  }
  console.error('[pengaturan-wilayah-kerja]', err?.message);
  return bawaan;
}

/** Kode berikutnya: WK + nomor terbesar yang ada + 1 (WK08, WK09, ...). */
export async function tambahWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const nama = teks(formData, 'nama');
  const namaPendek = teks(formData, 'nama_pendek');
  const namaPeta = teks(formData, 'nama_peta') || namaPendek;
  const jenis = bacaJenis(formData);
  const { lat, lng } = bacaKoordinat(formData);
  const subLokasi = bacaSubLokasi(formData);
  const warna = bacaWarna(formData);
  const peta = bacaPeta(formData);
  const catatan = teks(formData, 'catatan') || null;

  if (nama.length < 3) kembali('Nama wilayah kerja minimal 3 karakter.');
  if (namaPendek.length < 2) kembali('Nama pendek minimal 2 karakter.');

  const db = getDbClient();
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    try {
      await db.execute({
        sql: `INSERT INTO wilker_ref (kode, nama, jenis, lat, lng, sub_lokasi, catatan, nama_pendek, nama_peta, warna, peta_lat, peta_lng, zoom, skdr_unit, urutan, aktif)
              SELECT 'WK' || lpad((COALESCE(MAX(NULLIF(regexp_replace(kode, '\\D', '', 'g'), '')::int), 0) + 1)::text, 2, '0'),
                     ?::text, ?::text, ?::numeric, ?::numeric, ?::text[], ?::text, ?::text, ?::text, ?::text,
                     ?::numeric, ?::numeric, ?::smallint, ?::text[],
                     COALESCE(MAX(urutan), 0) + 1, true
                FROM wilker_ref`,
        args: [nama, jenis, lat, lng, subLokasi, catatan, namaPendek, namaPeta, warna, peta.petaLat, peta.petaLng, peta.zoom, bacaUnitSkdr(formData)],
      });
      selesai();
    } catch (e) {
      // 23505 pada primary key = dua admin menambah bersamaan; ulangi agar mendapat nomor berikutnya.
      const err = e as { code?: string; constraint?: string };
      if (err?.code === '23505' && err.constraint === 'wilker_ref_pkey') continue;
      if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
      kembali(pesanGalat(e, 'Gagal menambah wilayah kerja.'));
    }
  }
  kembali('Gagal membuat kode baru, coba lagi.');
}

export async function perbaruiWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const kode = teks(formData, 'kode');
  const nama = teks(formData, 'nama');
  const namaPendek = teks(formData, 'nama_pendek');
  const namaPeta = teks(formData, 'nama_peta') || namaPendek;
  const jenis = bacaJenis(formData);
  const { lat, lng } = bacaKoordinat(formData);
  const urutan = Math.trunc(Number(teks(formData, 'urutan')) || 0);
  const peta = bacaPeta(formData);

  if (!kode) kembali('Kode wilayah tidak ada.');
  if (nama.length < 3) kembali('Nama wilayah kerja minimal 3 karakter.');
  if (namaPendek.length < 2) kembali('Nama pendek minimal 2 karakter.');

  try {
    const r = await getDbClient().execute({
      sql: `UPDATE wilker_ref
               SET nama = ?, nama_pendek = ?, nama_peta = ?, jenis = ?, lat = ?, lng = ?,
                   sub_lokasi = ?, catatan = ?, warna = ?, urutan = ?,
                   peta_lat = ?, peta_lng = ?, zoom = ?, skdr_unit = ?
             WHERE kode = ?`,
      args: [nama, namaPendek, namaPeta, jenis, lat, lng, bacaSubLokasi(formData), teks(formData, 'catatan') || null, bacaWarna(formData), urutan, peta.petaLat, peta.petaLng, peta.zoom, bacaUnitSkdr(formData), kode],
    });
    if (r.rowsAffected === 0) kembali('Wilayah kerja tidak ditemukan.');
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    kembali(pesanGalat(e, 'Gagal menyimpan perubahan.'));
  }
  selesai();
}

/** Nonaktifkan = hilang dari dropdown input/filter, data lama tetap terbaca. Tidak ada hapus (data lama bergantung pada kode). */
export async function setAktifWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const kode = teks(formData, 'kode');
  const aktif = teks(formData, 'aktif') === 'true';
  if (!kode) kembali('Kode wilayah tidak ada.');
  try {
    if (!aktif) {
      const { rows } = await getDbClient().execute({ sql: `SELECT count(*)::int AS n FROM wilker_ref WHERE aktif AND kode <> ?`, args: [kode] });
      if (Number(rows[0]?.n ?? 0) === 0) kembali('Minimal satu wilayah kerja harus tetap aktif.');
    }
    await getDbClient().execute({ sql: `UPDATE wilker_ref SET aktif = ? WHERE kode = ?`, args: [aktif, kode] });
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    kembali(pesanGalat(e, 'Gagal mengubah status.'));
  }
  selesai();
}

export async function tambahAliasWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const kode = teks(formData, 'kode');
  const alias = teks(formData, 'alias');
  if (!kode) kembali('Kode wilayah tidak ada.');
  if (alias.length < 2) kembali('Penulisan alias minimal 2 karakter.');
  try {
    await getDbClient().execute({ sql: `INSERT INTO wilker_nama_alias (wilayah_kerja_teks, kode_wilker) VALUES (?, ?)`, args: [alias, kode] });
  } catch (e) {
    kembali(pesanGalat(e, 'Gagal menambah alias.'));
  }
  selesai();
}

export async function hapusAliasWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const alias = teks(formData, 'alias');
  if (!alias) kembali('Alias tidak ada.');
  try {
    await getDbClient().execute({ sql: `DELETE FROM wilker_nama_alias WHERE wilayah_kerja_teks = ?`, args: [alias] });
  } catch (e) {
    kembali(pesanGalat(e, 'Gagal menghapus alias.'));
  }
  selesai();
}

/** Simpan modul yang berlaku di satu wilayah (mengganti seluruh centangan wilayah itu). */
export async function simpanModulWilayahKerja(formData: FormData) {
  await wajibAdmin();
  const kode = teks(formData, 'kode');
  if (!kode) kembali('Kode wilayah tidak ada.');
  const dipilih = [...new Set(formData.getAll('modul').map(String))].filter((m) =>
    (DAFTAR_KUNCI_MODUL as readonly string[]).includes(m)
  );
  try {
    const db = getDbClient();
    const ada = await db.execute({ sql: `SELECT 1 FROM wilker_ref WHERE kode = ?`, args: [kode] });
    if (ada.rows.length === 0) kembali('Wilayah kerja tidak ditemukan.');
    await db.batch([
      { sql: `DELETE FROM wilker_modul WHERE kode_wilker = ?`, args: [kode] },
      ...dipilih.map((m) => ({ sql: `INSERT INTO wilker_modul (kode_wilker, modul) VALUES (?, ?)`, args: [kode, m] })),
    ]);
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    kembali(pesanGalat(e, 'Gagal menyimpan pengaturan modul. Pastikan migrasi 22_wilker_modul.sql sudah dijalankan.'));
  }
  selesai();
}
