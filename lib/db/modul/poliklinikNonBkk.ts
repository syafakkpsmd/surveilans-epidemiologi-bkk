// SERVER-ONLY. Akses, validasi, dan penulisan kunjungan poliklinik non-BKK (tabel kunjungan_poliklinik).
import { getDbClient } from '@/lib/db/client';
import { getPengguna } from '@/lib/auth/session';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';
import type { KunjunganRow } from '@/lib/db/modul/poliklinik';

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PoliklinikInfo {
  id: string;
  nama: string;
  kode_wilker: string | null;
  aktif: boolean;
}

export interface BarisKunjungan {
  id: string;
  wilayah_kerja?: string;
  tanggal_pemeriksaan: string;
  nama: string | null;
  jenis_kelamin: string | null;
  usia: number | null;
  kategori_pasien: string | null;
  diagnosa: string | null;
  kode_diagnosa: string | null;
  keterangan: string | null;
}

/**
 * Aturan akses:
 *  - admin             : lihat + kelola semua poliklinik
 *  - petugas_klinik    : lihat semua poliklinik (BKK), tidak mengubah
 *  - poliklinik        : lihat + kelola HANYA poliklinik yang ditautkan ke akunnya
 *  - peran lain / tamu : tidak boleh
 */
export async function cekAkses(poliklinikId: string) {
  const user = await getPengguna();
  if (!user) return { user: null, lihat: false, kelola: false };
  if (!POLA_UUID.test(poliklinikId)) return { user, lihat: false, kelola: false };
  if (user.role === 'admin') return { user, lihat: true, kelola: true };
    if (user.role === 'petugas_klinik' || user.role === 'petugas') return { user, lihat: true, kelola: false };
  if (user.role === 'poliklinik') {
    const { rows } = await getDbClient().execute({
      sql: `SELECT 1 FROM poliklinik_non_bkk_akses a JOIN poliklinik_non_bkk p ON p.id = a.poliklinik_id
             WHERE a.user_id = ?::uuid AND a.poliklinik_id = ?::uuid AND p.aktif LIMIT 1`,
      args: [user.id, poliklinikId],
    });
    const ok = rows.length > 0;
    return { user, lihat: ok, kelola: ok };
  }
  return { user, lihat: false, kelola: false };
}

export async function getPoliklinikById(id: string): Promise<PoliklinikInfo | null> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT id::text AS id, nama, kode_wilker, aktif FROM poliklinik_non_bkk WHERE id = ?::uuid`,
    args: [id],
  });
  return (rows[0] as PoliklinikInfo) ?? null;
}

/** Untuk grafik dashboard: bentuknya sama dengan KunjunganRow sehingga fungsi hitung... bisa dipakai ulang. */
export async function getKunjunganPoliklinik(poliklinikId: string, tahun: number): Promise<KunjunganRow[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT wilayah_kerja, no_baris, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien, diagnosa, keterangan
            FROM kunjungan_poliklinik
           WHERE poliklinik_id = ?::uuid AND tanggal_pemeriksaan >= ?::date AND tanggal_pemeriksaan < ?::date
           ORDER BY tanggal_pemeriksaan ASC`,
    args: [poliklinikId, `${tahun}-01-01`, `${tahun + 1}-01-01`],
  });
  return rows as unknown as KunjunganRow[];
}

