// Uji input stok ICV/e-ICV dan vaksin: buku besar (sisa berjalan), input mundur, stok negatif, unggah Excel, pembatalan,
// pemilihan sumber stok (Sheets vs aplikasi). Bagian 1 murni; bagian 2 butuh MariaDB berisi schema 01, 02, 05, 08.
//   NODE_OPTIONS="--conditions=react-server" npx tsx --test --test-force-exit scripts/migrate/uji-klinik-stok.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { hitungSisa, jenisDariTeks, terapkanEntri, validasiStok, type BarisBuku } from '../../lib/klinik/stok-input';
import { bacaExcelStok, buatTemplateStok } from '../../lib/klinik/stok-excel';
import { GalatStok, daftarStokApp, hapusBatchStok, hapusEntriStok, hitungRencanaStok, saldoStokApp, simpanEntriStok, simpanUnggahanStok } from '../../lib/klinik/stok-simpan';
import { daftarKlinikDiizinkan, kunciSumberApp, type KlinikRingkas } from '../../lib/klinik/akses';
import { getDatasetStokVaksin } from '../../lib/klinik/dataset-stok';
import { getSumberAktifStok } from '../../lib/klinik/stok-queries';
import { getDbClient, tutupDb } from '../../lib/db/client';

const HARI_INI = new Date(2026, 9, 29);

// ---------------------------------------------------------------- Bagian 1: murni

test('sisa berjalan seperti rumus Sheets (sheet: 119 masuk, terbit 0, lalu 30, 25 -> 119, 89, 64)', () => {
  const b: BarisBuku[] = [
    { tanggal: '2026-01-01', masuk: 119, terbit: 0, rusak: 0, keterangan: '' },
    { tanggal: '2026-01-02', masuk: 0, terbit: 30, rusak: 0, keterangan: '' },
    { tanggal: '2026-01-03', masuk: 0, terbit: 25, rusak: 0, keterangan: '' },
    { tanggal: '2026-01-04', masuk: 0, terbit: 1, rusak: 0, keterangan: '' },
    { tanggal: '2026-01-05', masuk: 100, terbit: 34, rusak: 0, keterangan: '' },
  ];
  assert.deepEqual(hitungSisa(b).sisa, [119, 89, 64, 63, 129]);
  assert.equal(hitungSisa([{ tanggal: '2026-01-01', masuk: 5, terbit: 4, rusak: 3, keterangan: '' }]).negatif?.sisa, -2);
});

test('terapkanEntri: tambah, tolak tanggal ganda tanpa ganti, ganti, urut tanggal', () => {
  const dasar: BarisBuku[] = [{ tanggal: '2026-01-05', masuk: 10, terbit: 0, rusak: 0, keterangan: '' }];
  const e = { jenis: 'mm', tanggal: '2026-01-02', masuk: 1, terbit: 0, rusak: 0, keterangan: '' };
  assert.deepEqual(terapkanEntri(dasar, e, false).buku.map((x) => x.tanggal), ['2026-01-02', '2026-01-05']);
  assert.equal(terapkanEntri(dasar, { ...e, tanggal: '2026-01-05' }, false).sudahAda, true);
  assert.equal(terapkanEntri(dasar, { ...e, tanggal: '2026-01-05', masuk: 99 }, true).buku[0].masuk, 99);
});

