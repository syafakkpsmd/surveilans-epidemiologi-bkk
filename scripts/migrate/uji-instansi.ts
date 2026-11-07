// Uji TANPA database: identitas instansi mengikuti variabel lingkungan (BKK lain tanpa ubah kode).
//   npx tsx --test scripts/migrate/uji-instansi.ts
import test from 'node:test';
import assert from 'node:assert/strict';

// Modul dievaluasi ulang tiap pemanggilan (cache require dibuang) supaya variabel lingkungan baru terbaca.
type Instansi = typeof import('../../lib/konfigurasi/instansi');
function muat(): Instansi {
  const alamat = require.resolve('../../lib/konfigurasi/instansi');
  delete require.cache[alamat];
  return require(alamat) as Instansi;
}

test('bawaan = BKK Kelas I Samarinda', () => {
  delete process.env.NEXT_PUBLIC_NAMA_BKK; delete process.env.NAMA_BKK;
  const m = muat();
  assert.equal(m.NAMA_BKK, 'BKK Kelas I Samarinda');
  assert.equal(m.NAMA_BKK_SINGKAT, 'BKK Samarinda');
  assert.equal(m.NAMA_RESMI_BKK, 'Balai Kekarantinaan Kesehatan Kelas I Samarinda');
  assert.equal(m.NAMA_KOTA_BKK, 'Samarinda');
  assert.equal(m.NAMA_BKK_TANPA_AWALAN, 'Kelas I Samarinda');
  assert.equal(m.NAMA_RESMI_BKK_KURUNG, 'Balai Kekarantinaan Kesehatan (BKK) Kelas I Samarinda');
  assert.equal(m.NAMA_PROVINSI_BKK, 'Kalimantan Timur');
});

test('BKK lain: semua turunan mengikuti satu variabel', () => {
  process.env.NEXT_PUBLIC_NAMA_BKK = 'BKK Kelas II Balikpapan';
  process.env.NEXT_PUBLIC_NAMA_PROVINSI_BKK = 'Kalimantan Timur';
  const m = muat();
  assert.equal(m.NAMA_BKK, 'BKK Kelas II Balikpapan');
  assert.equal(m.NAMA_BKK_SINGKAT, 'BKK Balikpapan');
  assert.equal(m.NAMA_RESMI_BKK, 'Balai Kekarantinaan Kesehatan Kelas II Balikpapan');
  assert.equal(m.NAMA_KOTA_BKK, 'Balikpapan');
  assert.equal(m.NAMA_BKK_TANPA_AWALAN, 'Kelas II Balikpapan');
});

test('nilai kosong/spasi diabaikan, kembali ke bawaan', () => {
  process.env.NEXT_PUBLIC_NAMA_BKK = '   ';
  const m = muat();
  assert.equal(m.NAMA_BKK, 'BKK Kelas I Samarinda');
});
