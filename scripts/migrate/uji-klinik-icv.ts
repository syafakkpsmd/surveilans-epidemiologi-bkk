// Uji input ICV/e-ICV (form + unggah Excel), akses per klinik, dan parse-tanggal bersama.
// Bagian 1 murni. Bagian 2 butuh MariaDB berisi schema 01, 02, 05, 08.
//   DB_USER=... DB_PASSWORD=... DB_NAME=... [DB_SOCKET=...] npx tsx --test --test-force-exit scripts/migrate/uji-klinik-icv.ts
// Data KARANGAN (bukan data pasien); judul kolom dan bentuk nilai meniru sheet ICV lama.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseTanggal, tentukanUrutanKolom } from '../../lib/tanggal/parse-tanggal';
import { JUDUL_ICV, validasiIcv } from '../../lib/klinik/icv-input';
import { bacaExcelIcv, buatTemplateIcv } from '../../lib/klinik/icv-excel';
import { deteksiKomorbid, komorbidDariBaris } from '../../lib/klinik/komorbid';
import { daftarKlinikDiizinkan, klinikBolehDiakses, kunciSumberApp } from '../../lib/klinik/akses';
import { daftarIcvTerbaru, hapusBatchIcv, hapusBarisIcv, noDokumenSudahAda, simpanUnggahanIcv, tambahIcv } from '../../lib/klinik/icv-simpan';
import { getDatasetKlinik } from '../../lib/klinik/dataset';
import { getDatasetStokVaksin } from '../../lib/klinik/dataset-stok';
import { getDbClient, tutupDb } from '../../lib/db/client';
import type { Pengguna } from '../../lib/auth/session';

const HARI_INI = new Date(2026, 9, 29);

// ---------------------------------------------------------------- Bagian 1: murni

test('parse-tanggal bersama: format Indonesia/Inggris/serial, ambigu ditandai, tidak valid ditolak', () => {
  const p = (v: unknown) => parseTanggal(v as never, { hariIni: HARI_INI });
  assert.deepEqual(p('28/02/2026'), { iso: '2026-02-28', ambigu: false });
  assert.equal(p('02/01/2026').iso, '2026-01-02');
  assert.equal(p('02/01/2026').ambigu, true);
  assert.deepEqual(p('27 Oktober 2026'), { iso: '2026-10-27', ambigu: false });
  assert.equal(p(46322).iso, '2026-10-27');
  assert.equal(p('13/13/2026').iso, null);
  assert.equal(p('01/01/2099').iso, null);
  assert.deepEqual(tentukanUrutanKolom(['02/01/2026', '28/02/2026']).urutan, 'dmy');
  assert.equal(tentukanUrutanKolom(['25/10/2026', '10/25/2026']).bertentangan, true);
});

// Baris contoh dari sheet lama (nilai karangan)
const BARIS_CONTOH: Record<string, unknown> = {
  'No Dokumen ICV / e-ICV': 'E26-000002254', 'Tanggal Terbit': '02/01/2026', 'Nama': 'DEWI UJI KINDI', 'Tanggal Lahir': '28/05/1975',
  'Jenis Kelamin': 'Perempuan', 'Kebangsaan': 'Indonesia', 'No Paspor': 'e0479084', 'NIK': '6472036805750001', 'Tanggal Berangkat': '17/01/2026',
  'No HP': '08125520028', 'Email': 'uji@example.com', 'Jenis Vaksin 1': 'meningitis', 'Jenis Vaksin 2': 'Polio', 'WUS': 'Tidak',
  'Kontraindikasi': '-', 'Masa Berlaku MM Sampai': '02/01/2029', 'KIPI': 'Tidak', 'Jenis Layanan': 'Vaksinasi', 'Nama Travel': 'Sejati',
};

test('validasi ICV: baris sheet lama diterima dan dinormalkan ke kunci/format dashboard', () => {
  const h = validasiIcv(BARIS_CONTOH, { hariIni: HARI_INI });
  assert.deepEqual(h.galat, []);
  const n = h.nilai!;
  assert.equal(n['Tanggal Terbit'], '02/01/2026');           // dd/mm/yyyy, sama dengan baris hasil sinkronisasi lama
  assert.equal(n['Tanggal Lahir'], '28/05/1975');
  assert.equal(n['Jenis Vaksin 1'], 'Meningitis');           // dibakukan menurut daftar
  assert.equal(n['Jenis Vaksin 3'], '');
  assert.equal(n['No Paspor'], 'E0479084');
  assert.equal(n['WUS'], 'Tidak');
  assert.equal(n['Komorbid 1'], ''); assert.equal(n['Komorbid 2'], '');
  assert.ok(h.peringatan.some((x) => x.startsWith('Tanggal Terbit: ambigu')), 'tanggal ambigu harus diberi peringatan');
});

