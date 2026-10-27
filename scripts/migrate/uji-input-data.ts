// Uji input data + unggah Excel (Tahap 3b). Butuh MariaDB berisi schema 01-05.
// Jalankan: DB_USER=... DB_PASSWORD=... DB_NAME=... [DB_SOCKET=...] \
//   npx tsx --test --test-force-exit scripts/migrate/uji-input-data.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { ubahBilangan, ubahRba, ubahTanggal, ubahWilker } from '../../lib/input-data/nilai';
import { MODUL } from '../../lib/input-data/modul';
import { validasiBaris } from '../../lib/input-data/validasi';
import { bacaExcel, buatTemplate } from '../../lib/input-data/parse-excel';
import { daftarData, hapusBatch, simpanUnggahan, tambahSatu } from '../../lib/input-data/simpan';
import { getDbClient, tutupDb } from '../../lib/db/client';

const cop = MODUL.cop;
const phqc = MODUL.phqc;

async function buku(baris: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  baris.forEach((b) => ws.addRow(b));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('tanggal: format yang diterima dan ditolak', () => {
  assert.deepEqual(ubahTanggal('2026-10-23'), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal('23/10/2026'), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal('5-1-2026'), { ok: true, nilai: '2026-01-05' });
  assert.deepEqual(ubahTanggal(new Date(Date.UTC(2026, 9, 23))), { ok: true, nilai: '2026-10-23' });
  assert.deepEqual(ubahTanggal(46318), { ok: true, nilai: '2026-10-23' }); // nomor seri Excel
  assert.equal(ubahTanggal('31/02/2026').ok, false);
  assert.equal(ubahTanggal('10/23/2026').ok, false); // bulan 23 tidak ada: tidak ditebak MM/DD
  assert.equal(ubahTanggal('kemarin').ok, false);
  assert.deepEqual(ubahTanggal(''), { ok: true, nilai: null });
});

test('bilangan, RBA, wilayah', () => {
  assert.deepEqual(ubahBilangan('12'), { ok: true, nilai: 12 });
  assert.deepEqual(ubahBilangan(7), { ok: true, nilai: 7 });
  assert.deepEqual(ubahBilangan('-'), { ok: true, nilai: null });
  assert.equal(ubahBilangan('1,5').ok, false);
  assert.equal(ubahBilangan(-1).ok, false);
  assert.deepEqual(ubahRba(' merah '), { ok: true, nilai: 'Merah' });
  assert.equal(ubahRba('Biru').ok, false);
  assert.deepEqual(ubahWilker('Tanjung_Santan'), { ok: true, nilai: 'WK02' });
  assert.equal(ubahWilker('Tg. Laut').ok, false);
});

test('validasi baris: wajib, tahun, wilayah yang tidak berlaku', () => {
  const sah = { wilayah_kerja: 'Tanjung Santan', nama_kapal: 'KM A', tgl_kedatangan: '2026-03-01', jml_abk_wni: '5', rba: 'hijau' };
  const h = validasiBaris(cop, sah, 2026);
  assert.equal(h.galat.length, 0);
  assert.equal(h.nilai?.wilayah_kerja, 'TanjungSantan');
  assert.equal(h.nilai?.rba, 'Hijau');
  assert.ok(validasiBaris(cop, { ...sah, tgl_kedatangan: '2025-03-01' }, 2026).galat[0].includes('di luar tahun 2026'));
  assert.ok(validasiBaris(cop, { ...sah, nama_kapal: '' }, 2026).galat[0].includes('wajib'));
  assert.ok(validasiBaris(cop, { ...sah, wilayah_kerja: 'APT Pranoto' }, 2026).galat[0].includes('tidak berlaku'));
});

test('template bisa dibaca kembali sebagai berkas kosong (tanpa kolom hilang)', async () => {
  const h = await bacaExcel(await buatTemplate(cop), cop, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 0);
});

test('baca Excel: judul di baris ke-3, alias, baris kosong, galat, duplikat, kolom asing', async () => {
  const buf = await buku([
    ['REKAP COP 2026'], [],
    ['Wilker', 'Nama Kapal', 'Tgl Kedatangan', 'ABK WNI', 'RBA', 'Catatan Petugas'],
    ['Samarinda', 'KM Satu', new Date(Date.UTC(2026, 0, 5)), 10, 'Hijau', 'x'],
    ['Samarinda', 'km satu', '05/01/2026', 3, 'Hijau', ''],      // duplikat (kunci unik COP)
    [null, null, null, null, null, null],                          // kosong, dilewati
    ['Sangatta', 'KM Dua', '2026-02-30', 4, 'Merah', ''],          // tanggal tidak ada
    ['Lhoktuan', 'KM Tiga', '2026-06-01', 'banyak', 'Kuning', ''], // bilangan salah
    ['Sangatta', 'KM Empat', '2026-07-01', 0, '', ''],
  ]);
  const h = await bacaExcel(buf, cop, 2026);
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 5);
  assert.deepEqual(h.sah.map((s) => s.baris), [4, 9]);
  assert.deepEqual(h.galat.map((g) => g.baris), [5, 7, 8]);
  assert.deepEqual(h.kolomDiabaikan, ['Catatan Petugas']);
  assert.equal(h.sah[0].nilai.tgl_kedatangan, '2026-01-05');
});

