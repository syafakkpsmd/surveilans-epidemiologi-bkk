// Uji TANPA database: pemeta nama wilayah (status laporan Lalu Lintas Orang) dan aturan unit pelapor SKDR
// berbasis daftar wilayah, menggantikan pola/regex dan aturan "Palaran + Sidomulyo" yang dulu tertulis di kode.
//   npx tsx --test scripts/migrate/uji-skdr-pemeta.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buatPemetaWilker } from '../../lib/status-laporan/lalu-lintas-orang';
import type { Wilayah } from '../../lib/wilayah-kerja';
import { WILAYAH_KERJA } from './fixtures-wilker';

const P = buatPemetaWilker(WILAYAH_KERJA);

test('penulisan lama (bebas) tetap dipetakan ke kode yang sama dengan pola regex lama', () => {
  const harap: Record<string, string> = {
    'Samarinda': 'WK01', 'Pelabuhan Samarinda': 'WK01', 'APT_Pranoto': 'WK07', 'Bandara APT Pranoto': 'WK07', 'Pranoto': 'WK07',
    'Tanjung Santan': 'WK02', 'TanjungSantan': 'WK02', 'Pelabuhan Laut Tanjung Santan': 'WK02', 'Tanjung Laut': 'WK03',
    'Pelabuhan Tanjung Laut': 'WK03', 'Lhok Tuan': 'WK04', 'Lhoktuan': 'WK04', 'Sangatta': 'WK05', 'Pelabuhan Laut Sangatta': 'WK05',
    'Sangkulirang': 'WK06', 'Pelabuhan Laut Sangkulirang': 'WK06',
  };
  for (const [teks, kode] of Object.entries(harap)) assert.equal(P.petakanKeKode(teks), kode, teks);
  assert.equal(P.petakanKeKode('Entah Dimana'), null);
  assert.equal(P.petakanKeKode(null), null);
});

test('teks memuat dua wilayah: nama terpanjang menang (APT Pranoto lebih khas dari Samarinda)', () => {
  assert.equal(P.petakanKeKode('Bandara APT Pranoto Samarinda'), 'WK07');
});

test('SKDR: wilayah dengan unit pelapor baru "Sudah" bila SEMUA unit melapor', () => {
  assert.deepEqual([...P.kumpulkanKodeSkdr(['Puskesmas Palaran Samarinda'])], []);
  assert.deepEqual([...P.kumpulkanKodeSkdr(['Puskesmas Sidomulyo Samarinda'])], []);
  assert.deepEqual([...P.kumpulkanKodeSkdr(['Palaran Samarinda', 'Sidomulyo Samarinda'])], ['WK01']);
});

test('SKDR: wilayah tanpa unit cukup satu baris; dicampur dengan wilayah ber-unit', () => {
  const k = P.kumpulkanKodeSkdr(['Sangatta', 'Palaran Samarinda', 'Tanjung Santan']);
  assert.deepEqual([...k].sort(), ['WK02', 'WK05']); // Samarinda belum lengkap
});

test('wilayah baru dengan unit SKDR sendiri ikut tanpa mengubah kode', () => {
  const baru: Wilayah = { ...WILAYAH_KERJA[1], kode: 'WK08', nama: 'Pelabuhan Balikpapan', namaPendek: 'Balikpapan', namaPeta: 'Balikpapan', urutan: 8, unitSkdr: ['Kariangau', 'Margasari'] };
  const p = buatPemetaWilker([...WILAYAH_KERJA, baru]);
  assert.equal(p.petakanKeKode('Pelabuhan Balikpapan'), 'WK08');
  assert.deepEqual([...p.kumpulkanKodeSkdr(['Kariangau Balikpapan'])], []);
  assert.deepEqual([...p.kumpulkanKodeSkdr(['Kariangau Balikpapan', 'Margasari Balikpapan'])], ['WK08']);
});

test('kantor induk tidak pernah dipetakan', () => {
  const induk: Wilayah = { ...WILAYAH_KERJA[0], kode: 'INDUK', nama: 'Kantor BKK Kelas I Samarinda', namaPendek: 'BKK Samarinda', jenis: 'Kantor', urutan: 0, unitSkdr: [] };
  const p = buatPemetaWilker([induk, ...WILAYAH_KERJA]);
  assert.equal(p.petakanKeKode('Kantor BKK Kelas I Samarinda'), 'WK01'); // dipetakan ke wilayah, bukan ke INDUK
});
