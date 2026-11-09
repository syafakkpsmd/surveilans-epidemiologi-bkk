// Uji TANPA database: rekap klinik binaan per wilayah kerja.
//   npx tsx --test scripts/migrate/uji-rekap-klinik-wilayah.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { rekapKlinikPerWilayah } from '../../lib/klinik/rekapWilayah';

const wilayah = [{ kode: 'WK01', nama: 'Pelabuhan Samarinda' }, { kode: 'WK02', nama: 'Pelabuhan Tanjung Santan' }, { kode: 'WK10', nama: 'Pelabuhan Baru' }];
const klinik = [
  { id: 'a', nama_klinik: 'Klinik A', kode_wilker: 'WK01' },
  { id: 'b', nama_klinik: 'Klinik B', kode_wilker: 'WK01' },
  { id: 'c', nama_klinik: 'Klinik C', kode_wilker: 'WK02' },
  { id: 'd', nama_klinik: 'Klinik D', kode_wilker: null },
  { id: 'e', nama_klinik: 'Klinik E', kode_wilker: 'WK99' }, // kode tak dikenal -> dianggap belum dikaitkan
];
const layanan = new Map([['a', 10], ['b', 5], ['c', 7], ['d', 3]]);
const status = new Map<string, string | null>([['a', 'memenuhi_syarat'], ['b', 'perlu_perbaikan'], ['c', 'tidak_memenuhi_syarat'], ['d', null]]);

test('rekap per wilayah: jumlah klinik, layanan ICV, status pengawasan', () => {
  const { baris, total } = rekapKlinikPerWilayah({ klinik, wilayah, layananPerKlinik: layanan, statusTerbaru: status });
  const wk01 = baris.find((b) => b.kode === 'WK01')!;
  assert.equal(wk01.jumlahKlinik, 2);
  assert.equal(wk01.totalLayananIcv, 15);
  assert.equal(wk01.sudahDiawasi, 2);
  assert.equal(wk01.memenuhi, 1);
  assert.equal(wk01.perluPerbaikan, 1);
  assert.equal(wk01.persenMemenuhi, 50);
  assert.deepEqual(wk01.namaKlinik, ['Klinik A', 'Klinik B']);
  assert.equal(baris.find((b) => b.kode === 'WK02')!.tidakMemenuhi, 1);
  assert.equal(total.jumlahKlinik, 5);
  assert.equal(total.totalLayananIcv, 25);
});

test('wilayah tanpa klinik tetap tampil dengan angka 0; persen kosong bila belum ada pengawasan', () => {
  const { baris } = rekapKlinikPerWilayah({ klinik, wilayah, layananPerKlinik: layanan, statusTerbaru: status });
  const baru = baris.find((b) => b.kode === 'WK10')!;
  assert.equal(baru.jumlahKlinik, 0);
  assert.equal(baru.persenMemenuhi, null);
});

test('klinik tanpa kode atau berkode asing masuk baris "belum dikaitkan"; baris itu disembunyikan bila kosong', () => {
  const { baris } = rekapKlinikPerWilayah({ klinik, wilayah, layananPerKlinik: layanan, statusTerbaru: status });
  const tanpa = baris.find((b) => b.kode === null)!;
  assert.equal(tanpa.jumlahKlinik, 2);
  assert.equal(tanpa.belumDiawasi, 2); // D (status kosong) dan E (tak ada status)
  const semuaTerkait = rekapKlinikPerWilayah({ klinik: klinik.slice(0, 3), wilayah, layananPerKlinik: layanan, statusTerbaru: status });
  assert.ok(!semuaTerkait.baris.some((b) => b.kode === null));
});
