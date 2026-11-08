// Uji TANPA database: wilayah yang ikut seri/laporan surveilans = aktif dan bukan kantor induk,
// termasuk wilayah baru (WK10+) yang dulu terbuang oleh perbandingan `kode <= "WK07"`.
//   npx tsx --test scripts/migrate/uji-wilker-surveilans.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { wilkerSurveilans } from '../../lib/wilayah-kerja/surveilans';

const baris = [
  { kode: 'INDUK', jenis: 'Kantor', aktif: false },
  { kode: 'WK01', jenis: 'Pelabuhan', aktif: true },
  { kode: 'WK07', jenis: 'Bandara', aktif: true },
  { kode: 'WK08', jenis: 'Bandara', aktif: false }, // bandara privat: dinonaktifkan
  { kode: 'WK10', jenis: 'Pelabuhan', aktif: true }, // wilayah baru dari pengaturan
  { kode: 'WK11', jenis: 'Pelabuhan' }, // kolom aktif belum ada (migrasi belum dijalankan): dianggap aktif
];

test('wilayah aktif non-kantor ikut, termasuk wilayah baru', () => {
  assert.deepEqual(baris.filter(wilkerSurveilans).map((w) => w.kode), ['WK01', 'WK07', 'WK10', 'WK11']);
});

test('kantor induk dan wilayah nonaktif tidak ikut', () => {
  assert.equal(wilkerSurveilans({ jenis: 'Kantor', aktif: true }), false);
  assert.equal(wilkerSurveilans({ jenis: 'Pelabuhan', aktif: false }), false);
});
