// // lib/klinik/icv-simpan.ts
//
// Menyimpan data ICV / e-ICV dari aplikasi (form dan unggah Excel) ke tabel data_icv, memakai kunci sumber klinik
// (spreadsheet_id) dan nomor baris berlanjut, sehingga seluruh dashboard yang sudah ada membacanya tanpa perubahan.
// SERVER-ONLY. Pemeriksaan hak akses klinik dilakukan pemanggil (lib/klinik/akses.ts).
import { getDbClient, type DbValue } from '@/lib/db/client';
import { kunciDokumen } from './icv-input';
import { pastikanKunciSumber, type KlinikRingkas } from './akses';

export const modulRiwayatIcv = (klinikId: string) => `icv:${klinikId}`; // upload_riwayat.modul VARCHAR(40): 4 + 36

const UKURAN_POTONG = 400;

/** Himpunan kunciDokumen() dari nomor dokumen yang SUDAH ada untuk klinik ini (case-insensitive). */
export async function noDokumenSudahAda(kunciSumber: string, daftar: string[]): Promise<Set<string>> {
  const unik = [...new Set(daftar.map((d) => d.trim()).filter(Boolean))];
  const ada = new Set<string>();
  for (let i = 0; i < unik.length; i += UKURAN_POTONG) {
    const potong = unik.slice(i, i + UKURAN_POTONG);
    const r = await getDbClient().execute({
      sql: `SELECT no_dokumen FROM data_icv WHERE spreadsheet_id = ? AND lower(no_dokumen) = ANY(?::text[])`,
      args: [kunciSumber, potong.map((d) => d.toLowerCase())],
    });
    for (const x of r.rows) ada.add(kunciDokumen(String(x.no_dokumen)));
  }
  return ada;
}

const sisip = `INSERT INTO data_icv (spreadsheet_id, nama_klinik, no_baris, nik, no_dokumen, raw_json, sumber, batch_id) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?)`;