test('baca Excel: kolom wajib hilang dan berkas rusak -> fatal', async () => {
  const h1 = await bacaExcel(await buku([['Nama Kapal', 'Wilker'], ['KM A', 'Samarinda']]), cop, 2026);
  assert.match(h1.fatal ?? '', /Tanggal Kedatangan/);
  const h2 = await bacaExcel(Buffer.from('bukan excel'), cop, 2026);
  assert.match(h2.fatal ?? '', /tidak dapat dibaca/);
});

// ---------------- Database ----------------
before(async () => {
  const db = getDbClient();
  await db.execute('DELETE FROM kegiatan_cop');
  await db.execute('DELETE FROM kegiatan_phqc');
  await db.execute('DELETE FROM upload_riwayat');
});
after(async () => { await tutupDb(); });

const baris = (n: Record<string, string | number | null>) => n;

test('simpan: ganti per wilayah+tahun, tidak menggandakan, tidak menyentuh data lain', async () => {
  const db = getDbClient();
  // Data lama: migrasi 2026 Sangatta (akan diganti), migrasi 2026 Samarinda (aman), migrasi 2025 Sangatta (aman)
  await db.execute({ sql: `INSERT INTO kegiatan_cop (wilayah_kerja,nama_kapal,tgl_kedatangan) VALUES (?,?,?),(?,?,?),(?,?,?)`,
    args: ['Sangatta', 'LAMA', '2026-03-03', 'Samarinda', 'AMAN1', '2026-03-03', 'Sangatta', 'AMAN2', '2025-12-31'] });

  const data = [
    baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'BARU1', tgl_kedatangan: '2026-01-02', jml_abk_wni: 5, rba: 'Hijau' }),
    baris({ wilayah_kerja: 'Sangatta', nama_kapal: 'BARU2', tgl_kedatangan: '2026-12-31', jml_abk_wni: null, rba: null }),
  ];
  const opsi = { modul: cop, tahun: 2026, namaFile: 'a.xlsx', baris: data, jumlahBaris: 3, jumlahDitolak: 1, pengguna: 'uji@bkk' };
  const r1 = await simpanUnggahan(opsi);
  assert.equal(r1.masuk, 2);
  assert.equal(r1.diganti, 1);
  const r2 = await simpanUnggahan(opsi); // unggah ulang berkas yang sama
  assert.equal(r2.diganti, 2);

  const semua = await db.execute('SELECT nama_kapal, sumber, batch_id FROM kegiatan_cop ORDER BY nama_kapal');
  assert.deepEqual(semua.rows.map((r) => r.nama_kapal), ['AMAN1', 'AMAN2', 'BARU1', 'BARU2']);
  assert.equal(semua.rows.find((r) => r.nama_kapal === 'BARU1')?.sumber, 'upload');
  assert.equal(semua.rows.find((r) => r.nama_kapal === 'BARU1')?.batch_id, r2.batchId);
  assert.equal(semua.rows.find((r) => r.nama_kapal === 'AMAN1')?.sumber, 'migrasi');

  const rw = await db.execute('SELECT jumlah_masuk, jumlah_ditolak, jumlah_diganti, dibuat_oleh FROM upload_riwayat ORDER BY dibuat_pada, jumlah_diganti');
  assert.equal(rw.rows.length, 2);
  assert.equal(rw.rows[0].dibuat_oleh, 'uji@bkk');

  // Batalkan unggahan terakhir: hanya barisnya yang hilang
  assert.equal(await hapusBatch(cop, r2.batchId), 2);
  const sisa = await db.execute('SELECT nama_kapal FROM kegiatan_cop ORDER BY nama_kapal');
  assert.deepEqual(sisa.rows.map((r) => r.nama_kapal), ['AMAN1', 'AMAN2']);
});

