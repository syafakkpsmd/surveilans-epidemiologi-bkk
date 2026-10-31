// lib/klinik/stok-simpan.ts
// Penyimpanan buku stok ICV/e-ICV dan vaksin yang diinput lewat aplikasi. SERVER-ONLY.
// Baris disimpan di stok_vaksin dengan spreadsheet_id "app-<id klinik>" (tidak pernah disentuh sinkronisasi Sheets).
// Setiap perubahan MENULIS ULANG seluruh buku (klinik, jenis) dalam satu transaksi: no_baris mengikuti urutan tanggal dan
// Sisa dihitung ulang, sehingga input mundur (tanggal lampau) atau penghapusan tidak merusak sisa hari-hari berikutnya.
import { getDbClient } from '@/lib/db/client';
import { kunciSumberApp, type KlinikRingkas } from './akses';
import { hitungSisa, rawJsonStok, terapkanEntri, type BarisBuku, type EntriStok } from './stok-input';

export const modulRiwayatStok = (klinikId: string) => `stk:${klinikId}`; // upload_riwayat.modul VARCHAR(40): 4 + 36

/** Penyimpanan ditolak karena sisa stok akan negatif (mis. terbit melebihi stok yang ada). */
export class GalatStok extends Error {}

type Tx = Awaited<ReturnType<ReturnType<typeof getDbClient>['transaction']>>;
interface BarisTersimpan extends BarisBuku { sumber: string; batchId: string | null }

const fmtTanggal = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

async function muatBuku(ek: Tx | ReturnType<typeof getDbClient>, kunci: string, jenis: string): Promise<BarisTersimpan[]> {
  const r = await ek.execute({
    sql: 'SELECT tanggal, raw_json, sumber, batch_id FROM stok_vaksin WHERE spreadsheet_id = ? AND jenis_stok = ? ORDER BY tanggal, no_baris',
    args: [kunci, jenis],
  });
  return r.rows.map((x) => {
    const j = JSON.parse(String(x.raw_json)) as Record<string, string | number>;
    return {
      tanggal: String(x.tanggal).slice(0, 10), masuk: Number(j['Stok Masuk'] ?? 0), terbit: Number(j['Terbit'] ?? 0),
      rusak: Number(j['Rusak'] ?? 0), keterangan: String(j['Keterangan'] ?? ''), sumber: String(x.sumber), batchId: x.batch_id ? String(x.batch_id) : null,
    };
  });
}

/** Hitung sisa lalu tulis ulang seluruh buku. Melempar GalatStok bila ada hari dengan sisa negatif. */
async function tulisBuku(tx: Tx, klinik: KlinikRingkas, jenis: string, buku: BarisTersimpan[]): Promise<void> {
  const kunci = kunciSumberApp(klinik.id);
  const { sisa, negatif } = hitungSisa(buku);
  if (negatif) {
    throw new GalatStok(`Stok tidak cukup: pada ${fmtTanggal(negatif.tanggal)} sisa menjadi ${negatif.sisa} (kurang ${-negatif.sisa}). Periksa angka Terbit/Rusak atau tambahkan Stok Masuk lebih dulu.`);
  }
  await tx.execute({ sql: 'DELETE FROM stok_vaksin WHERE spreadsheet_id = ? AND jenis_stok = ?', args: [kunci, jenis] });
  for (let i = 0; i < buku.length; i++) {
    const b = buku[i];
    await tx.execute({
      sql: 'INSERT INTO stok_vaksin (spreadsheet_id, nama_klinik, jenis_stok, no_baris, tanggal, sumber, batch_id, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [kunci, klinik.nama_klinik, jenis, i + 1, b.tanggal, b.sumber, b.batchId, JSON.stringify(rawJsonStok(b, sisa[i]))],
    });
  }
}