test('validasi: jenis, tanggal, angka; masa depan dan angka tidak sah ditolak', () => {
  const ok = validasiStok({ jenis: 'e-icv', tanggal: '2026-10-27', masuk: '119', terbit: 30, rusak: '', keterangan: ' booster ' }, { hariIni: HARI_INI });
  assert.deepEqual(ok.nilai, { jenis: 'e-icv', tanggal: '2026-10-27', masuk: 119, terbit: 30, rusak: 0, keterangan: 'booster' });
  assert.equal(validasiStok({ jenis: 'mm', tanggal: '27/10/2026', masuk: 1 }, { hariIni: HARI_INI }).nilai?.tanggal, '2026-10-27');
  assert.match(validasiStok({ jenis: 'mm', tanggal: '2026-12-31', masuk: 1 }, { hariIni: HARI_INI }).galat.join(), /besok/);
  assert.match(validasiStok({ jenis: 'mm', tanggal: '2026-10-27', terbit: '-3' }, { hariIni: HARI_INI }).galat.join(), /Terbit/);
  assert.match(validasiStok({ jenis: 'mm', tanggal: '2026-10-27', terbit: '1,5' }, { hariIni: HARI_INI }).galat.join(), /Terbit/);
  assert.match(validasiStok({ jenis: 'mm', tanggal: '2026-10-27', terbit: 1.5 }, { hariIni: HARI_INI }).galat.join(), /Terbit/);
  assert.match(validasiStok({ jenis: 'racun', tanggal: '2026-10-27' }, { hariIni: HARI_INI }).galat.join(), /tidak dikenal/);
  assert.match(validasiStok({ tanggal: '2026-10-27' }, { hariIni: HARI_INI }).galat.join(), /wajib dipilih/);
  assert.equal(validasiStok({ tanggal: '2026-10-27', masuk: 1 }, { hariIni: HARI_INI, jenisBawaan: 'yf' }).nilai?.jenis, 'yf');
});

test('jenisDariTeks: nama tab/label Sheets dikenali', () => {
  for (const [t, k] of [['e-ICV', 'e-icv'], ['E-ICV', 'e-icv'], ['eicv', 'e-icv'], ['ICV', 'icv'], ['Meningitis (MM)', 'mm'], ['MM', 'mm'], ['Yellow Fever', 'yf'], ['YF', 'yf'], ['Polio', 'polio'], ['Influenza', 'flu'], ['flu', 'flu']]) assert.equal(jenisDariTeks(t), k, t);
  assert.equal(jenisDariTeks('Rabies'), null);
  assert.equal(jenisDariTeks(''), null);
});

async function buku(baris: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Stok E-ICV');
  baris.forEach((b) => ws.addRow(b));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('Excel berjudul tab Sheets lama (Tanggal, Stok Masuk, E-ICV Terbit, Sisa): baris templat kosong dilewati, Sisa diabaikan', async () => {
  const b = await buku([
    ['Laporan stok e-ICV'], [],
    ['Tanggal', 'Stok Masuk', 'E-ICV Terbit', 'Sisa'],
    ['01/01/2026', 119, 0, 119], ['02/01/2026', '', 30, 89], ['03/01/2026', '', 25, 64], ['04/01/2026', '', '', 64], ['05/01/2026', 100, 34, 129],
  ]);
  const h = await bacaExcelStok(b, { hariIni: HARI_INI, jenisBawaan: 'e-icv' });
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 4); // 04/01 tanpa angka = sisa templat, bukan data
  assert.equal(h.sah.length, 4, JSON.stringify(h.galat));
  assert.deepEqual(h.sah.map((s) => [s.nilai.tanggal, s.nilai.masuk, s.nilai.terbit]), [['2026-01-01', 119, 0], ['2026-01-02', 0, 30], ['2026-01-03', 0, 25], ['2026-01-05', 100, 34]]);
  assert.ok(h.kolomDiabaikan.includes('Sisa'));
  // tanpa kolom jenis dan tanpa jenis bawaan = ditolak dengan petunjuk
  assert.match((await bacaExcelStok(b, { hariIni: HARI_INI })).fatal ?? '', /Jenis Stok/);
});