test('simpan gagal di tengah -> tidak ada yang berubah (transaksi)', async () => {
  const db = getDbClient();
  await db.execute('DELETE FROM kegiatan_cop');
  await db.execute('DELETE FROM upload_riwayat');
  await db.execute({ sql: `INSERT INTO kegiatan_cop (wilayah_kerja,nama_kapal,tgl_kedatangan) VALUES (?,?,?)`, args: ['Lhoktuan', 'ADA', '2026-05-05'] });
  const rusak = [
    baris({ wilayah_kerja: 'Lhoktuan', nama_kapal: 'X', tgl_kedatangan: '2026-05-06' }),
    baris({ wilayah_kerja: 'Lhoktuan', nama_kapal: 'X', tgl_kedatangan: '2026-05-06' }), // melanggar UNIQUE
  ];
  await assert.rejects(simpanUnggahan({ modul: cop, tahun: 2026, namaFile: 'b.xlsx', baris: rusak, jumlahBaris: 2, jumlahDitolak: 0, pengguna: 'u' }));
  const r = await db.execute('SELECT nama_kapal FROM kegiatan_cop');
  assert.deepEqual(r.rows.map((x) => x.nama_kapal), ['ADA']);
  assert.equal((await db.execute('SELECT COUNT(*) n FROM upload_riwayat')).rows[0].n, 0);
});

test('form: tambah satu, duplikat COP dilaporkan, daftar memfilter', async () => {
  const n = baris({ wilayah_kerja: 'Samarinda', nama_kapal: 'FORM', tgl_kedatangan: '2026-08-08', jml_abk_wna: 2, jml_abk_wni: 9, rba: 'Kuning' });
  assert.equal(await tambahSatu(cop, n), 'ok');
  assert.equal(await tambahSatu(cop, n), 'duplikat');
  const d = await daftarData(cop, { tahun: 2026, wilayah: 'Samarinda', sumber: 'input' });
  assert.equal(d.total, 1);
  assert.equal(d.baris[0].nama_kapal, 'FORM');
  assert.equal((await daftarData(cop, { tahun: 2025 })).total, 0);
});

test('PHQC (tanpa kunci unik): ganti per wilayah+tahun', async () => {
  const mk = (k: string, t: string) => baris({ wilayah_kerja: 'Sangkulirang', nama_kapal: k, tgl_keberangkatan: t, jml_penumpang_wni: 1, tujuan_berlayar: 'Dalam Negeri' });
  const opsi = { modul: phqc, tahun: 2026, namaFile: 'p.xlsx', baris: [mk('S1', '2026-01-01'), mk('S1', '2026-01-01')], jumlahBaris: 2, jumlahDitolak: 0, pengguna: 'u' };
  await simpanUnggahan(opsi);
  const r2 = await simpanUnggahan(opsi);
  assert.equal(r2.diganti, 2);
  assert.equal((await daftarData(phqc, {})).total, 2);
});