/** Tambah satu baris dari form. 'duplikat' bila nomor dokumen sudah ada di klinik ini (case-insensitive). */
export async function tambahIcv(klinik: KlinikRingkas, nilai: Record<string, string>): Promise<'ok' | 'duplikat'> {
  const kunci = await pastikanKunciSumber(klinik);
  const tx = await getDbClient().transaction();
  try {
    // Kunci advisory PostgreSQL berdasarkan string kunci klinik
    await tx.execute({ sql: 'SELECT pg_advisory_xact_lock(hashtext(?))', args: [kunci] });
    const m = await tx.execute({ sql: 'SELECT COALESCE(MAX(no_baris), 0) + 1 AS n FROM data_icv WHERE spreadsheet_id = ?', args: [kunci] });
    const dup = await tx.execute({ 
      sql: 'SELECT 1 FROM data_icv WHERE spreadsheet_id = ? AND lower(no_dokumen) = lower(?) LIMIT 1', 
      args: [kunci, nilai['No Dokumen ICV / e-ICV']] 
    });
    if (dup.rows.length) { await tx.rollback(); return 'duplikat'; }
    await tx.execute({
      sql: sisip,
      args: [kunci, klinik.nama_klinik, Number(m.rows[0].n), nilai['NIK'] || null, nilai['No Dokumen ICV / e-ICV'], JSON.stringify(nilai), 'input', null],
    });
    await tx.commit();
    return 'ok';
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

export interface HasilSimpanUnggahan { batchId: string; baru: number; dilewati: number }

/** Simpan hasil unggah Excel. Nomor dokumen yang sudah ada DILEWATI (tidak menimpa data yang mungkin sudah dikoreksi). */
export async function simpanUnggahanIcv(a: {
  klinik: KlinikRingkas; namaFile: string; baris: Record<string, string>[]; jumlahBaris: number; jumlahDitolak: number; pengguna: string;
}): Promise<HasilSimpanUnggahan> {
  const kunci = await pastikanKunciSumber(a.klinik);
  const tx = await getDbClient().transaction();
  try {
    await tx.execute({ sql: 'SELECT pg_advisory_xact_lock(hashtext(?))', args: [kunci] });
    const m = await tx.execute({ sql: 'SELECT COALESCE(MAX(no_baris), 0) AS n FROM data_icv WHERE spreadsheet_id = ?', args: [kunci] });
    let no = Number(m.rows[0].n);
    
    const ada = new Set<string>();
    const nomor = [...new Set(a.baris.map((b) => b['No Dokumen ICV / e-ICV']))];
    for (let i = 0; i < nomor.length; i += UKURAN_POTONG) {
      const potong = nomor.slice(i, i + UKURAN_POTONG);
      const r = await tx.execute({ 
        sql: `SELECT no_dokumen FROM data_icv WHERE spreadsheet_id = ? AND lower(no_dokumen) = ANY(?::text[])`, 
        args: [kunci, potong.map((d) => d.toLowerCase())] 
      });
      for (const x of r.rows) ada.add(kunciDokumen(String(x.no_dokumen)));
    }
    const baru = a.baris.filter((b) => !ada.has(kunciDokumen(b['No Dokumen ICV / e-ICV'])));

    const rw = await tx.execute({ sql: 'SELECT gen_random_uuid() AS id' });
    const batchId = String(rw.rows[0].id);
    await tx.execute({
      sql: `INSERT INTO upload_riwayat (id, modul, tahun, sumber, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [batchId, modulRiwayatIcv(a.klinik.id), null, 'upload', a.namaFile.slice(0, 255), a.jumlahBaris, baru.length, a.jumlahDitolak, 0, a.pengguna.slice(0, 255)],
    });
    for (const b of baru) {
      no += 1;
      const args: DbValue[] = [kunci, a.klinik.nama_klinik, no, b['NIK'] || null, b['No Dokumen ICV / e-ICV'], JSON.stringify(b), 'upload', batchId];
      await tx.execute({ sql: sisip, args });
    }
    await tx.commit();
    return { batchId, baru: baru.length, dilewati: a.baris.length - baru.length };
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

/** Baris terbaru klinik ini (no_baris menurun), dengan pencarian nama/NIK/nomor dokumen. */
export async function daftarIcvTerbaru(kunciSumber: string, o: { q?: string; halaman?: number; ukuran?: number } = {}) {
  const ukuran = Math.min(Math.max(o.ukuran ?? 20, 1), 100);
  const offset = (Math.max(o.halaman ?? 1, 1) - 1) * ukuran;
  const args: DbValue[] = [kunciSumber];
  let cari = '';
  const q = (o.q ?? '').trim();
  if (q) {
    cari = ` AND (nik ILIKE ? OR no_dokumen ILIKE ? OR (raw_json::jsonb ->> 'Nama') ILIKE ?)`;
    const pola = `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
    args.push(pola);
    args.push(pola);
    args.push(pola);
  }
  const db = getDbClient();
  const [jml, isi] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM data_icv WHERE spreadsheet_id = ?${cari}`, args }),
    db.execute({ sql: `SELECT id, no_baris, sumber, batch_id, raw_json FROM data_icv WHERE spreadsheet_id = ?${cari} ORDER BY no_baris DESC LIMIT ${ukuran} OFFSET ${offset}`, args }),
  ]);
  return {
    total: Number(jml.rows[0]?.n ?? 0),
    ukuran,
    baris: isi.rows.map((r) => ({ 
      id: Number(r.id), 
      noBaris: Number(r.no_baris), 
      sumber: r.sumber as string, 
      batchId: (r.batch_id as string) ?? null, 
      data: typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : (r.raw_json as Record<string, string>) 
    })),
  };
}

export async function riwayatIcv(klinikId: string, batas = 30) {
  const r = await getDbClient().execute({
    sql: `SELECT id, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, dibuat_oleh, dibuat_pada FROM upload_riwayat WHERE modul = ? ORDER BY dibuat_pada DESC LIMIT ${Math.min(batas, 100)}`,
    args: [modulRiwayatIcv(klinikId)],
  });
  return r.rows;
}

/** Batalkan satu unggahan: hapus baris yang dimasukkannya, lalu catatan riwayatnya. */
export async function hapusBatchIcv(klinikId: string, kunciSumber: string, batchId: string): Promise<number> {
  const tx = await getDbClient().transaction();
  try {
    const cek = await tx.execute({ sql: 'SELECT 1 FROM upload_riwayat WHERE id = ? AND modul = ?', args: [batchId, modulRiwayatIcv(klinikId)] });
    if (!cek.rows.length) { await tx.rollback(); return 0; }
    const d = await tx.execute({ sql: 'DELETE FROM data_icv WHERE batch_id = ? AND spreadsheet_id = ?', args: [batchId, kunciSumber] });
    await tx.execute({ sql: 'DELETE FROM upload_riwayat WHERE id = ?', args: [batchId] });
    await tx.commit();
    return d.rowsAffected ?? 0;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

/** Hapus satu baris (hanya yang berasal dari aplikasi). */
export async function hapusBarisIcv(kunciSumber: string, id: number): Promise<number> {
  const d = await getDbClient().execute({ sql: `DELETE FROM data_icv WHERE id = ? AND spreadsheet_id = ? AND sumber IN ('input','upload')`, args: [id, kunciSumber] });
  return d.rowsAffected ?? 0;
}