test('Excel template: kolom jenis per baris; tanggal ganda dan tanggal masa depan ditolak per baris; gaya tanggal bercampur ditolak', async () => {
  const b = await buku([
    ['Jenis Stok', 'Tanggal', 'Stok Masuk', 'Terbit', 'Rusak', 'Keterangan'],
    ['Meningitis (MM)', '27/10/2026', 50, 0, 0, 'awal'], ['MM', '27/10/2026', 1, 0, 0, ''], ['Polio', '28/10/2026', 5, 1, 0, ''],
    ['Rabies', '27/10/2026', 5, 0, 0, ''], ['Flu', '01/12/2026', 5, 0, 0, ''],
  ]);
  const h = await bacaExcelStok(b, { hariIni: HARI_INI });
  assert.equal(h.sah.length, 2);
  assert.equal(h.galat.length, 3);
  const pesan = h.galat.map((g) => g.pesan.join(' '));
  assert.ok(pesan.some((p) => /sama dengan baris/.test(p)));
  assert.ok(pesan.some((p) => /tidak dikenal/.test(p)));
  assert.ok(pesan.some((p) => /besok/.test(p)));
  const campur = await buku([['Tanggal', 'Terbit'], ['25/10/2026', 1], ['10/25/2026', 1]]);
  assert.match((await bacaExcelStok(campur, { hariIni: HARI_INI, jenisBawaan: 'mm' })).fatal ?? '', /bercampur/);
  const t = await bacaExcelStok(await buatTemplateStok(), { hariIni: HARI_INI });
  assert.equal(t.fatal, null);
  assert.equal(t.jumlahBaris, 0);
});

// ---------------------------------------------------------------- Bagian 2: database

const NAMA_A = 'UJI-STOK-A';
const NAMA_B = 'UJI-STOK-B';
let A: KlinikRingkas;
let B: KlinikRingkas;

async function bersihkan() {
  const db = getDbClient();
  const r = await db.execute({ sql: 'SELECT id FROM klinik_binaan WHERE nama_klinik IN (?, ?)', args: [NAMA_A, NAMA_B] });
  for (const x of r.rows) {
    await db.execute({ sql: 'DELETE FROM stok_vaksin WHERE spreadsheet_id = ?', args: [kunciSumberApp(String(x.id))] });
    await db.execute({ sql: 'DELETE FROM upload_riwayat WHERE modul = ?', args: ['stk:' + String(x.id)] });
  }
  await db.execute({ sql: 'DELETE FROM stok_vaksin WHERE spreadsheet_id IN (?, ?)', args: ['SHEET-UJI-STOK-A', 'SHEET-UJI-STOK-B'] });
  await db.execute({ sql: 'DELETE FROM klinik_binaan WHERE nama_klinik IN (?, ?)', args: [NAMA_A, NAMA_B] });
}
async function siapkan() {
  const db = getDbClient();
  await bersihkan();
  await db.execute({ sql: `INSERT INTO klinik_binaan (nama_klinik, kategori) VALUES (?, 'klinik'), (?, 'klinik')`, args: [NAMA_A, NAMA_B] });
  const hasil = await daftarKlinikDiizinkan({ id: 'u', role: 'admin', email: null, status: 'approved', namaLengkap: null });
  A = hasil.find((k) => k.nama_klinik === NAMA_A)!;
  B = hasil.find((k) => k.nama_klinik === NAMA_B)!;
}
after(async () => { await bersihkan(); await tutupDb(); });

const E = (jenis: string, tanggal: string, masuk = 0, terbit = 0, rusak = 0, keterangan = '') => ({ jenis, tanggal, masuk, terbit, rusak, keterangan });

