// Uji TANPA database: daftar wilayah kapal (COP/PHQC/alat angkut) diturunkan dari daftar wilayah kerja,
// termasuk ejaan lama PHQC ("Pelabuhan Laut Sangatta") dan wilayah baru dari pengaturan.
//   npx tsx --test scripts/migrate/uji-wilker-kapal.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Wilayah } from '../../lib/wilayah-kerja';
import { WILAYAH_KERJA } from './fixtures-wilker';
import { cariWilayahKapal, cocokWilayahKapal, daftarWilayahKapal } from '../../lib/wilayah-kerja/kapal';

const penuh = (w: Wilayah, alias: string[] = []): Wilayah => ({ ...w, alias });
// Alias seperti di wilker_nama_alias milik BKK Samarinda.
const ALIAS: Record<string, string[]> = {
  WK02: ['Pelabuhan Laut Tanjung Santan', 'TanjungSantan'], WK03: ['Pelabuhan Tanjung Laut', 'TanjungLaut'],
  WK04: ['Pelabuhan Lhoktuan', 'Pelabuhan Lhok Tuan'], WK05: ['Pelabuhan Laut Sangatta'], WK06: ['Pelabuhan Laut Sangkulirang'],
};
const DAFTAR = WILAYAH_KERJA.map((w) => penuh(w, ALIAS[w.kode] ?? []));

test('daftar wilayah kapal = 6 pelabuhan aktif berurut, kunci tanpa spasi (sama dengan nilai COP)', () => {
  const k = daftarWilayahKapal(DAFTAR);
  assert.deepEqual(k.map((w) => w.value), ['Samarinda', 'TanjungSantan', 'TanjungLaut', 'Lhoktuan', 'Sangatta', 'Sangkulirang']);
  assert.equal(daftarWilayahKapal(DAFTAR, ['Pelabuhan', 'Bandara']).length, 7);
});

test('ejaan PHQC lama tercakup dalam variants (menggantikan MAP_WILAYAH_DB_PHQC)', () => {
  const k = daftarWilayahKapal(DAFTAR);
  const lama: Record<string, string> = {
    Samarinda: 'Samarinda', TanjungLaut: 'Pelabuhan Tanjung Laut', Sangkulirang: 'Pelabuhan Laut Sangkulirang',
    Sangatta: 'Pelabuhan Laut Sangatta', Lhoktuan: 'Pelabuhan Lhoktuan', TanjungSantan: 'Pelabuhan Laut Tanjung Santan',
  };
  for (const [kunci, ejaan] of Object.entries(lama)) assert.ok(k.find((w) => w.value === kunci)!.variants.includes(ejaan), `${kunci} -> ${ejaan}`);
});

test('cocokWilayahKapal setara aturan lama alat angkut (sama persis atau memuat nama wilayahnya)', () => {
  const k = daftarWilayahKapal(DAFTAR);
  const w = (v: string) => k.find((x) => x.value === v)!;
  assert.ok(cocokWilayahKapal('Pelabuhan Laut Sangatta', w('Sangatta')));
  assert.ok(cocokWilayahKapal('tanjung santan', w('TanjungSantan')));
  assert.ok(cocokWilayahKapal('Pelabuhan Tanjung Laut', w('TanjungLaut')));
  assert.ok(!cocokWilayahKapal('Lhoktuan', w('Sangatta')));
  assert.ok(!cocokWilayahKapal(null, w('Sangatta')));
});

test('wilayah baru dari pengaturan otomatis ikut, termasuk ejaan "Pelabuhan Laut X"', () => {
  const baru = penuh({ ...WILAYAH_KERJA[0], kode: 'WK08', nama: 'Pelabuhan Balikpapan', namaPendek: 'Balikpapan', namaPeta: 'Balikpapan', urutan: 8 });
  const k = daftarWilayahKapal([...DAFTAR, baru]);
  assert.equal(k.length, 7);
  const b = k.find((w) => w.value === 'Balikpapan')!;
  assert.ok(b.variants.includes('Pelabuhan Laut Balikpapan'));
  assert.ok(cocokWilayahKapal('Pelabuhan Balikpapan', b));
  assert.equal(cariWilayahKapal('balik papan', k)?.kode, 'WK08');
  assert.equal(cariWilayahKapal('Tidak Ada', k), undefined);
});

test('wilayah nonaktif tidak masuk daftar', () => {
  const k = daftarWilayahKapal(DAFTAR.map((w) => (w.kode === 'WK06' ? { ...w, aktif: false } : w)));
  assert.equal(k.length, 5);
  assert.ok(!k.some((w) => w.kode === 'WK06'));
});