test('validasi ICV: wajib, vaksin tak boleh ganda, WUS hanya perempuan, tanggal masa depan, NIK', () => {
  const g = (o: Record<string, unknown>) => validasiIcv({ ...BARIS_CONTOH, ...o }, { hariIni: HARI_INI });
  assert.match(g({ 'Nama': '' }).galat.join('|'), /Nama: wajib/);
  assert.match(g({ 'No Dokumen ICV / e-ICV': '' }).galat.join('|'), /No Dokumen/);
  assert.match(g({ 'Jenis Vaksin 1': '', 'Jenis Vaksin 2': '' }).galat.join('|'), /Jenis Vaksin 1: wajib/);
  assert.equal(g({ 'Jenis Vaksin 1': '', 'Jenis Vaksin 2': '', 'Jenis Layanan': 'Legalisasi' }).galat.length, 0); // bukan vaksinasi
  assert.match(g({ 'Jenis Vaksin 2': 'meningitis' }).galat.join('|'), /sudah dipilih/);
  assert.match(g({ 'Tanggal Terbit': '05/11/2026' }).galat.join('|'), /masa depan/);
  assert.match(g({ 'Tanggal Terbit': '31/02/2026' }).galat.join('|'), /Tanggal Terbit/);
  assert.match(g({ 'Jenis Kelamin': 'X' }).galat.join('|'), /Jenis Kelamin/);
  assert.match(g({ 'NIK': '64720ABC' }).galat.join('|'), /NIK: hanya boleh berisi angka/);
  assert.match(g({ 'NIK': '12345' }).peringatan.join('|'), /NIK: 5 digit/);
  assert.match(g({ 'NIK': 6472036805750001 }).galat.join('|'), /NIK: tersimpan sebagai angka/);
  const pria = g({ 'Jenis Kelamin': 'Pria', 'WUS': 'Ya', 'Hasil WUS': 'Hamil' }).nilai!;
  assert.equal(pria['Jenis Kelamin'], 'Laki-laki'); assert.equal(pria['WUS'], ''); assert.equal(pria['Hasil WUS'], '');
  assert.match(g({ 'WUS': 'mungkin' }).galat.join('|'), /WUS/);
  assert.equal(g({ 'WUS': 'Ya', 'Hasil WUS': 'Hamil' }).nilai!['Hasil WUS'], 'Hamil');
  assert.match(g({ 'Jenis Layanan': 'Lain' }).galat.join('|'), /Jenis Layanan/);
});

test('validasi ICV: komorbid bisa ditambah (bukan koma), tanpa ganda, "-" dianggap kosong', () => {
  const g = (o: Record<string, unknown>) => validasiIcv({ ...BARIS_CONTOH, ...o }, { hariIni: HARI_INI });
  const n = g({ 'Komorbid 1': 'hipertensi', 'Komorbid 2': 'Diabetes', 'Komorbid 3': 'Hipertiroid', 'Komorbid 4': 'diabetes', 'Komorbid 5': '-' }).nilai!;
  assert.deepEqual([n['Komorbid 1'], n['Komorbid 2'], n['Komorbid 3'], n['Komorbid 4']], ['Hipertensi', 'Diabetes', 'Hipertiroid', undefined]);
  assert.match(g({ 'Komorbid 1': 'Hipertensi, Diabetes' }).galat.join('|'), /jangan dipisah koma/);
  assert.equal(g({ 'Komorbid 1': 'Penyakit Langka X' }).nilai!['Komorbid 1'], 'Penyakit Langka X'); // penyakit di luar daftar diterima
  assert.equal(g({ 'Komorbid 1': '-' }).nilai!['Komorbid 1'], '');
});

