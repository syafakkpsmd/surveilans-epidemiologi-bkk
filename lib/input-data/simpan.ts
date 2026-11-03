// lib/input-data/simpan.ts
// SERVER-ONLY. Penyimpanan/pembacaan data modul input ke MariaDB. Semua kueri berparameter;
// nama tabel/kolom hanya berasal dari konfigurasi modul (bukan masukan pengguna).
//
// Mode unggah = "tambah atau perbarui": baris dicocokkan lewat (wilayah, nama kapal, tanggal).
//   * belum ada  -> baris baru (sumber 'upload', batch_id = unggahan ini)
//   * sudah ada  -> hanya kolom yang ADA di berkas yang diperbarui, dan nilai kosong TIDAK menimpa
//                   isian lama (COALESCE). Jadi isian manual petugas (RBA dst.) aman bila berkas diunggah ulang.
import { randomUUID } from 'node:crypto';
import { getDbClient, type DbValue } from '@/lib/db/client';
import { galatDuplikat } from '@/lib/db/errors';
import type { ModulInput } from './modul';
import { kunciBaris, validasiBaris, type NilaiBaris } from './validasi';

const q = (id: string) => '"' + id.replace(/"/g, '') + '"';
const UKURAN_KELOMPOK = 200;

export function wilayahDalam(modul: ModulInput, baris: NilaiBaris[]): string[] {
  return [...new Set(baris.map((b) => String(b[modul.kolomWilayah])))];
}

type Eksekutor = { execute: (s: { sql: string; args?: DbValue[] }) => Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }> };

