// scripts/migrate/uji-izin-jenazah.ts
// Uji modul Izin Jenazah (ekspor Sinkarkes "Rekap Surat Izin Jenazah"). Murni: tanpa database, data TIRUAN.
// Berkas uji meniru bentuk ekspor Sinkarkes: judul laporan bergabung sel, blok ringkasan, baris judul kolom di baris 11
// (judul berspasi depan, kolom "No"), format sel sampai baris 65536, dan nama KKP berkode dalam kurung.
//
//   npx tsx --test scripts/migrate/uji-izin-jenazah.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { MODUL, kunciJudul } from '@/lib/input-data/modul';
import { bacaExcel } from '@/lib/input-data/parse-excel';
import { buatKamus, type Wilayah } from '@/lib/wilayah-kerja';

const M = MODUL.izin_jenazah;

// ---- Cuplikan skema schema/postgres/izin_jenazah.sql ----
type Kol = { t: 'date' | 'varchar' | 'text'; len?: number };
const v = (len: number): Kol => ({ t: 'varchar', len });
const SKEMA: Record<string, Kol> = {
  wilayah_kerja: v(100), no_surat: v(100), izin_angkut: v(50), tanggal_diterbitkan: { t: 'date' }, diterbitkan_di: v(255),
  nama_penerbit: v(255), pemeriksa: v(255), nama: v(255), tanggal_lahir: { t: 'date' }, jenis_kelamin: v(20), kebangsaan: v(100),
  alamat: { t: 'text' }, provinsi: v(100), sebab_kematian: { t: 'text' }, diangkut_tiba: v(50), nama_keluarga_tujuan: v(255),
  no_telp: v(50), kkp_tempat: v(255), maskapai_pelayaran: v(255), bandara_pelabuhan: v(255),
};

test('modul terdaftar dan cocok dengan skema tabel izin_jenazah', () => {
  assert.ok(M, 'modul izin_jenazah terdaftar di MODUL');
  assert.equal(M.tabel, 'izin_jenazah');
  const nama = new Set(M.kolom.map((k) => k.nama));
  assert.equal(nama.size, M.kolom.length, 'nama kolom tidak ganda');
  for (const k of M.kolom) {
    const d = SKEMA[k.nama];
    assert.ok(d, `${k.nama}: tidak ada di tabel`);
    if (k.tipe === 'wilker' || k.tipe === 'teks') {
      assert.ok(d.t === 'varchar' || d.t === 'text', `${k.nama}: tipe teks vs ${d.t}`);
      if (d.t === 'varchar') assert.ok((k.tipe === 'wilker' ? 100 : (k.maks ?? 255)) <= d.len!, `${k.nama}: maks melebihi varchar(${d.len})`);
    } else if (k.tipe === 'tanggal') assert.equal(d.t, 'date', `${k.nama}: tanggal harus kolom date`);
    else assert.fail(`${k.nama}: tipe ${k.tipe} tidak dipakai modul ini`);
  }
  for (const c of Object.keys(SKEMA)) assert.ok(nama.has(c), `kolom tabel ${c} belum ada di modul`);
  for (const c of [M.kolomTanggal, M.kolomWilayah, M.kolomKunci, ...M.kolomDaftar]) assert.ok(nama.has(c), `kolom ${c} tidak ada`);
  assert.ok(M.kolom.find((k) => k.nama === 'no_surat')?.tanpaSpasi);
  assert.ok(M.kolom.find((k) => k.nama === 'tanggal_lahir')?.tanggalLahir);
});

