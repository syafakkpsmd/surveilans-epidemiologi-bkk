// scripts/migrate/uji-tanggal-input.ts
// Uji pembacaan BERBAGAI MODEL TANGGAL pada unggahan Excel dan form, termasuk TANGGAL LAHIR (tahun sebelum 2000).
// Murni: tanpa database. Membuat berkas .xlsx di memori lalu memanggil bacaExcel() persis seperti route unggah.
//
//   npx tsx --test scripts/migrate/uji-tanggal-input.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { bacaExcel } from '@/lib/input-data/parse-excel';
import { validasiBaris } from '@/lib/input-data/validasi';
import type { ModulInput } from '@/lib/input-data/modul';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';

const wil = (kode: string, nama: string, jenis: Wilayah['jenis'], urutan: number): Wilayah => ({
  kode, nama: `${jenis} ${nama}`, namaPendek: nama, namaPeta: nama, jenis, urutan, aktif: true,
  lat: null, lng: null, petaLat: null, petaLng: null, zoom: 13, subLokasi: [], warna: null, catatan: null, alias: [],
});
const kamus = buatKamus([wil('WK01', 'Samarinda', 'Pelabuhan', 1), wil('WK02', 'APT Pranoto', 'Bandara', 2)]);

// Modul contoh berbentuk HIV: satu kolom tanggal kegiatan (menentukan tahun) dan satu kolom tanggal lahir.
const MODUL: ModulInput = {
  kunci: 'uji', label: 'Uji', tabel: 'uji', kolomTanggal: 'tanggal_kegiatan', kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'tanggal_lahir', kolomKunciTambahan: ['sex'], namaKunci: 'tanggal lahir',
  jenisWilayahBoleh: ['Pelabuhan', 'Bandara'], peranBoleh: ['admin'], pakaiParseTanggal: true, wilayahDenganSpasi: true,
  kolomDaftar: ['tanggal_kegiatan', 'wilayah_kerja'],
  kolom: [
    { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true },
    { nama: 'tanggal_kegiatan', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true, alias: ['Tanggal'] },
    { nama: 'sex', label: 'Jenis Kelamin', tipe: 'teks' },
    { nama: 'tanggal_lahir', label: 'Tanggal Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tgl Lahir'] },
    { nama: 'hasil', label: 'Hasil', tipe: 'teks' },
  ],
};

const serial = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
const tglSel = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)); // sel tanggal Excel = 00:00 UTC

async function baca(baris: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.addRow(['Wilayah Kerja', 'Tanggal Kegiatan', 'Jenis Kelamin', 'Tanggal Lahir', 'Hasil']);
  for (const b of baris) ws.addRow(b);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return bacaExcel(buf, MODUL, 2026, kamus);
}
const isoDari = (h: Awaited<ReturnType<typeof baca>>, kolom: string) => h.sah.map((s) => s.nilai[kolom]);

test('tanggal kegiatan: semua gaya penulisan terbaca sebagai 2026-03-25', async () => {
  const gaya: unknown[] = [
    '2026-03-25', '25/03/2026', '25-03-2026', '25.03.2026', '25/03/26',
    '25 Maret 2026', '25-Mar-2026', 'Mar 25, 2026', 'Rabu, 25 Mar 2026', '25-III-2026',
    20260325, serial(2026, 3, 25), tglSel(2026, 3, 25),
    '2026-03-25T08:30:00Z', '25/03/2026 08.30 WITA', '25/03/2569',
  ];
  // tanggal lahir dibuat berbeda tiap baris agar tidak dianggap duplikat di dalam berkas
  const h = await baca(gaya.map((g, i) => ['Samarinda', g, 'L', `1990-01-${String(i + 1).padStart(2, '0')}`, 'Non Reaktif']));
  assert.equal(h.fatal, null);
  assert.deepEqual(h.galat, []);
  assert.equal(h.sah.length, gaya.length);
  assert.deepEqual(isoDari(h, 'tanggal_kegiatan'), gaya.map(() => '2026-03-25'));
});

