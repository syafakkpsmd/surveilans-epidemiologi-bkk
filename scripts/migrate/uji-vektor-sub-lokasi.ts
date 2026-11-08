// Uji TANPA database: teks zona di prompt AI Anopheles mengikuti daftar sub-lokasi yang diberikan
// (modul "vektor_sub_lokasi"), tidak lagi terkunci ke WK01.
//   npx tsx --test scripts/migrate/uji-vektor-sub-lokasi.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptAnopheles } from '../../lib/ai/promptBuilders/anopheles';
import type { KonteksWilker } from '../../lib/ai/promptBuilders/dataFetchers';

const konteks = (kode: string, subLokasiVektor: string[]) =>
  ({ wilker: { kode, nama: `Wilayah ${kode}` }, musim: 'Musim Kemarau', subLokasiVektor }) as unknown as KonteksWilker;

test('wilayah dengan sub-lokasi: zona memuat daftar sub-lokasinya', () => {
  const p = buildPromptAnopheles(konteks('WK01', ['Pelabuhan Umum', 'TPK Palaran']), [], 'dewasa');
  assert.ok(p.includes('Perimeter/Buffer Pelabuhan Umum & TPK Palaran'));
});

test('wilayah tanpa modul: zona umum, tanpa menyebut sub-lokasi', () => {
  const p = buildPromptAnopheles(konteks('WK02', []), [], 'dewasa');
  assert.ok(p.includes('Perimeter, Buffer'));
  assert.ok(!p.includes('TPK Palaran'));
});

test('wilayah baru yang dicentang ikut tanpa mengubah kode', () => {
  const p = buildPromptAnopheles(konteks('WK10', ['Dermaga A', 'Dermaga B']), [], 'dewasa');
  assert.ok(p.includes('Perimeter/Buffer Dermaga A & Dermaga B'));
  assert.ok(!p.includes('TPK Palaran'));
});