test('validasi ICV: sel Date Excel dibaca komponen UTC (aman di zona waktu mana pun)', () => {
  const h = validasiIcv({ ...BARIS_CONTOH, 'Tanggal Terbit': new Date(Date.UTC(2026, 9, 27)), 'Tanggal Lahir': new Date(Date.UTC(1975, 4, 28)) }, { hariIni: HARI_INI });
  assert.deepEqual(h.galat, []);
  assert.equal(h.nilai!['Tanggal Terbit'], '27/10/2026');
  assert.equal(h.nilai!['Tanggal Lahir'], '28/05/1975');
});


test('dashboard komorbid: semua isian Komorbid N dibaca; Hipertiroid/Riwayat Tumor dikenal; penyakit lain = Lainnya', () => {
  assert.deepEqual(komorbidDariBaris({ 'Komorbid 3': 'C', 'Komorbid 1': 'A', 'Komorbid 2': 'B', 'Nama': 'X' }), ['A', 'B', 'C']);
  assert.equal(deteksiKomorbid('Hipertiroid'), 'hipertiroid');
  assert.equal(deteksiKomorbid('Riwayat Tumor'), 'tumor');
  assert.equal(deteksiKomorbid('Hipertensi'), 'hipertensi');
  assert.equal(deteksiKomorbid('Penyakit Langka X'), 'lainnya');
  assert.equal(deteksiKomorbid('-'), null);
  assert.equal(deteksiKomorbid('Tidak'), null);
  assert.equal(deteksiKomorbid(''), null);
});

// ---------------------------------------------------------------- Excel (tanpa DB)

async function xlsx(rows: unknown[][], judul = JUDUL_ICV): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data ICV');
  ws.addRow(['Laporan ICV karangan']); ws.addRow([]);
  ws.addRow(judul);
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const baris = (o: Record<string, unknown>, judul = JUDUL_ICV) => judul.map((j) => (j === 'No' ? 1 : o[j] ?? ''));

test('Excel ICV: judul laporan dilewati, tanggal teks per kolom diselesaikan, duplikat dalam berkas dan galat dilaporkan', async () => {
  const a = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'U-1', 'Tanggal Terbit': '25/10/2026' };           // bukti dmy
  const b = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'U-2', 'Tanggal Terbit': '02/01/2026' };           // ambigu -> dmy karena kolom terbukti dmy
  const c = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'U-1', 'Nama': 'DUPLIKAT DALAM BERKAS' };         // nomor sama dengan baris a
  const d = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'U-4', 'Nama': '' };                                // galat
  const h = await bacaExcelIcv(await xlsx([baris(a), baris(b), baris(c), baris(d)]), { hariIni: HARI_INI });
  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 4);
  assert.deepEqual(h.sah.map((s) => s.nilai['No Dokumen ICV / e-ICV']), ['U-1', 'U-2']);
  assert.equal(h.sah[1].nilai['Tanggal Terbit'], '02/01/2026');
  assert.equal(h.urutan['Tanggal Terbit'], 'dmy');
  assert.equal(h.sah[1].peringatan.some((x) => x.startsWith('Tanggal Terbit: ambigu')), false); // sudah terbukti, tak perlu peringatan
  assert.equal(h.galat.length, 2);
  assert.match(h.galat[0].pesan[0], /sama dengan baris 4/); // nomor baris Excel (judul laporan 2 baris + judul kolom di baris 3)
  assert.match(h.galat[1].pesan.join('|'), /Nama: wajib/);
});

test('Excel ICV: kolom tanggal bercampur dua gaya ditolak seluruhnya; bergaya bulan/hari terbukti dibaca benar', async () => {
  const x = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'M-1', 'Tanggal Terbit': '10/25/2026' };
  const y = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'M-2', 'Tanggal Terbit': '25/10/2026' };
  assert.match((await bacaExcelIcv(await xlsx([baris(x), baris(y)]), { hariIni: HARI_INI })).fatal ?? '', /bercampur dua gaya/);
  const z = { ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'M-3', 'Tanggal Terbit': '10/05/2026' };
  const h = await bacaExcelIcv(await xlsx([baris(x), baris(z)]), { hariIni: HARI_INI });
  assert.equal(h.urutan['Tanggal Terbit'], 'mdy');
  assert.equal(h.sah[1].nilai['Tanggal Terbit'], '05/10/2026'); // 10/05/2026 gaya AS = 5 Oktober
});