test('judul kolom ekspor Sinkarkes (21 kolom) semuanya dikenali; "No" diabaikan', () => {
  const peta = new Map<string, string>();
  for (const k of M.kolom) for (const j of [k.label, k.nama, ...(k.alias ?? [])]) {
    const kj = kunciJudul(j);
    assert.ok(!peta.has(kj) || peta.get(kj) === k.nama, `judul "${j}" bentrok`);
    peta.set(kj, k.nama);
  }
  const judulSinkarkes = ['Nama KKP', 'No Surat', 'Izin Angkut', 'Nama', 'Tgl Lahir', ' Jenis Kelamin', 'Kebangsaan', 'Alamat', 'Sebab Kematian',
    'Diangkut/Tiba', 'Provinsi', 'Nama Keluarga Tujuan', 'No. Telp', 'KKP Tempat', 'Menggunakan Maskapai/Pelayaran', 'Bandara/Pelabuhan',
    'Tanggal Diterbitkan', 'Diterbitkan Di', 'Nama Penerbit', 'Pemeriksa'];
  for (const j of judulSinkarkes) assert.ok(peta.has(kunciJudul(j)), `judul Sinkarkes "${j}" tidak dikenali`);
  assert.ok(!peta.has('no'));
});

// ---- Berkas bentuk Sinkarkes ----
const wil = (kode: string, nama: string, jenis: Wilayah['jenis'], urutan: number): Wilayah => ({
  kode, nama: `${jenis} ${nama}`, namaPendek: nama, namaPeta: nama, jenis, urutan, aktif: true,
  lat: null, lng: null, petaLat: null, petaLng: null, zoom: 13, subLokasi: [], warna: null, catatan: null, alias: [],
  unitSkdr: [],
});
const kamus = buatKamus([wil('WK01', 'Samarinda', 'Pelabuhan', 1), wil('WK02', 'APT Pranoto', 'Bandara', 2), wil('WK03', 'Tanjung Santan', 'Pelabuhan', 3)]);
const serial = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);

const JUDUL = ['No', 'Nama KKP', 'No Surat', 'Izin Angkut', 'Nama', 'Tgl Lahir', ' Jenis Kelamin', 'Kebangsaan', 'Alamat', 'Sebab Kematian',
  'Diangkut/Tiba', 'Provinsi', 'Nama Keluarga Tujuan', 'No. Telp', 'KKP Tempat', 'Menggunakan Maskapai/Pelayaran', 'Bandara/Pelabuhan',
  'Tanggal Diterbitkan', 'Diterbitkan Di', 'Nama Penerbit', 'Pemeriksa'];

function baris(kkp: string, noSurat: string, tglLahir: unknown, tglTerbit: unknown, nama = 'Jenazah Uji'): unknown[] {
  return [null, kkp, noSurat, 'Jenazah', nama, tglLahir, 'Perempuan', 'INDONESIA', 'Jl. Contoh No. 1', 'Sakit', 'Diangkut Ke', 'Kalimantan Timur',
    'Keluarga Uji', '0812000000', 'BANDARA CONTOH', 'IU 641', 'Bandar Udara APT. PRANOTO, SAMARINDA', tglTerbit, 'Kota Samarinda', 'Penerbit Uji', 'Pemeriksa Uji'];
}