async function dalamTransaksi<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await getDbClient().transaction();
  try {
    const hasil = await fn(tx);
    await tx.commit();
    return hasil;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

/** Tambah (atau ganti bila ganti=true) satu hari. 'ada' = tanggal itu sudah terisi dan ganti=false. */
export async function simpanEntriStok(klinik: KlinikRingkas, e: EntriStok, o: { ganti?: boolean } = {}): Promise<'ok' | 'ada'> {
  return dalamTransaksi(async (tx) => {
    const buku = await muatBuku(tx, kunciSumberApp(klinik.id), e.jenis);
    const { buku: baru, sudahAda } = terapkanEntri(buku, e, !!o.ganti);
    if (sudahAda && !o.ganti) return 'ada' as const;
    const sumberLama = new Map(buku.map((b) => [b.tanggal, b]));
    await tulisBuku(tx, klinik, e.jenis, baru.map((b) => ({ ...b, sumber: b.tanggal === e.tanggal ? 'input' : sumberLama.get(b.tanggal)?.sumber ?? 'input', batchId: b.tanggal === e.tanggal ? null : sumberLama.get(b.tanggal)?.batchId ?? null })));
    return 'ok' as const;
  });
}

export async function hapusEntriStok(klinik: KlinikRingkas, jenis: string, tanggal: string): Promise<number> {
  return dalamTransaksi(async (tx) => {
    const buku = await muatBuku(tx, kunciSumberApp(klinik.id), jenis);
    const sisa = buku.filter((b) => b.tanggal !== tanggal);
    if (sisa.length === buku.length) return 0;
    await tulisBuku(tx, klinik, jenis, sisa);
    return 1;
  });
}

export interface HasilUnggahanStok { batchId: string; baru: number; diganti: number }

/** Berapa entri unggahan yang akan jadi baris baru dan berapa yang mengganti hari yang sudah terisi (untuk pratinjau). */
export async function hitungRencanaStok(klinik: KlinikRingkas, entri: EntriStok[]): Promise<{ baru: number; diganti: number }> {
  let baru = 0;
  let diganti = 0;
  for (const jenis of new Set(entri.map((e) => e.jenis))) {
    const ada = new Set((await muatBuku(getDbClient(), kunciSumberApp(klinik.id), jenis)).map((b) => b.tanggal));
    for (const e of entri.filter((x) => x.jenis === jenis)) {
      if (ada.has(e.tanggal)) diganti++; else baru++;
    }
  }
  return { baru, diganti };
}

/** Simpan hasil unggahan Excel: tiap (jenis, tanggal) menambah atau MENGGANTI hari itu; sisa dihitung ulang. Satu transaksi. */
export async function simpanUnggahanStok(a: {
  klinik: KlinikRingkas; namaFile: string; entri: EntriStok[]; jumlahBaris: number; jumlahDitolak: number; pengguna: string;
}): Promise<HasilUnggahanStok> {
  return dalamTransaksi(async (tx) => {
    const id = (await tx.execute({ sql: 'SELECT UUID() AS id', args: [] })).rows[0].id as string;
    let baru = 0;
    let diganti = 0;
    for (const jenis of new Set(a.entri.map((e) => e.jenis))) {
      let buku: BarisTersimpan[] = await muatBuku(tx, kunciSumberApp(a.klinik.id), jenis);
      for (const e of a.entri.filter((x) => x.jenis === jenis)) {
        const ada = buku.some((b) => b.tanggal === e.tanggal);
        if (ada) diganti++; else baru++;
        const sisaMap = new Map(buku.map((b) => [b.tanggal, b]));
        const { buku: terapan } = terapkanEntri(buku, e, true);
        buku = terapan.map((b) => (b.tanggal === e.tanggal ? { ...b, sumber: 'upload', batchId: id } : { ...b, sumber: sisaMap.get(b.tanggal)?.sumber ?? 'upload', batchId: sisaMap.get(b.tanggal)?.batchId ?? null }));
      }
      await tulisBuku(tx, a.klinik, jenis, buku);
    }
    await tx.execute({
      sql: `INSERT INTO upload_riwayat (id, modul, tahun, sumber, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh)
            VALUES (?, ?, NULL, 'upload', ?, ?, ?, ?, ?, ?)`,
      args: [id, modulRiwayatStok(a.klinik.id), a.namaFile.slice(0, 255), a.jumlahBaris, baru + diganti, a.jumlahDitolak, diganti, a.pengguna.slice(0, 255)],
    });
    return { batchId: id, baru, diganti };
  });
}

/** Batalkan satu unggahan: hapus hari-hari yang dimasukkannya. Hari lama yang sempat DIGANTI tidak kembali. */
export async function hapusBatchStok(klinik: KlinikRingkas, batchId: string): Promise<number> {
  return dalamTransaksi(async (tx) => {
    const cek = await tx.execute({ sql: 'SELECT 1 FROM upload_riwayat WHERE id = ? AND modul = ?', args: [batchId, modulRiwayatStok(klinik.id)] });
    if (!cek.rows.length) return 0;
    const kunci = kunciSumberApp(klinik.id);
    const jenisTerkena = (await tx.execute({ sql: 'SELECT DISTINCT jenis_stok FROM stok_vaksin WHERE spreadsheet_id = ? AND batch_id = ?', args: [kunci, batchId] })).rows.map((r) => String(r.jenis_stok));
    let dihapus = 0;
    for (const jenis of jenisTerkena) {
      const buku = await muatBuku(tx, kunci, jenis);
      const sisa = buku.filter((b) => b.batchId !== batchId);
      dihapus += buku.length - sisa.length;
      await tulisBuku(tx, klinik, jenis, sisa);
    }
    await tx.execute({ sql: 'DELETE FROM upload_riwayat WHERE id = ?', args: [batchId] });
    return dihapus;
  });
}

export async function daftarStokApp(klinikId: string, jenis: string, o: { halaman?: number; ukuran?: number } = {}) {
  const ukuran = Math.min(Math.max(o.ukuran ?? 30, 1), 100);
  const offset = (Math.max(o.halaman ?? 1, 1) - 1) * ukuran;
  const kunci = kunciSumberApp(klinikId);
  const db = getDbClient();
  const [jml, isi] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) AS n FROM stok_vaksin WHERE spreadsheet_id = ? AND jenis_stok = ?', args: [kunci, jenis] }),
    db.execute({
      sql: `SELECT tanggal, raw_json, sumber FROM stok_vaksin WHERE spreadsheet_id = ? AND jenis_stok = ? ORDER BY tanggal DESC, no_baris DESC LIMIT ${ukuran} OFFSET ${offset}`,
      args: [kunci, jenis],
    }),
  ]);
  return {
    total: Number(jml.rows[0]?.n ?? 0), ukuran,
    baris: isi.rows.map((x) => {
      const j = JSON.parse(String(x.raw_json)) as Record<string, string | number>;
      return { tanggal: String(x.tanggal).slice(0, 10), masuk: Number(j['Stok Masuk'] ?? 0), terbit: Number(j['Terbit'] ?? 0), rusak: Number(j['Rusak'] ?? 0), sisa: Number(j['Sisa Stok (Pelayanan)'] ?? 0), keterangan: String(j['Keterangan'] ?? ''), sumber: String(x.sumber) };
    }),
  };
}

