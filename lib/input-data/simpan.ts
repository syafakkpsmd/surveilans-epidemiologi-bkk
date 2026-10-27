// lib/input-data/simpan.ts
// SERVER-ONLY. Penyimpanan/pembacaan data modul input ke MariaDB. Semua kueri berparameter;
// nama tabel/kolom hanya berasal dari konfigurasi modul (bukan masukan pengguna).
import { randomUUID } from 'node:crypto';
import { getDbClient, type DbValue } from '@/lib/db/client';
import type { ModulInput } from './modul';
import type { NilaiBaris } from './validasi';

const q = (id: string) => '`' + id.replace(/`/g, '') + '`';
const UKURAN_KELOMPOK = 300;

/** Cakupan "ganti": baris modul pada wilayah-wilayah ini dan tahun ini. */
function cakupan(modul: ModulInput, tahun: number, wilayah: string[]): { sql: string; args: DbValue[] } {
  const kolW = q(modul.kolomWilayah);
  const kolT = q(modul.kolomTanggal);
  const tanda = wilayah.map(() => '?').join(',');
  return {
    sql: `${kolT} >= ? AND ${kolT} < ? AND LOWER(REPLACE(${kolW},' ','')) IN (${tanda})`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`, ...wilayah.map((w) => w.toLowerCase().replace(/\s+/g, ''))],
  };
}

export function wilayahDalam(modul: ModulInput, baris: NilaiBaris[]): string[] {
  return [...new Set(baris.map((b) => String(b[modul.kolomWilayah])))];
}

/** Berapa baris yang akan terganti bila berkas ini disimpan (ditampilkan di pratinjau). */
export async function hitungDiganti(modul: ModulInput, tahun: number, wilayah: string[]): Promise<number> {
  if (!wilayah.length) return 0;
  const c = cakupan(modul, tahun, wilayah);
  const r = await getDbClient().execute({ sql: `SELECT COUNT(*) AS n FROM ${q(modul.tabel)} WHERE ${c.sql}`, args: c.args });
  return Number(r.rows[0]?.n ?? 0);
}

export interface RingkasanSimpan { batchId: string; masuk: number; diganti: number }

/** Mode ganti: dalam SATU transaksi hapus baris lama (modul+wilayah+tahun) lalu masukkan baris baru. Gagal = tidak ada yang berubah. */
export async function simpanUnggahan(opsi: {
  modul: ModulInput; tahun: number; namaFile: string; baris: NilaiBaris[];
  jumlahBaris: number; jumlahDitolak: number; pengguna: string;
}): Promise<RingkasanSimpan> {
  const { modul, tahun, baris } = opsi;
  const batchId = randomUUID();
  const kolom = modul.kolom.map((k) => k.nama);
  const tx = await getDbClient().transaction();
  try {
    let diganti = 0;
    if (baris.length) {
      const c = cakupan(modul, tahun, wilayahDalam(modul, baris));
      const d = await tx.execute({ sql: `DELETE FROM ${q(modul.tabel)} WHERE ${c.sql}`, args: c.args });
      diganti = d.rowsAffected;
      const namaKol = [...kolom, 'sumber', 'batch_id'].map(q).join(',');
      for (let i = 0; i < baris.length; i += UKURAN_KELOMPOK) {
        const kel = baris.slice(i, i + UKURAN_KELOMPOK);
        const satu = '(' + [...kolom, 'upload', batchId].map(() => '?').join(',') + ')';
        const args: DbValue[] = [];
        for (const b of kel) args.push(...kolom.map((k) => b[k] ?? null), 'upload', batchId);
        await tx.execute({ sql: `INSERT INTO ${q(modul.tabel)} (${namaKol}) VALUES ${kel.map(() => satu).join(',')}`, args });
      }
    }
    await tx.execute({
      sql: `INSERT INTO upload_riwayat (id, modul, tahun, sumber, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [batchId, modul.kunci, tahun, 'upload', opsi.namaFile.slice(0, 255), opsi.jumlahBaris, baris.length, opsi.jumlahDitolak, diganti, opsi.pengguna.slice(0, 255)],
    });
    await tx.commit();
    return { batchId, masuk: baris.length, diganti };
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

/** Tambah satu baris dari form. Mengembalikan 'duplikat' bila melanggar kunci unik. */
export async function tambahSatu(modul: ModulInput, nilai: NilaiBaris): Promise<'ok' | 'duplikat'> {
  const kolom = modul.kolom.map((k) => k.nama);
  try {
    await getDbClient().execute({
      sql: `INSERT INTO ${q(modul.tabel)} (${[...kolom, 'sumber'].map(q).join(',')}) VALUES (${[...kolom, 'input'].map(() => '?').join(',')})`,
      args: [...kolom.map((k) => nilai[k] ?? null), 'input'],
    });
    return 'ok';
  } catch (e) {
    if ((e as { code?: string })?.code === 'ER_DUP_ENTRY') return 'duplikat';
    throw e;
  }
}

export interface FilterDaftar { tahun?: number; wilayah?: string; sumber?: string; halaman?: number; ukuran?: number }

export async function daftarData(modul: ModulInput, f: FilterDaftar) {
  const where: string[] = [];
  const args: DbValue[] = [];
  if (f.tahun) { where.push(`${q(modul.kolomTanggal)} >= ? AND ${q(modul.kolomTanggal)} < ?`); args.push(`${f.tahun}-01-01`, `${f.tahun + 1}-01-01`); }
  if (f.wilayah) { where.push(`LOWER(REPLACE(${q(modul.kolomWilayah)},' ','')) = ?`); args.push(f.wilayah.toLowerCase().replace(/\s+/g, '')); }
  if (f.sumber && ['migrasi', 'input', 'upload'].includes(f.sumber)) { where.push('`sumber` = ?'); args.push(f.sumber); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const ukuran = Math.min(Math.max(f.ukuran ?? 50, 1), 200);
  const offset = (Math.max(f.halaman ?? 1, 1) - 1) * ukuran;
  const kolTampil = ['id', ...modul.kolomDaftar, 'sumber', 'batch_id'].map(q).join(',');
  const db = getDbClient();
  const [jml, isi] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM ${q(modul.tabel)} ${w}`, args }),
    db.execute({
      sql: `SELECT ${kolTampil} FROM ${q(modul.tabel)} ${w} ORDER BY ${q(modul.kolomTanggal)} DESC, ${q('id')} DESC LIMIT ${ukuran} OFFSET ${offset}`,
      args,
    }),
  ]);
  return { total: Number(jml.rows[0]?.n ?? 0), baris: isi.rows, ukuran };
}

export async function daftarTahun(modul: ModulInput): Promise<number[]> {
  const r = await getDbClient().execute(
    `SELECT DISTINCT YEAR(${q(modul.kolomTanggal)}) AS t FROM ${q(modul.tabel)} WHERE ${q(modul.kolomTanggal)} IS NOT NULL ORDER BY t DESC`,
  );
  return r.rows.map((x) => Number(x.t)).filter((t) => t > 1990);
}

export async function hapusBaris(modul: ModulInput, id: string): Promise<number> {
  const r = await getDbClient().execute({ sql: `DELETE FROM ${q(modul.tabel)} WHERE ${q('id')} = ?`, args: [id] });
  return r.rowsAffected;
}

/** Batalkan satu unggahan: hapus semua barisnya lalu catatan riwayatnya (baris lain tidak tersentuh). */
export async function hapusBatch(modul: ModulInput, batchId: string): Promise<number> {
  const tx = await getDbClient().transaction();
  try {
    const d = await tx.execute({ sql: `DELETE FROM ${q(modul.tabel)} WHERE ${q('batch_id')} = ?`, args: [batchId] });
    await tx.execute({ sql: 'DELETE FROM upload_riwayat WHERE id = ? AND modul = ?', args: [batchId, modul.kunci] });
    await tx.commit();
    return d.rowsAffected;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

export async function daftarRiwayat(modulKunci?: string, batas = 50) {
  const r = await getDbClient().execute({
    sql: `SELECT id, modul, tahun, sumber, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh, dibuat_pada
          FROM upload_riwayat ${modulKunci ? 'WHERE modul = ?' : ''} ORDER BY dibuat_pada DESC LIMIT ${Math.min(batas, 200)}`,
    args: modulKunci ? [modulKunci] : [],
  });
  return r.rows;
}