async function bangun(data: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Detail');
  ['Rekap Surat Izin Jenazah Di Balai Karkes', 'Balai Karkes : Samarinda', 'Balai Karkes Tempat : Semua', 'Periode : 01-09-2026 - 10-11-2026']
    .forEach((t, i) => { ws.getCell(i + 1, 1).value = t; ws.mergeCells(i + 1, 1, i + 1, 21); });
  ws.getCell(5, 2).value = 'Total Data'; ws.getCell(5, 3).value = data.length; ws.getCell(5, 5).value = 'Jumlah Data'; ws.getCell(5, 6).value = data.length;
  ws.getCell(6, 2).value = 'Jumlah Jenazah Laki - Laki'; ws.getCell(6, 3).value = 0;
  ws.getCell(7, 2).value = 'Jumlah Jenazah Perempuan'; ws.getCell(7, 3).value = data.length;
  JUDUL.forEach((j, i) => { ws.getCell(11, i + 1).value = j; });
  data.forEach((b, r) => b.forEach((x, c) => { if (x !== null && x !== undefined) ws.getCell(12 + r, c + 1).value = x as ExcelJS.CellValue; }));
  data.forEach((_, r) => { ws.getCell(12 + r, 1).value = r + 1; });                // kolom "No"
  ws.getRow(65536).height = 18;                                                       // format sampai baris 65536 seperti ekspor Sinkarkes
  const rs = wb.addWorksheet('Ringkasan'); rs.getCell(1, 1).value = 'Rekap Surat Izin Jenazah Di Balai Karkes';
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('ekspor Sinkarkes apa adanya: judul laporan, ringkasan, baris No, format 65536 baris, berbagai model tanggal', async () => {
  const buf = await bangun([
    baris('Bandara APT Pranoto (AAP)',  'SR.02.06/C.X.10.9/ 5026  /2026', '2003-04-05',        '2026-09-06'),
    baris('Pelabuhan Samarinda (SRI)',  'SR.02.06/C.X.10.9/5702/2026',    '05/04/1932',         '8 Oktober 2026', 'Jenazah Uji 2'),
    baris('Bandara APT Pranoto (AAP)',  'SR.02.06/C.X.10.9/5703/2026',    serial(1980, 1, 31),  new Date(Date.UTC(2026, 9, 9)), 'Jenazah Uji 3'),
    baris('Tanjung Santan',             'SR.02.06/C.X.10.9/5704/2026',    '31 Januari 1980',    '2026-10-25T08:30:00Z', 'Jenazah Uji 4'),
    baris('KKP Antah Berantah (XXX)',   'SR.02.06/C.X.10.9/5705/2026',    '1980-01-31',         '2026-10-10', 'Jenazah Uji 5'),
    baris('bandara apt pranoto',        'SR.02.06/C.X.10.9/5026/2026',    '2003-04-05',         '06/09/2026', 'Jenazah Uji 6'),       // nomor sama dengan baris 1
  ]);
  const t0 = Date.now();
  const h = await bacaExcel(buf, M, 2026, kamus);
  assert.ok(Date.now() - t0 < 15000, `pembacaan terlalu lama: ${Date.now() - t0} ms`);

  assert.equal(h.fatal, null);
  assert.equal(h.jumlahBaris, 6, 'hanya baris data yang dihitung (judul laporan dan ringkasan tidak)');
  assert.deepEqual(h.kolomDiabaikan, []);
  assert.equal(h.sah.length, 4);
  assert.deepEqual(h.sah.map((s) => s.nilai.wilayah_kerja), ['APT Pranoto', 'Samarinda', 'APT Pranoto', 'Tanjung Santan']);
  assert.deepEqual(h.sah.map((s) => s.nilai.no_surat), ['SR.02.06/C.X.10.9/5026/2026', 'SR.02.06/C.X.10.9/5702/2026', 'SR.02.06/C.X.10.9/5703/2026', 'SR.02.06/C.X.10.9/5704/2026']);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_diterbitkan), ['2026-09-06', '2026-10-08', '2026-10-09', '2026-10-25']);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal_lahir), ['2003-04-05', '1932-04-05', '1980-01-31', '1980-01-31']);
  assert.equal(h.sah[0].nilai.no_telp, '0812000000');
  assert.equal(h.sah[0].nilai.izin_angkut, 'Jenazah');

  assert.equal(h.galat.length, 2);
  assert.match(h.galat.map((g) => g.pesan.join(' ')).join(' | '), /wilayah kerja/i);   // KKP tidak dikenal
  assert.match(h.galat.map((g) => g.pesan.join(' ')).join(' | '), /nomor surat/);      // duplikat di berkas
});

test('nomor surat yang sama beda spasi/huruf besar dikenali sebagai satu surat saat unggah ulang', async () => {
  const a = await bacaExcel(await bangun([baris('Bandara APT Pranoto (AAP)', 'SR.02.06/C.X.10.9/ 5026  /2026', '2003-04-05', '2026-09-06')]), M, 2026, kamus);
  const b = await bacaExcel(await bangun([baris('Bandara APT Pranoto (AAP)', 'sr.02.06/c.x.10.9/5026/2026',    '2003-04-05', '2026-09-06')]), M, 2026, kamus);
  assert.equal(a.sah[0].nilai.no_surat, 'SR.02.06/C.X.10.9/5026/2026');
  assert.equal(String(b.sah[0].nilai.no_surat).toLowerCase(), String(a.sah[0].nilai.no_surat).toLowerCase());
});