test('angka ambigu 05/03/2026 dibaca hari/bulan dan DITANDAI; bukti di kolom yang sama menghapus tanda', async () => {
  const sendiri = await baca([['Samarinda', '05/03/2026', 'L', '1990-01-01', 'Reaktif']]);
  assert.equal(sendiri.sah[0].nilai.tanggal_kegiatan, '2026-03-05');
  assert.equal(sendiri.peringatan.length, 1);

  const denganBukti = await baca([
    ['Samarinda', '05/03/2026', 'L', '1990-01-01', 'Reaktif'],
    ['Samarinda', '25/03/2026', 'L', '1990-01-02', 'Reaktif'],
  ]);
  assert.deepEqual(isoDari(denganBukti, 'tanggal_kegiatan'), ['2026-03-05', '2026-03-25']);
  assert.equal(denganBukti.peringatan.length, 0);

  const gayaAs = await baca([
    ['Samarinda', '05/03/2026', 'L', '1990-01-01', 'Reaktif'],
    ['Samarinda', '03/25/2026', 'L', '1990-01-02', 'Reaktif'],
  ]);
  assert.deepEqual(isoDari(gayaAs, 'tanggal_kegiatan'), ['2026-05-03', '2026-03-25']); // kolom bergaya bulan/hari
  assert.equal(gayaAs.peringatan.length, 0);

  const campur = await baca([
    ['Samarinda', '25/03/2026', 'L', '1990-01-01', 'Reaktif'],
    ['Samarinda', '03/25/2026', 'L', '1990-01-02', 'Reaktif'],
  ]);
  assert.ok(campur.peringatanUmum.length > 0);
});

test('TANGGAL LAHIR sebelum tahun 2000 terbaca dari semua gaya', async () => {
  const gaya: unknown[] = [
    '04/03/1985', '1985-03-04', '4 Maret 1985', '04-Mar-1985', 'Mar 4, 1985', '04/03/85',
    19850304, serial(1985, 3, 4), tglSel(1985, 3, 4), '04.03.1985',
  ];
  const h = await baca(gaya.map((g, i) => ['Samarinda', `2026-03-${String(i + 1).padStart(2, '0')}`, 'P', g, 'Non Reaktif']));
  assert.equal(h.fatal, null);
  assert.deepEqual(h.galat, []);
  assert.deepEqual(isoDari(h, 'tanggal_lahir'), gaya.map(() => '1985-03-04'));
});

test('tahun 2 digit pada tanggal lahir: 05 = 2005, 85 = 1985', async () => {
  const h = await baca([
    ['Samarinda', '2026-03-01', 'L', '15/08/05', 'Reaktif'],
    ['Samarinda', '2026-03-02', 'L', '15/08/85', 'Reaktif'],
  ]);
  assert.deepEqual(isoDari(h, 'tanggal_lahir'), ['2005-08-15', '1985-08-15']);
});

test('tanggal lahir tidak masuk akal ditolak: terlalu lama, masa depan, bukan tanggal', async () => {
  const h = await baca([
    ['Samarinda', '2026-03-01', 'L', '01/01/1919', 'Reaktif'],
    ['Samarinda', '2026-03-02', 'L', '2099-01-01', 'Reaktif'],
    ['Samarinda', '2026-03-03', 'L', '85', 'Reaktif'],
    ['Samarinda', '2026-03-04', 'L', 'kemarin', 'Reaktif'],
    ['Samarinda', '2026-03-05', 'L', '01/01/1930', 'Reaktif'], // sah
  ]);
  assert.equal(h.sah.length, 1);
  assert.equal(h.galat.length, 4);
  assert.equal(h.sah[0].nilai.tanggal_lahir, '1930-01-01');
});

test('kolom tanggal biasa (bukan tanggal lahir) tetap menolak tahun di luar 2000..tahun depan', async () => {
  const h = await baca([['Samarinda', '04/03/1985', 'L', '1990-01-01', 'Reaktif']]);
  assert.equal(h.sah.length, 0);
  assert.equal(h.galat.length, 1);
});

test('form: tanggal lahir ISO 1985-03-04 sah; 1850 dan masa depan ditolak dengan pesan tahun', () => {
  const dasar = { wilayah_kerja: 'Samarinda', tanggal_kegiatan: '2026-03-25', sex: 'L', hasil: 'Reaktif' };
  const ok = validasiBaris(MODUL, { ...dasar, tanggal_lahir: '1985-03-04' }, kamus);
  assert.equal(ok.galat.length, 0);
  assert.equal(ok.nilai?.tanggal_lahir, '1985-03-04');

  const lama = validasiBaris(MODUL, { ...dasar, tanggal_lahir: '1850-01-01' }, kamus);
  assert.match(lama.galat.join(' '), /tahun 1850/);
  const depan = validasiBaris(MODUL, { ...dasar, tanggal_lahir: '2999-01-01' }, kamus);
  assert.match(depan.galat.join(' '), /tahun 2999/);
});