test('buku stok: sisa berjalan, ganti hari, input mundur menghitung ulang, stok negatif ditolak tanpa mengubah apa pun', async () => {
  await siapkan();
  assert.equal(await simpanEntriStok(A, E('mm', '2026-10-01', 100)), 'ok');
  assert.equal(await simpanEntriStok(A, E('mm', '2026-10-03', 0, 30, 2)), 'ok');
  assert.equal(await simpanEntriStok(A, E('mm', '2026-10-03', 0, 1)), 'ada');           // tanggal sudah terisi, tidak menimpa diam-diam
  let d = await daftarStokApp(A.id, 'mm');
  assert.deepEqual(d.baris.map((x) => [x.tanggal, x.sisa]), [['2026-10-03', 68], ['2026-10-01', 100]]);

  // input mundur: hari tengah menggeser sisa hari sesudahnya
  assert.equal(await simpanEntriStok(A, E('mm', '2026-10-02', 0, 10)), 'ok');
  d = await daftarStokApp(A.id, 'mm');
  assert.deepEqual(d.baris.map((x) => [x.tanggal, x.sisa]), [['2026-10-03', 58], ['2026-10-02', 90], ['2026-10-01', 100]]);

  // ganti hari yang ada
  assert.equal(await simpanEntriStok(A, E('mm', '2026-10-03', 0, 5, 0, 'koreksi'), { ganti: true }), 'ok');
  assert.equal((await daftarStokApp(A.id, 'mm')).baris[0].sisa, 85);
  assert.equal((await daftarStokApp(A.id, 'mm')).baris[0].keterangan, 'koreksi');

  // stok negatif: ditolak dan buku tidak berubah
  await assert.rejects(simpanEntriStok(A, E('mm', '2026-10-04', 0, 500)), (e: unknown) => e instanceof GalatStok && /Stok tidak cukup/.test((e as Error).message));
  assert.equal((await daftarStokApp(A.id, 'mm')).total, 3);
  // input mundur yang membuat hari sesudahnya negatif juga ditolak
  await assert.rejects(simpanEntriStok(A, E('mm', '2026-10-02', 0, 98), { ganti: true }), GalatStok); // 100-98=2, lalu 10-03 terbit 5 -> -3
  assert.equal((await daftarStokApp(A.id, 'mm')).baris[1].sisa, 90);

  // jenis lain dan klinik lain terpisah
  assert.equal(await simpanEntriStok(A, E('yf', '2026-10-01', 7)), 'ok');
  assert.equal(await simpanEntriStok(B, E('mm', '2026-10-01', 3)), 'ok');
  assert.deepEqual((await saldoStokApp(A.id)).map((s) => [s.jenis, s.sisa]).sort(), [['mm', 85], ['yf', 7]]);
  assert.deepEqual((await saldoStokApp(B.id)).map((s) => [s.jenis, s.sisa]), [['mm', 3]]);

  // hapus satu hari menghitung ulang; menghapus hari yang membuat sisa negatif ditolak
  assert.equal(await hapusEntriStok(A, 'mm', '2026-10-02'), 1);
  assert.equal((await daftarStokApp(A.id, 'mm')).baris[0].sisa, 95);
  await assert.rejects(hapusEntriStok(A, 'mm', '2026-10-01'), GalatStok); // buang stok awal -> sisa negatif
  assert.equal(await hapusEntriStok(A, 'mm', '2099-01-01'), 0);
});

test('unggah Excel stok: pratinjau = hasil simpan; ganti hari lama; batalkan hanya hari yang dimasukkan unggahan', async () => {
  await siapkan();
  await simpanEntriStok(A, E('e-icv', '2026-01-01', 119));
  const entri = [E('e-icv', '2026-01-01', 119), E('e-icv', '2026-01-02', 0, 30), E('e-icv', '2026-01-03', 0, 25), E('icv', '2026-01-01', 10)];
  const rencana = await hitungRencanaStok(A, entri);
  assert.deepEqual(rencana, { baru: 3, diganti: 1 });
  const r = await simpanUnggahanStok({ klinik: A, namaFile: 'stok.xlsx', entri, jumlahBaris: 4, jumlahDitolak: 0, pengguna: 'uji' });
  assert.deepEqual([r.baru, r.diganti], [3, 1]);
  assert.deepEqual((await daftarStokApp(A.id, 'e-icv')).baris.map((x) => x.sisa), [64, 89, 119]);

  // pembatalan menghapus semua hari yang dimasukkan unggahan itu (termasuk hari yang diganti)
  assert.equal(await hapusBatchStok(A, r.batchId), 4);
  assert.equal((await daftarStokApp(A.id, 'e-icv')).total, 0);

  // unggahan yang membuat sisa negatif ditolak seluruhnya (tidak ada yang tersimpan)
  await assert.rejects(simpanUnggahanStok({ klinik: A, namaFile: 'x.xlsx', entri: [E('mm', '2026-02-01', 5), E('mm', '2026-02-02', 0, 9)], jumlahBaris: 2, jumlahDitolak: 0, pengguna: 'uji' }), GalatStok);
  assert.equal((await daftarStokApp(A.id, 'mm')).total, 0);
  assert.equal(Number((await getDbClient().execute({ sql: 'SELECT COUNT(*) n FROM upload_riwayat WHERE modul = ?', args: ['stk:' + A.id] })).rows[0].n), 0);
});