/** Baris yang sudah ada pada wilayah-wilayah dan tahun ini: kunci -> id. */
async function petaAda(ek: Eksekutor, modul: ModulInput, tahun: number, wilayah: string[]): Promise<Map<string, string>> {
  const peta = new Map<string, string>();
  if (!wilayah.length) return peta;
  const kolW = q(modul.kolomWilayah), kolT = q(modul.kolomTanggal), kolK = q(modul.kolomKunci);
  const r = await ek.execute({
    sql: `SELECT ${q('id')} AS id, ${kolW} AS w, ${kolK} AS k, ${kolT} AS t FROM ${q(modul.tabel)}
          WHERE ${kolT} >= ? AND ${kolT} < ? AND LOWER(REPLACE(${kolW},' ','')) IN (${wilayah.map(() => '?').join(',')})`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`, ...wilayah.map((w) => w.toLowerCase().replace(/\s+/g, ''))],
  });
  for (const x of r.rows) {
    const kunci = kunciBaris(modul, { [modul.kolomWilayah]: x.w as string, [modul.kolomKunci]: x.k as string, [modul.kolomTanggal]: x.t as string });
    if (kunci && !peta.has(kunci)) peta.set(kunci, String(x.id));
  }
  return peta;
}

export interface Rencana { baru: number; diperbarui: number }

/** Untuk pratinjau: berapa baris baru dan berapa yang akan memperbarui baris yang sudah ada. */
export async function hitungRencana(modul: ModulInput, tahun: number, baris: NilaiBaris[]): Promise<Rencana> {
  if (!baris.length) return { baru: 0, diperbarui: 0 };
  const ada = await petaAda(getDbClient(), modul, tahun, wilayahDalam(modul, baris));
  let diperbarui = 0;
  for (const b of baris) { const k = kunciBaris(modul, b); if (k && ada.has(k)) diperbarui++; }
  return { baru: baris.length - diperbarui, diperbarui };
}

export interface RingkasanSimpan { batchId: string; baru: number; diperbarui: number }

export async function simpanUnggahan(opsi: {
  modul: ModulInput; tahun: number; namaFile: string; baris: NilaiBaris[]; kolomAda: string[];
  jumlahBaris: number; jumlahDitolak: number; pengguna: string;
}): Promise<RingkasanSimpan> {
  const { modul, tahun, baris } = opsi;
  const batchId = randomUUID();
  const semuaKolom = modul.kolom.map((k) => k.nama);
  const ada = new Set(opsi.kolomAda);
  const kolomUbah = semuaKolom.filter((k) => ada.has(k) && k !== modul.kolomWilayah && k !== modul.kolomKunci && k !== modul.kolomTanggal);
  const tx = await getDbClient().transaction();
  try {
    const peta = await petaAda(tx, modul, tahun, wilayahDalam(modul, baris));
    const baru: NilaiBaris[] = [];
    let diperbarui = 0;
    for (const b of baris) {
      const k = kunciBaris(modul, b);
      const id = k ? peta.get(k) : undefined;
      if (!id) { baru.push(b); continue; }
      if (kolomUbah.length) {
        await tx.execute({
          sql: `UPDATE ${q(modul.tabel)} SET ${kolomUbah.map((c) => `${q(c)} = COALESCE(?, ${q(c)})`).join(', ')} WHERE ${q('id')} = ?`,
          args: [...kolomUbah.map((c) => b[c] ?? null), id],
        });
      }
      diperbarui++;
    }
    const namaKol = [...semuaKolom, 'sumber', 'batch_id'].map(q).join(',');
    const satu = '(' + [...semuaKolom, 'upload', batchId].map(() => '?').join(',') + ')';
    for (let i = 0; i < baru.length; i += UKURAN_KELOMPOK) {
      const kel = baru.slice(i, i + UKURAN_KELOMPOK);
      const args: DbValue[] = [];
      for (const b of kel) args.push(...semuaKolom.map((k) => b[k] ?? null), 'upload', batchId);
      await tx.execute({ sql: `INSERT INTO ${q(modul.tabel)} (${namaKol}) VALUES ${kel.map(() => satu).join(',')}`, args });
    }
    await tx.execute({
      sql: `INSERT INTO upload_riwayat (id, modul, tahun, sumber, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [batchId, modul.kunci, tahun, 'upload', opsi.namaFile.slice(0, 255), opsi.jumlahBaris, baru.length, opsi.jumlahDitolak, diperbarui, opsi.pengguna.slice(0, 255)],
    });
    await tx.commit();
    return { batchId, baru: baru.length, diperbarui };
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
  const db = getDbClient();
  const kunci = kunciBaris(modul, nilai);
  if (kunci && Object.keys(nilai).length) {
    const tahun = Number(String(nilai[modul.kolomTanggal]).slice(0, 4));
    const ada = await petaAda(db, modul, tahun, [String(nilai[modul.kolomWilayah])]);
    if (ada.has(kunci)) return 'duplikat';
  }
  try {
    await db.execute({
      sql: `INSERT INTO ${q(modul.tabel)} (${[...kolom, 'sumber'].map(q).join(',')}) VALUES (${[...kolom, 'input'].map(() => '?').join(',')})`,
      args: [...kolom.map((k) => nilai[k] ?? null), 'input'],
    });
    return 'ok';
  } catch (e) {
    if (galatDuplikat(e)) return 'duplikat';
    throw e;
  }
}

/** Ubah kolom ISIAN MANUAL satu baris. Kolom lain ditolak. Nilai kosong -> NULL. */
export async function ubahManual(modul: ModulInput, id: string, nilaiMentah: Record<string, unknown>): Promise<{ ok: true } | { ok: false; galat: string[] }> {
  const manual = modul.kolom.filter((k) => k.manual);
  const nama = Object.keys(nilaiMentah);
  if (!nama.length) return { ok: false, galat: ['Tidak ada isian'] };
  const set: string[] = [];
  const args: DbValue[] = [];
  const galat: string[] = [];
  for (const n of nama) {
    const k = manual.find((x) => x.nama === n);
    if (!k) { galat.push(`Kolom ${n} tidak boleh diubah di sini`); continue; }
    const h = validasiBaris({ ...modul, kolom: [{ ...k, wajib: false }] }, { [n]: nilaiMentah[n] });
    if (!h.nilai) { galat.push(...h.galat); continue; }
    set.push(`${q(n)} = ?`);
    args.push(h.nilai[n] ?? null);
  }
  if (galat.length) return { ok: false, galat };
  const r = await getDbClient().execute({ sql: `UPDATE ${q(modul.tabel)} SET ${set.join(', ')} WHERE ${q('id')} = ?`, args: [...args, id] });
  return r.rowsAffected >= 0 ? { ok: true } : { ok: false, galat: ['Gagal menyimpan'] };
}

/** Pilihan dropdown tiap kolom manual: pilihan awal + nilai yang sudah ada di data (apa adanya). */
export async function daftarPilihan(modul: ModulInput): Promise<Record<string, string[]>> {
  const db = getDbClient();
  const hasil: Record<string, string[]> = {};
  for (const k of modul.kolom.filter((x) => x.manual)) {
    const tetap = k.pilihan ?? [];
    if (k.tipe === 'rba') { hasil[k.nama] = tetap; continue; }
    const r = await db.execute(`SELECT DISTINCT ${q(k.nama)} AS v FROM ${q(modul.tabel)} WHERE ${q(k.nama)} IS NOT NULL AND ${q(k.nama)} <> '' ORDER BY v LIMIT 100`);
    const gabung = [...tetap];
    for (const x of r.rows) {
      const v = String(x.v);
      if (!gabung.some((g) => g.toLowerCase() === v.toLowerCase())) gabung.push(v);
    }
    hasil[k.nama] = gabung;
  }
  return hasil;
}

export interface FilterDaftar {
  tahun?: number; bulan?: number; wilayah?: string; sumber?: string; belumLengkap?: boolean; halaman?: number; ukuran?: number;
}

export async function daftarData(modul: ModulInput, f: FilterDaftar) {
  const where: string[] = [];
  const args: DbValue[] = [];
  const kolT = q(modul.kolomTanggal);
  if (f.tahun && f.bulan && f.bulan >= 1 && f.bulan <= 12) {
    const awal = new Date(Date.UTC(f.tahun, f.bulan - 1, 1)), akhir = new Date(Date.UTC(f.tahun, f.bulan, 1));
    where.push(`${kolT} >= ? AND ${kolT} < ?`); args.push(awal.toISOString().slice(0, 10), akhir.toISOString().slice(0, 10));
  } else if (f.tahun) {
    where.push(`${kolT} >= ? AND ${kolT} < ?`); args.push(`${f.tahun}-01-01`, `${f.tahun + 1}-01-01`);
  }
  if (f.wilayah) { where.push(`LOWER(REPLACE(${q(modul.kolomWilayah)},' ','')) = ?`); args.push(f.wilayah.toLowerCase().replace(/\s+/g, '')); }
  if (f.sumber && ['migrasi', 'input', 'upload'].includes(f.sumber)) { where.push('`sumber` = ?'); args.push(f.sumber); }
  const manual = modul.kolom.filter((k) => k.manual).map((k) => k.nama);
  if (f.belumLengkap && manual.length) where.push('(' + manual.map((c) => `(${q(c)} IS NULL OR ${q(c)} = '')`).join(' OR ') + ')');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const ukuran = Math.min(Math.max(f.ukuran ?? 50, 1), 200);
  const offset = (Math.max(f.halaman ?? 1, 1) - 1) * ukuran;
  const tampil = [...new Set(['id', ...modul.kolomDaftar, ...manual, 'sumber', 'batch_id'])].map(q).join(',');
  const db = getDbClient();
  const [jml, isi] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM ${q(modul.tabel)} ${w}`, args }),
    db.execute({ sql: `SELECT ${tampil} FROM ${q(modul.tabel)} ${w} ORDER BY ${kolT} DESC, ${q('id')} DESC LIMIT ${ukuran} OFFSET ${offset}`, args }),
  ]);
  return { total: Number(jml.rows[0]?.n ?? 0), baris: isi.rows, ukuran };
}

export async function daftarTahun(modul: ModulInput): Promise<number[]> {
  const r = await getDbClient().execute(
    `SELECT DISTINCT EXTRACT(YEAR FROM ${q(modul.kolomTanggal)})::int AS t FROM ${q(modul.tabel)} WHERE ${q(modul.kolomTanggal)} IS NOT NULL ORDER BY t DESC`,
  );
  return r.rows.map((x) => Number(x.t)).filter((t) => t > 1990);
}

export async function hapusBaris(modul: ModulInput, id: string): Promise<number> {
  const r = await getDbClient().execute({ sql: `DELETE FROM ${q(modul.tabel)} WHERE ${q('id')} = ?`, args: [id] });
  return r.rowsAffected;
}

/** Batalkan satu unggahan: hapus baris yang BARU dimasukkannya lalu catatan riwayatnya.
 *  Baris lama yang sempat diperbarui tidak dikembalikan. */
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