test('Excel ICV: kolom wajib hilang, NIK sebagai angka, template terbaca kembali', async () => {
  const tanpaNama = JUDUL_ICV.filter((j) => j !== 'Nama');
  assert.match((await bacaExcelIcv(await xlsx([baris(BARIS_CONTOH, tanpaNama)], tanpaNama))).fatal ?? '', /Kolom wajib tidak ditemukan: Nama/);
  const nikAngka = await bacaExcelIcv(await xlsx([baris({ ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'N-1', 'NIK': 6472036805750001 })]), { hariIni: HARI_INI });
  assert.match(nikAngka.galat[0].pesan.join('|'), /NIK: tersimpan sebagai angka/);
  const t = await bacaExcelIcv(await buatTemplateIcv(), { hariIni: HARI_INI });
  assert.equal(t.fatal, null); assert.equal(t.jumlahBaris, 0);
});

// ---------------------------------------------------------------- Bagian 2: database

const PENGGUNA = (role: string, id = 'u-' + role): Pengguna => ({ id, role, email: null, status: 'approved', namaLengkap: null });
const KLINIK_A = 'UJI-KLINIK-A';
const KLINIK_B = 'UJI-KLINIK-B';
let idA = '', idB = '';

async function siapkan() {
  const db = getDbClient();
  await bersihkan();
  await db.execute({ sql: `INSERT INTO klinik_binaan (nama_klinik, kategori) VALUES (?, 'klinik'), (?, 'klinik')`, args: [KLINIK_A, KLINIK_B] });
  const r = await db.execute({ sql: 'SELECT id, nama_klinik FROM klinik_binaan WHERE nama_klinik IN (?, ?)', args: [KLINIK_A, KLINIK_B] });
  idA = String(r.rows.find((x) => x.nama_klinik === KLINIK_A)!.id);
  idB = String(r.rows.find((x) => x.nama_klinik === KLINIK_B)!.id);
}
async function bersihkan() {
  const db = getDbClient();
  const r = await db.execute({ sql: 'SELECT id FROM klinik_binaan WHERE nama_klinik IN (?, ?)', args: [KLINIK_A, KLINIK_B] });
  for (const k of r.rows) {
    await db.execute({ sql: 'DELETE FROM data_icv WHERE spreadsheet_id = ?', args: ['app-' + k.id] });
    await db.execute({ sql: 'DELETE FROM upload_riwayat WHERE modul = ?', args: ['icv:' + k.id] });
  }
  await db.execute({ sql: 'DELETE FROM klinik_akses WHERE user_id LIKE ?', args: ['uji-%'] });
  await db.execute({ sql: 'DELETE FROM klinik_binaan WHERE nama_klinik IN (?, ?)', args: [KLINIK_A, KLINIK_B] });
}
after(async () => { await bersihkan(); await tutupDb(); });

test('akses klinik: admin/petugas semua klinik; petugas klinik hanya yang ditautkan; lainnya tidak ada', async () => {
  await siapkan();
  const db = getDbClient();
  await db.execute({ sql: 'INSERT INTO klinik_akses (user_id, klinik_id) VALUES (?, ?)', args: ['uji-pk1', idA] });
  const nama = async (p: Pengguna | null) => (await daftarKlinikDiizinkan(p)).map((k) => k.nama_klinik).filter((n) => n.startsWith('UJI-'));
  assert.deepEqual(await nama(PENGGUNA('petugas_klinik', 'uji-pk1')), [KLINIK_A]);
  assert.deepEqual(await nama(PENGGUNA('petugas_klinik', 'uji-pk-lain')), []);
  assert.deepEqual((await nama(PENGGUNA('admin'))).sort(), [KLINIK_A, KLINIK_B]);
  assert.deepEqual((await nama(PENGGUNA('petugas'))).sort(), [KLINIK_A, KLINIK_B]);
  assert.deepEqual(await nama(PENGGUNA('tamu')), []);
  assert.deepEqual(await nama(null), []);
  assert.ok(await klinikBolehDiakses(PENGGUNA('petugas_klinik', 'uji-pk1'), idA));
  assert.equal(await klinikBolehDiakses(PENGGUNA('petugas_klinik', 'uji-pk1'), idB), null, 'tidak boleh klinik lain');
  await db.execute({ sql: 'DELETE FROM klinik_binaan WHERE id = ?', args: [idA] }); // FK ON DELETE CASCADE membersihkan akses
  assert.equal((await db.execute({ sql: 'SELECT COUNT(*) n FROM klinik_akses WHERE klinik_id = ?', args: [idA] })).rows[0].n, 0);
});

