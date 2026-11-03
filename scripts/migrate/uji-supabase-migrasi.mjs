// Uji bagian murni skrip migrasi Supabase. Jalankan: node scripts/migrate/uji-supabase-migrasi.mjs
// (butuh `pg` terpasang; tidak butuh koneksi apa pun)
import test from 'node:test';
import assert from 'node:assert/strict';
import { ubahNilai, urutkanTabel, bangunInsert, galatAman, samaAngka, normalisasiSel } from './supabase-migrasi-lib.mjs';

const K = (o) => ({ nama: 'x', presisi: null, skala: null, panjang: null, ...o });

test('desimal: pecahan berlebih ditolak, nol di ujung dibuang, bulat berlebih ditolak', () => {
  const d = K({ tipe: 'decimal', presisi: 10, skala: 4 });
  assert.equal(ubahNilai('1.23450000', d).value, '1.2345');
  assert.ok(ubahNilai('1.23456789', d).error);
  assert.equal(ubahNilai('-0.5', d).value, '-0.5');
  assert.ok(ubahNilai('1234567.1', d).error);
  assert.equal(ubahNilai('123456.1', d).value, '123456.1');
  assert.ok(ubahNilai('abc', d).error);
  assert.equal(ubahNilai(null, d).value, null);
});

test('waktu: pecahan detik dibuang dan dicatat; zona bukan UTC ditolak', () => {
  const t = K({ tipe: 'datetime' });
  assert.deepEqual(ubahNilai('2026-10-20 22:15:01.226328+00', t), { value: '2026-10-20 22:15:01', catatan: 'pecahan_detik_dibuang' });
  assert.deepEqual(ubahNilai('2026-10-20 22:15:01+00', t), { value: '2026-10-20 22:15:01' });
  assert.deepEqual(ubahNilai('2026-10-20 22:15:01.000000+00', t), { value: '2026-10-20 22:15:01' });
  assert.ok(ubahNilai('2026-10-21 06:15:01+08', t).error);
  assert.ok(ubahNilai('infinity', t).error);
});

test('tanggal: kalender divalidasi', () => {
  const d = K({ tipe: 'date' });
  assert.equal(ubahNilai('2024-02-29', d).value, '2024-02-29');
  assert.ok(ubahNilai('2026-02-30', d).error);
  assert.ok(ubahNilai('infinity', d).error);
});

test('boolean, bigint, int, float', () => {
  assert.equal(ubahNilai(true, K({ tipe: 'tinyint' })).value, 1);
  assert.equal(ubahNilai(false, K({ tipe: 'tinyint' })).value, 0);
  assert.equal(ubahNilai('9007199254740993', K({ tipe: 'bigint' })).value, '9007199254740993');
  assert.equal(ubahNilai('12', K({ tipe: 'int' })).value, 12);
  assert.ok(ubahNilai('1.5', K({ tipe: 'int' })).error);
  assert.equal(ubahNilai(1.25, K({ tipe: 'double' })).value, 1.25);
});

test('teks: array/objek jadi JSON, jsonb mentah dipertahankan, panjang dicek, emoji utuh', () => {
  const l = K({ tipe: 'longtext' });
  assert.equal(ubahNilai(['a', 'b'], l).value, '["a","b"]');
  assert.equal(ubahNilai('{"a": 1}', l).value, '{"a": 1}');
  assert.equal(ubahNilai('"teks"', l).value, '"teks"');
  assert.equal(ubahNilai('😀 Samarinda', l).value, '😀 Samarinda');
  const v = K({ tipe: 'varchar', panjang: 5 });
  assert.equal(ubahNilai('😀😀😀😀😀', v).value, '😀😀😀😀😀');
  assert.ok(ubahNilai('123456', v).error);
  assert.ok(ubahNilai('x'.repeat(65536), K({ tipe: 'text' })).error);
});

test('urutan tabel: induk lebih dulu, self-reference dan siklus tidak menggantung', () => {
  const o = urutkanTabel(['c', 'b', 'a'], [['c', 'b'], ['b', 'a']]);
  assert.deepEqual(o, ['a', 'b', 'c']);
  assert.deepEqual(urutkanTabel(['a', 'b'], [['a', 'a']]), ['a', 'b']);
  assert.equal(urutkanTabel(['a', 'b'], [['a', 'b'], ['b', 'a']]).length, 2);
});

test('INSERT: upsert tanpa mengubah PK; tanpa PK = insert biasa', () => {
  assert.equal(bangunInsert('t', ['id', 'n'], ['id'], 2),
    'INSERT INTO `t` (`id`,`n`) VALUES (?,?),(?,?) ON DUPLICATE KEY UPDATE `n`=VALUES(`n`)');
  assert.equal(bangunInsert('t', ['id'], ['id'], 1),
    'INSERT INTO `t` (`id`) VALUES (?) ON DUPLICATE KEY UPDATE `id`=`id`');
  assert.equal(bangunInsert('t', ['a'], [], 1), 'INSERT INTO `t` (`a`) VALUES (?)');
});

test('galatAman tidak membocorkan nilai data', () => {
  const e = { code: 'ER_TRUNCATED_WRONG_VALUE', sqlMessage: "Incorrect date value: '2026-13-45' for column `x`.`t`.`tgl` at row 1" };
  assert.ok(!galatAman(e).includes('2026-13-45'));
  assert.ok(galatAman({ code: 'ER_DATA_TOO_LONG', sqlMessage: "Data too long for column 'nama' at row 1" }).includes('nama'));
});

test('perbandingan angka dan normalisasi sel', () => {
  assert.ok(samaAngka('10.50', '10.5'));
  assert.ok(samaAngka(null, null));
  assert.ok(!samaAngka('1', null));
  assert.ok(!samaAngka('100', '101'));
  assert.equal(normalisasiSel('12.50'), '12.5');
  assert.equal(normalisasiSel('2026-10-20 22:15:01.226+00'), '2026-10-20 22:15:01');
  assert.equal(normalisasiSel(true), '1');
  assert.equal(normalisasiSel(null), '∅');
});