/** Sisa terkini per jenis untuk buku aplikasi klinik ini. */
export async function saldoStokApp(klinikId: string): Promise<{ jenis: string; sisa: number; tanggal: string }[]> {
  const r = await getDbClient().execute({
    sql: `SELECT s.jenis_stok, s.tanggal, s.raw_json FROM stok_vaksin s
          JOIN (SELECT jenis_stok, MAX(no_baris) AS mx FROM stok_vaksin WHERE spreadsheet_id = ? GROUP BY jenis_stok) t
            ON t.jenis_stok = s.jenis_stok AND t.mx = s.no_baris
          WHERE s.spreadsheet_id = ?`,
    args: [kunciSumberApp(klinikId), kunciSumberApp(klinikId)],
  });
  return r.rows.map((x) => ({ jenis: String(x.jenis_stok), tanggal: String(x.tanggal).slice(0, 10), sisa: Number((JSON.parse(String(x.raw_json)) as Record<string, number>)['Sisa Stok (Pelayanan)'] ?? 0) }));
}

export async function riwayatStok(klinikId: string, batas = 30) {
  const r = await getDbClient().execute({
    sql: `SELECT id, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, dibuat_oleh, dibuat_pada FROM upload_riwayat WHERE modul = ? ORDER BY dibuat_pada DESC LIMIT ${Math.min(batas, 100)}`,
    args: [modulRiwayatStok(klinikId)],
  });
  return r.rows;
}