test('tambah satu: kunci sumber dibuat, nomor baris berlanjut, duplikat ditolak, terbaca dashboard', async () => {
  await siapkan();
  const k = (await daftarKlinikDiizinkan(PENGGUNA('admin'))).find((x) => x.nama_klinik === KLINIK_A)!;
  const nilai = validasiIcv(BARIS_CONTOH, { hariIni: HARI_INI }).nilai!;
  assert.equal(await tambahIcv(k, nilai), 'ok');
  assert.equal(await tambahIcv(k, nilai), 'duplikat');
  assert.equal(await tambahIcv(k, { ...nilai, 'No Dokumen ICV / e-ICV': 'E26-000002255', 'Nama': 'ANAK UJI' }), 'ok');
  const sumber = kunciSumberApp(k.id);
  assert.equal(sumber, 'app-' + k.id);
  // kolom spreadsheet_id klinik (ID Google Sheets) TIDAK diubah oleh input aplikasi
  assert.equal((await getDbClient().execute({ sql: 'SELECT spreadsheet_id FROM klinik_binaan WHERE id = ?', args: [k.id] })).rows[0].spreadsheet_id, null);
  const d = await daftarIcvTerbaru(sumber);
  assert.equal(d.total, 2);
  assert.deepEqual(d.baris.map((b) => b.noBaris), [2, 1]);
  assert.equal(d.baris[0].data['Nama'], 'ANAK UJI');
  assert.equal(d.baris[0].sumber, 'input');
  assert.equal((await daftarIcvTerbaru(sumber, { q: 'anak' })).total, 1);           // cari nama
  assert.equal((await daftarIcvTerbaru(sumber, { q: '6472036805750001' })).total, 2); // cari NIK
  assert.equal((await daftarIcvTerbaru(sumber, { q: '50%' })).total, 0);             // % bukan wildcard
  // dashboard yang sudah ada membaca baris ini lewat getDatasetKlinik() tanpa diubah
  const ds = (await getDatasetKlinik()).find((x) => x.klinik.nama_klinik === KLINIK_A)!;
  assert.equal(ds.icv.length, 2);
  assert.equal(ds.icv.find((r) => r['Nama'] === 'ANAK UJI')?.['Tanggal Terbit'], '02/01/2026');
  assert.equal(await hapusBarisIcv(sumber, d.baris[0].id), 1);
  assert.equal((await daftarIcvTerbaru(sumber)).total, 1);
});

