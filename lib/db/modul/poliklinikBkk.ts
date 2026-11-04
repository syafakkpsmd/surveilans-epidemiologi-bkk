// SERVER-ONLY. Input kunjungan poliklinik BKK sendiri (poliklinik_id = NULL).
import { getDbClient } from '@/lib/db/client';
import { getPengguna } from '@/lib/auth/session';
import type { BarisKunjungan, InputKunjungan } from '@/lib/db/modul/poliklinikNonBkk';

/** Hanya admin dan petugas_klinik boleh menginput layanan BKK. */
export async function cekAksesBkk() {
  const user = await getPengguna();
  const admin = user?.role === 'admin';
  const boleh = !!user && (admin || user.role === 'petugas_klinik');
  return { user, boleh, admin };
}

const KODE_ULANG = new Set(['23505', '40P01', '40001', '55P03']);
const bisaDiulang = (e: unknown) => KODE_ULANG.has(String((e as { code?: string })?.code ?? ''));

/** Admin melihat semua data BKK terbaru; petugas klinik hanya yang ia input sendiri. */
export async function getKunjunganBkkTerbaru(userId: string, admin: boolean, batas = 50): Promise<BarisKunjungan[]> {
  const { rows } = await getDbClient().execute({
    sql: `SELECT id::text AS id, wilayah_kerja, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien,
                 diagnosa, kode_diagnosa, keterangan
            FROM kunjungan_poliklinik
           WHERE poliklinik_id IS NULL AND (?::boolean OR dibuat_oleh = ?::uuid)
           ORDER BY tanggal_pemeriksaan DESC, id DESC LIMIT ${Math.max(1, Math.min(200, Math.trunc(batas)))}`,
    args: [admin, userId],
  });
  return rows.map((r) => ({
    ...(r as Omit<BarisKunjungan, 'tanggal_pemeriksaan'>),
    tanggal_pemeriksaan: String(r.tanggal_pemeriksaan ?? '').slice(0, 10),
  }));
}

export async function tambahKunjunganBkk(wilker: string, d: InputKunjungan, diagnosaNama: string, userId: string) {
  for (let percobaan = 1; ; percobaan++) {
    try {
      await getDbClient().execute({
        sql: `INSERT INTO kunjungan_poliklinik
                (wilayah_kerja, no_baris, tanggal_pemeriksaan, nama, jenis_kelamin, usia, kategori_pasien,
                 diagnosa, kode_diagnosa, keterangan, poliklinik_id, dibuat_oleh)
              SELECT ?::text, COALESCE(MAX(no_baris), 0) + 1, ?::date, ?::text, ?::text, ?::int, ?::text,
                     ?::text, ?::text, ?::text, NULL, ?::uuid
                FROM kunjungan_poliklinik WHERE wilayah_kerja = ?::text`,
        args: [wilker, d.tanggal, d.nama, d.jenisKelamin, d.usia, d.kategori, diagnosaNama, d.kodeDiagnosa,
               d.keterangan, userId, wilker],
      });
      return;
    } catch (e) {
      if (bisaDiulang(e) && percobaan < 8) {
        await new Promise((r) => setTimeout(r, Math.random() * 40 * percobaan));
        continue;
      }
      throw e;
    }
  }
}

/** Hanya baris BKK; petugas klinik hanya boleh mengubah/menghapus barisnya sendiri. */
export async function ubahKunjunganBkk(
  id: string, userId: string, admin: boolean, wilker: string, d: InputKunjungan, diagnosaNama: string
): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `UPDATE kunjungan_poliklinik
             SET wilayah_kerja = ?, tanggal_pemeriksaan = ?::date, nama = ?, jenis_kelamin = ?, usia = ?::int,
                 kategori_pasien = ?, diagnosa = ?, kode_diagnosa = ?, keterangan = ?
           WHERE id::text = ? AND poliklinik_id IS NULL AND (?::boolean OR dibuat_oleh = ?::uuid)`,
    args: [wilker, d.tanggal, d.nama, d.jenisKelamin, d.usia, d.kategori, diagnosaNama, d.kodeDiagnosa,
           d.keterangan, id, admin, userId],
  });
  return hasil.rowsAffected > 0;
}

export async function hapusKunjunganBkkDb(id: string, userId: string, admin: boolean): Promise<boolean> {
  const hasil = await getDbClient().execute({
    sql: `DELETE FROM kunjungan_poliklinik
           WHERE id::text = ? AND poliklinik_id IS NULL AND (?::boolean OR dibuat_oleh = ?::uuid)`,
    args: [id, admin, userId],
  });
  return hasil.rowsAffected > 0;
}