export async function getKunjunganTerbaru(poliklinikId: string, batas = 50): Promise<BarisKunjungan[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT id::text AS id, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien, diagnosa, kode_diagnosa, keterangan
            FROM kunjungan_poliklinik WHERE poliklinik_id = ?::uuid
           ORDER BY tanggal_pemeriksaan DESC, id DESC LIMIT ${Math.max(1, Math.min(200, Math.trunc(batas)))}`,
    args: [poliklinikId],
  });
  return rows.map((r) => ({
    ...(r as Omit<BarisKunjungan, 'tanggal_pemeriksaan'>),
    tanggal_pemeriksaan: String(r.tanggal_pemeriksaan ?? '').slice(0, 10),
  }));
}

/** Nilai kategori pasien yang pernah dipakai, untuk saran isian (tidak dibatasi daftar tetap). */
export async function getKategoriPasienOpsi(): Promise<string[]> {
  const { rows } = await getDbClient().execute(
    `SELECT kategori_pasien AS k, count(*) AS n FROM kunjungan_poliklinik
      WHERE kategori_pasien IS NOT NULL AND trim(kategori_pasien) <> ''
      GROUP BY kategori_pasien ORDER BY n DESC LIMIT 20`
  );
  return rows.map((r) => String(r.k));
}

// ------------------------------------------------------------
// Validasi
// ------------------------------------------------------------
export interface InputKunjungan {
  tanggal: string;
  nama: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  usia: number | null;
  kategori: string | null;
  kodeDiagnosa: string;
  keterangan: string | null;
}

const teks = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

export function validasiKunjungan(f: FormData, hariIni: string): { data: InputKunjungan } | { error: string } {
  const tanggal = teks(f.get('tanggal_pemeriksaan'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(new Date(`${tanggal}T00:00:00Z`).getTime())) {
    return { error: 'Tanggal pemeriksaan tidak valid.' };
  }
  if (tanggal > hariIni) return { error: 'Tanggal pemeriksaan tidak boleh di masa depan.' };
  if (tanggal < '2020-01-01') return { error: 'Tanggal pemeriksaan terlalu lama.' };

  const nama = teks(f.get('nama')).replace(/\s+/g, ' ');
  if (nama.length < 2) return { error: 'Nama pasien wajib diisi.' };
  if (nama.length > 150) return { error: 'Nama pasien terlalu panjang.' };

  const jk = teks(f.get('jenis_kelamin'));
  if (jk !== 'Laki-laki' && jk !== 'Perempuan') return { error: 'Pilih jenis kelamin.' };

  const usiaMentah = teks(f.get('usia'));
  let usia: number | null = null;
  if (usiaMentah !== '') {
    if (!/^\d{1,3}$/.test(usiaMentah) || Number(usiaMentah) > 120) return { error: 'Usia harus 0 sampai 120.' };
    usia = Number(usiaMentah);
  }

  const kategori = teks(f.get('kategori_pasien')).slice(0, 100) || null;
  const kodeDiagnosa = teks(f.get('kode_diagnosa')).toUpperCase();
  if (!kodeDiagnosa) return { error: 'Pilih diagnosa dari daftar ICD-10.' };
  const keterangan = teks(f.get('keterangan'));
  if (keterangan.length > 2000) return { error: 'Keterangan terlalu panjang.' };

  return { data: { tanggal, nama, jenisKelamin: jk, usia, kategori, kodeDiagnosa, keterangan: keterangan || null } };
}

// ------------------------------------------------------------
// Penulisan. Edit & hapus SELALU dibatasi poliklinik_id, jadi tidak bisa menyentuh data poliklinik lain.
// ------------------------------------------------------------
const KODE_ULANG = new Set(['23505', '40P01', '40001', '55P03']);
const bisaDiulang = (e: unknown) => KODE_ULANG.has(String((e as { code?: string })?.code ?? ''));

/** Nama wilker yang disimpan di kolom wilayah_kerja (mengikuti nama pendek wilayah kerja poliklinik tsb). */
function namaWilker(kodeWilker: string | null): string | null {
  return WILAYAH_KERJA.find((w) => w.kode === kodeWilker)?.namaPendek ?? null;
}

export async function tambahKunjungan(
  p: PoliklinikInfo, d: InputKunjungan, diagnosaNama: string, userId: string
): Promise<string> {
  const wilker = namaWilker(p.kode_wilker);
  if (!wilker) throw new Error('Poliklinik ini belum punya wilayah kerja. Hubungi admin.');

  for (let percobaan = 1; ; percobaan++) {
    try {
      const { rows } = await getDbClient().execute({
        sql: `INSERT INTO kunjungan_poliklinik
                (wilayah_kerja, no_baris, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien,
                 diagnosa, kode_diagnosa, keterangan, poliklinik_id, dibuat_oleh)
              SELECT ?::text, COALESCE(MAX(no_baris), 0) + 1, ?::date, ?::text, ?::text, ?::int, ?::text,
                     ?::text, ?::text, ?::text, ?::uuid, ?::uuid
                FROM kunjungan_poliklinik WHERE wilayah_kerja = ?::text
              RETURNING id::text AS id`,
        args: [wilker, d.tanggal, d.nama, d.jenisKelamin, d.usia, d.kategori, diagnosaNama, d.kodeDiagnosa,
               d.keterangan, p.id, userId, wilker],
      });
      return String(rows[0]?.id);
    } catch (e) {
      if (bisaDiulang(e) && percobaan < 8) {
        await new Promise((r) => setTimeout(r, Math.random() * 40 * percobaan));
        continue;
      }
      throw e;
    }
  }
}

export async function ubahKunjungan(
  poliklinikId: string, id: string, d: InputKunjungan, diagnosaNama: string
): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `UPDATE kunjungan_poliklinik
             SET tanggal_pemeriksaan = ?::date, nama = ?, jenis_kelamin = ?, usia = ?::int, kategori_pasien = ?,
                 diagnosa = ?, kode_diagnosa = ?, keterangan = ?
           WHERE id::text = ? AND poliklinik_id = ?::uuid`,
    args: [d.tanggal, d.nama, d.jenisKelamin, d.usia, d.kategori, diagnosaNama, d.kodeDiagnosa, d.keterangan, id, poliklinikId],
  });
  return hasil.rowsAffected > 0;
}

export async function hapusKunjunganDb(poliklinikId: string, id: string): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `DELETE FROM kunjungan_poliklinik WHERE id::text = ? AND poliklinik_id = ?::uuid`,
    args: [id, poliklinikId],
  });
  return hasil.rowsAffected > 0;
}

/** Semua kunjungan non-BKK (atau satu poliklinik bila poliklinikId diisi) untuk satu tahun. */
export async function getKunjunganNonBkk(tahun: number, poliklinikId?: string): Promise<KunjunganRow[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT wilayah_kerja, no_baris, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien, diagnosa, keterangan
            FROM kunjungan_poliklinik
           WHERE poliklinik_id IS NOT NULL
             AND (?::uuid IS NULL OR poliklinik_id = ?::uuid)
             AND tanggal_pemeriksaan >= ?::date AND tanggal_pemeriksaan < ?::date
           ORDER BY tanggal_pemeriksaan ASC`,
    args: [poliklinikId ?? null, poliklinikId ?? null, `${tahun}-01-01`, `${tahun + 1}-01-01`],
  });
  return rows as unknown as KunjunganRow[];
}

export async function getDaftarPoliklinikAktif(): Promise<{ id: string; nama: string }[]> {
  const { rows } = await getDbClient().execute(
    `SELECT id::text AS id, nama FROM poliklinik_non_bkk WHERE aktif ORDER BY nama`
  );
  return rows as { id: string; nama: string }[];
}