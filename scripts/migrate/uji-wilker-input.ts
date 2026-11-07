// Uji TANPA database: validasi wilayah kerja pada pipeline input data (Excel/form) mengikuti kamus yang diberikan,
// bukan daftar tertulis di kode. Inilah yang membuat BKK lain bisa menambah wilayah dari dashboard pengaturan.
//   npx tsx --test scripts/migrate/uji-wilker-input.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODUL, wilayahBolehModul } from '../../lib/input-data/modul';
import { validasiBaris } from '../../lib/input-data/validasi';
import { ubahWilker } from '../../lib/input-data/nilai';
import { buatKamus, type Wilayah } from '../../lib/wilayah-kerja';
import { WILAYAH_KERJA } from './fixtures-wilker';

const cop = MODUL.cop;
const pesawatModul = MODUL.sscec; // modul yang menerima pelabuhan dan bandara
const baris = (wilayah: string) => ({ wilayah_kerja: wilayah, nama_kapal: 'KM A', tgl_kedatangan: '2026-03-01', jml_abk_wni: '5', rba: 'hijau' });

const wilayahBaru = (o: Partial<Wilayah>): Wilayah => ({
  kode: 'WK08', nama: 'Pelabuhan Balikpapan', namaPendek: 'Balikpapan', namaPeta: 'Balikpapan', jenis: 'Pelabuhan',
  urutan: 8, aktif: true, lat: -1.26, lng: 116.82, petaLat: null, petaLng: null, zoom: 13, subLokasi: [], warna: null, catatan: null, alias: [], ...o,
});

test('kamus bawaan: COP menerima pelabuhan, menolak bandara; modul lain menerima keduanya', () => {
  const k = buatKamus(WILAYAH_KERJA);
  assert.equal(wilayahBolehModul(cop, k).length, 6);
  assert.equal(wilayahBolehModul(pesawatModul, k).length, 7);
  assert.equal(validasiBaris(cop, baris('Tanjung_Santan'), k, 2026).nilai?.wilayah_kerja, 'TanjungSantan');
  assert.match(validasiBaris(cop, baris('APT Pranoto'), k, 2026).galat[0], /tidak berlaku/);
});

test('wilayah BARU dari pengaturan langsung diterima tanpa mengubah kode', () => {
  const k = buatKamus([...WILAYAH_KERJA, wilayahBaru({})]);
  const h = validasiBaris(cop, baris('Pelabuhan Balikpapan'), k, 2026);
  assert.equal(h.galat.length, 0);
  assert.equal(h.nilai?.wilayah_kerja, 'Balikpapan'); // nama pendek tanpa spasi, sama bentuknya dengan wilayah lama
  assert.equal(ubahWilker('Balikpapan', k).ok, true);
});

test('wilayah yang dinonaktifkan tidak menerima input baru, tetapi namanya tetap dikenali', () => {
  const k = buatKamus([wilayahBaru({ aktif: false }), wilayahBaru({ kode: 'WK09', nama: 'Pelabuhan Lain', namaPendek: 'Lain', namaPeta: 'Lain', urutan: 9 })]);
  assert.match(validasiBaris(cop, baris('Balikpapan'), k, 2026).galat[0], /tidak berlaku/);
  assert.deepEqual(ubahWilker('Balikpapan', k), { ok: true, nilai: 'WK08' });
  assert.equal(validasiBaris(cop, baris('Lain'), k, 2026).galat.length, 0);
});

test('bandara baru diterima modul campuran, ditolak modul kapal', () => {
  const k = buatKamus([wilayahBaru({ kode: 'WK10', nama: 'Bandara Sepinggan', namaPendek: 'Sepinggan', namaPeta: 'Bandara Sepinggan', jenis: 'Bandara' })]);
  assert.equal(wilayahBolehModul(pesawatModul, k).length, 1);
  assert.equal(wilayahBolehModul(cop, k).length, 0);
  assert.match(validasiBaris(cop, baris('Sepinggan'), k, 2026).galat[0], /tidak berlaku/);
});

test('teks tak dikenal ditolak, tidak ditebak', () => {
  const k = buatKamus(WILAYAH_KERJA);
  assert.equal(ubahWilker('Tg. Laut', k).ok, false);
  assert.equal(ubahWilker('Entah Dimana', k).ok, false);
});

// ---- pemilihan bandara pada input pesawat (lebih dari satu bandara didukung) ----
import { pilihKodeBandara } from '../../lib/db/modul/inputPesawat';

test('pilihKodeBandara: satu bandara otomatis, beberapa bandara wajib memilih yang sah', () => {
  const satu = [{ kode: 'WK07', nama: 'Bandara APT Pranoto' }];
  const dua = [...satu, { kode: 'WK10', nama: 'Bandara Sepinggan' }];
  assert.equal(pilihKodeBandara(satu), 'WK07');
  assert.equal(pilihKodeBandara(satu, 'WK07'), 'WK07');
  assert.equal(pilihKodeBandara(dua), null); // ambigu: harus memilih
  assert.equal(pilihKodeBandara(dua, 'WK10'), 'WK10');
  assert.equal(pilihKodeBandara(dua, 'WK01'), null); // bukan bandara aktif
  assert.equal(pilihKodeBandara([], 'WK07'), null);
});