test('unggah Excel: pratinjau->simpan, nomor lama dilewati, klinik lain terpisah, batalkan batch', async () => {
  await siapkan();
  const semua = await daftarKlinikDiizinkan(PENGGUNA('admin'));
  const kA = semua.find((x) => x.nama_klinik === KLINIK_A)!;
  const kB = semua.find((x) => x.nama_klinik === KLINIK_B)!;
  const r = (id: string, nama: string) => baris({ ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': id, 'Nama': nama, 'Tanggal Terbit': '25/10/2026' });
  const h = await bacaExcelIcv(await xlsx([r('X-1', 'SATU'), r('X-2', 'DUA'), r('X-3', 'TIGA')]), { hariIni: HARI_INI });
  assert.equal(h.sah.length, 3);
  const brs = h.sah.map((s) => s.nilai);

  const s1 = await simpanUnggahanIcv({ klinik: kA, namaFile: 'a.xlsx', baris: brs, jumlahBaris: 3, jumlahDitolak: 0, pengguna: 'uji' });
  assert.deepEqual([s1.baru, s1.dilewati], [3, 0]);
  const sumberA = 'app-' + kA.id;
  assert.equal((await noDokumenSudahAda(sumberA, ['X-1', 'x-2', 'Z'])).size, 2);

  const s2 = await simpanUnggahanIcv({ klinik: kA, namaFile: 'a2.xlsx', baris: [...brs, ...[r('X-4', 'EMPAT')].map(() => h.sah[0].nilai).map((n) => ({ ...n, 'No Dokumen ICV / e-ICV': 'X-4', 'Nama': 'EMPAT' }))], jumlahBaris: 4, jumlahDitolak: 0, pengguna: 'uji' });
  assert.deepEqual([s2.baru, s2.dilewati], [1, 3], 'nomor yang sudah ada dilewati, tidak menimpa');
  assert.equal((await daftarIcvTerbaru(sumberA)).total, 4);

  // klinik B memakai nomor yang sama tanpa bentrok (kunci duplikat berlaku per klinik)
  const sB = await simpanUnggahanIcv({ klinik: kB, namaFile: 'b.xlsx', baris: brs, jumlahBaris: 3, jumlahDitolak: 0, pengguna: 'uji' });
  assert.equal(sB.baru, 3);
  assert.equal((await daftarIcvTerbaru('app-' + kB.id)).total, 3);
  assert.equal((await daftarIcvTerbaru(sumberA)).total, 4);

  // batalkan unggahan s2: hanya 1 baris barunya yang hilang; batch klinik lain tak bisa dibatalkan lewat klinik A
  assert.equal(await hapusBatchIcv(kA.id, sumberA, sB.batchId), 0);
  assert.equal(await hapusBatchIcv(kA.id, sumberA, s2.batchId), 1);
  assert.equal((await daftarIcvTerbaru(sumberA)).total, 3);
  assert.equal((await daftarIcvTerbaru('app-' + kB.id)).total, 3);
});

test('dataset dipersempit per klinik: hanya klinik diminta; kosong = tidak ada; baris Sheets dan baris aplikasi digabung tanpa ganda', async () => {
  await siapkan();
  const db = getDbClient();
  // klinik A punya Sheets sungguhan (SHEET-UJI) + baris dari aplikasi; klinik B tanpa Sheets
  await db.execute({ sql: 'UPDATE klinik_binaan SET spreadsheet_id = ? WHERE id = ?', args: ['SHEET-UJI-A', idA] });
  await db.execute({ sql: `INSERT INTO data_icv (spreadsheet_id, nama_klinik, no_baris, nik, no_dokumen, raw_json, sumber) VALUES (?, ?, 1, NULL, 'S-1', ?, 'sheet')`,
    args: ['SHEET-UJI-A', KLINIK_A, JSON.stringify({ 'Nama': 'DARI SHEETS', 'No Dokumen ICV / e-ICV': 'S-1' })] });
  try {
    const semua = await daftarKlinikDiizinkan(PENGGUNA('admin'));
    const kA = semua.find((x) => x.nama_klinik === KLINIK_A)!;
    const kB = semua.find((x) => x.nama_klinik === KLINIK_B)!;
    await tambahIcv(kA, validasiIcv(BARIS_CONTOH, { hariIni: HARI_INI }).nilai!);          // baris aplikasi klinik A
    await tambahIcv(kB, validasiIcv({ ...BARIS_CONTOH, 'No Dokumen ICV / e-ICV': 'B-1', 'Nama': 'KLINIK B' }, { hariIni: HARI_INI }).nilai!);

    const hanyaA = await getDatasetKlinik({ klinikIds: [idA] });
    assert.deepEqual(hanyaA.map((d) => d.klinik.nama_klinik), [KLINIK_A]);
    assert.deepEqual(hanyaA[0].icv.map((r) => r['Nama']).sort(), ['DARI SHEETS', 'DEWI UJI KINDI']);   // Sheets + aplikasi, masing-masing sekali

    assert.deepEqual((await getDatasetKlinik({ klinikIds: [] })).map((d) => d.klinik.nama_klinik), []); // petugas_klinik tanpa tautan
    const gabungan = await getDatasetKlinik({ klinikIds: [idA, idB] });
    assert.equal(gabungan.find((d) => d.klinik.nama_klinik === KLINIK_B)!.icv.length, 1);
    assert.equal(gabungan.find((d) => d.klinik.nama_klinik === KLINIK_B)!.icv[0]['Nama'], 'KLINIK B');

    // klinik yang spreadsheet_id-nya sama dengan kunci aplikasi tidak menghitung baris dua kali
    await db.execute({ sql: 'UPDATE klinik_binaan SET spreadsheet_id = ? WHERE id = ?', args: ['app-' + idB, idB] });
    assert.equal((await getDatasetKlinik({ klinikIds: [idB] }))[0].icv.length, 1);

    // stok: daftar klinik kosong = tidak ada ringkasan
    assert.deepEqual((await getDatasetStokVaksin({ klinikIds: [] })).ringkasan, []);
  } finally {
    await db.execute({ sql: 'DELETE FROM data_icv WHERE spreadsheet_id = ?', args: ['SHEET-UJI-A'] });
  }
});