test('dashboard stok: sumber aktif = yang tanggalnya terbaru (sama = aplikasi); klinik dipersempit; tidak dihitung ganda', async () => {
  await siapkan();
  const db = getDbClient();
  await db.execute({ sql: 'UPDATE klinik_binaan SET spreadsheet_id = ? WHERE id = ?', args: ['SHEET-UJI-STOK-A', A.id] });
  const sheetRow = (no: number, tgl: string, sisa: number) => db.execute({
    sql: `INSERT INTO stok_vaksin (spreadsheet_id, nama_klinik, jenis_stok, no_baris, tanggal, sumber, raw_json) VALUES ('SHEET-UJI-STOK-A', ?, 'mm', ?, ?, 'sheet', ?)`,
    args: [NAMA_A, no, tgl, JSON.stringify({ 'Tanggal': tgl, 'Vaksin Terbit': 5, 'Vaksin Rusak': 0, 'Sisa Stok (Pelayanan)': sisa })],
  });
  await sheetRow(1, '2026-09-29', 40); await sheetRow(2, '2026-09-30', 35);

  const kl = [{ id: A.id, nama_klinik: NAMA_A, spreadsheet_id: 'SHEET-UJI-STOK-A' }];
  // hanya Sheets
  assert.equal((await getSumberAktifStok(kl)).get(`${A.id}|mm`), 'SHEET-UJI-STOK-A');
  let r = (await getDatasetStokVaksin({ klinikIds: [A.id] })).ringkasan.filter((x) => x.jenisStok === 'mm');
  assert.deepEqual(r.map((x) => x.sisaStokTerkini), [35]);

  // aplikasi dengan data lebih baru mengambil alih; Sheets tidak ikut dihitung
  await simpanEntriStok(A, E('mm', '2026-10-05', 20, 4));
  assert.equal((await getSumberAktifStok(kl)).get(`${A.id}|mm`), kunciSumberApp(A.id));
  r = (await getDatasetStokVaksin({ klinikIds: [A.id] })).ringkasan.filter((x) => x.jenisStok === 'mm');
  assert.deepEqual(r.map((x) => x.sisaStokTerkini), [16]);
  assert.equal(r[0].totalTerbit, 4);

  // aplikasi lebih lama dari Sheets -> Sheets tetap dipakai
  await bersihkan(); await siapkan();
  await db.execute({ sql: 'UPDATE klinik_binaan SET spreadsheet_id = ? WHERE id = ?', args: ['SHEET-UJI-STOK-A', A.id] });
  await sheetRow(1, '2026-10-20', 12);
  await simpanEntriStok(A, E('mm', '2026-10-01', 9));
  const kl2 = [{ id: A.id, nama_klinik: NAMA_A, spreadsheet_id: 'SHEET-UJI-STOK-A' }]; // klinik dibuat ulang: id baru
  assert.equal((await getSumberAktifStok(kl2)).get(`${A.id}|mm`), 'SHEET-UJI-STOK-A');

  // dipersempit: klinik B tidak ikut; daftar kosong = tidak ada
  await simpanEntriStok(B, E('mm', '2026-10-05', 3));
  const hanyaB = (await getDatasetStokVaksin({ klinikIds: [B.id] })).ringkasan;
  assert.deepEqual(hanyaB.map((x) => x.namaKlinik), [NAMA_B]);
  assert.deepEqual((await getDatasetStokVaksin({ klinikIds: [] })).ringkasan, []);
});
