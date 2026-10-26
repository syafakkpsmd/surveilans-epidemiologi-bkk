// Uji jalur browser -> /api/db: QueryBrowser (pencatat) -> JSON -> jalankanRemote -> MariaDB + RLS tiruan.
// fetch dipalsukan agar tidak perlu server Next; isi permintaan tetap melewati JSON.stringify/parse seperti di jaringan.
//   NEXT_PUBLIC_DATA_BACKEND=mariadb DB_USER=epic DB_PASSWORD=epic DB_NAME=epic DB_SOCKET=/run/mysqld/mysqld.sock \
//     npx tsx --test --test-force-exit scripts/migrate/uji-remote.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pakaiMariaDbDiBrowser } from '../../lib/db/browser-client';
import { jalankanRemote, periksaSpec, SpecTidakValid } from '../../lib/db/remote';
import { buatPenjaga } from '../../lib/db/rls';
import type { KonteksAuth } from '../../lib/db/rls';
import { getDbClient, tutupDb } from '../../lib/db/client';
import { resetMetaDb } from '../../lib/db/query-builder';

let konteks: KonteksAuth = { uid: null, role: null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = async (_u: string, init: { body: string }) => {
  const badan = JSON.parse(init.body);
  let hasil;
  try {
    hasil = await jalankanRemote(badan, buatPenjaga(async () => konteks));
  } catch (e) {
    hasil = { data: null, error: { message: (e as Error).message, code: e instanceof SpecTidakValid ? 'PGRST100' : 'XX000', details: null, hint: null }, count: null, status: 400, statusText: '' };
  }
  return { json: async () => JSON.parse(JSON.stringify(hasil)) };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = pakaiMariaDbDiBrowser({ auth: { ok: true } });
const db = () => getDbClient();
const PETUGAS: KonteksAuth = { uid: '11111111-1111-1111-1111-111111111111', role: 'petugas' };

before(async () => {
  resetMetaDb();
  await db().execute("DELETE FROM buletin WHERE nama_kegiatan LIKE 'uji-%'");
});
after(async () => {
  await db().execute("DELETE FROM buletin WHERE nama_kegiatan LIKE 'uji-%'");
  await tutupDb();
});

test('.auth tetap milik klien asli, .from/.rpc dialihkan', () => {
  assert.deepEqual(sb.auth, { ok: true });
  assert.equal(typeof sb.from, 'function');
});

test('baca lewat browser: filter, order, range, count, or() tanpa login', async () => {
  const baris = [1, 2, 3].map((n) => ({ tahun: 2020 + n, nama_kegiatan: `uji-b${n}`, tipe_link: 'canva', link_url: 'http://x' }));
  konteks = PETUGAS;
  const ins = await sb.from('buletin').insert(baris).select('nama_kegiatan, tahun');
  assert.equal(ins.error, null, JSON.stringify(ins.error));
  assert.equal(ins.data.length, 3);
  konteks = { uid: null, role: null };
  const r = await sb.from('buletin').select('nama_kegiatan, tahun', { count: 'exact' }).like('nama_kegiatan', 'uji-%').order('tahun', { ascending: false }).range(0, 1);
  assert.equal(r.error, null);
  assert.deepEqual(r.data.map((x: { tahun: number }) => x.tahun), [2023, 2022]);
  assert.equal(r.count, 3);
  const o = await sb.from('buletin').select('nama_kegiatan').or('tahun.eq.2021,nama_kegiatan.ilike.*B3*').like('nama_kegiatan', 'uji-%');
  assert.equal(o.data.length, 2);
  const i = await sb.from('buletin').select('nama_kegiatan').in('tahun', [2021, 2022]).like('nama_kegiatan', 'uji-%');
  assert.equal(i.data.length, 2);
});

test('tulis lewat browser mengikuti RLS: anon ditolak (42501), login lolos, update/delete', async () => {
  konteks = { uid: null, role: null };
  const a = await sb.from('buletin').insert({ tahun: 2030, nama_kegiatan: 'uji-anon', tipe_link: 'canva', link_url: 'x' });
  assert.equal(a.error?.code, '42501');
  konteks = PETUGAS;
  const u = await sb.from('buletin').update({ tahun: 1999 }).eq('nama_kegiatan', 'uji-b1').select();
  assert.equal(u.data[0].tahun, 1999);
  const d = await sb.from('buletin').delete().eq('nama_kegiatan', 'uji-b2').select('nama_kegiatan');
  assert.equal(d.data.length, 1);
  await assert.rejects(async () => {
    await sb.from('buletin').insert({ tahun: 1, nama_kegiatan: 'uji-b3', tipe_link: 'salah', link_url: 'x' }).throwOnError();
  });
});

test('rpc: hanya prosedur yang diizinkan', async () => {
  const ok = await sb.rpc('status_lapor_mingguan', { p_tahun: 2026, p_minggu: 40 });
  assert.equal(ok.error, null, JSON.stringify(ok.error));
  assert.ok(Array.isArray(ok.data));
  const tak = await sb.rpc('mmwr_tahun', { d: '2026-01-01' });
  assert.ok(tak.error);
});

test('spec berbahaya ditolak validasi', () => {
  const ok = { tabel: 'buletin', op: 'select', kond: [], urutan: [], payload: [] };
  assert.doesNotThrow(() => periksaSpec(ok));
  assert.throws(() => periksaSpec({ ...ok, tabel: 'buletin; DROP TABLE x' }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, tabel: 'a`b' }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, op: 'drop' }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, kond: [{ t: 'cmp', kol: 'tahun', op: 'regexp', val: 'x' }] }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, kond: [{ t: 'cmp', kol: 'a b', op: 'eq', val: 1 }] }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, kond: [{ t: 'cmp', kol: 'tahun', op: 'eq', val: { x: 1 } }] }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, batas: 1e9 }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, urutan: [{ kol: 'x;y' }] }), SpecTidakValid);
  assert.throws(() => periksaSpec({ ...ok, payload: [{ 'a b': 1 }] }), SpecTidakValid);
  assert.throws(() => periksaSpec(null), SpecTidakValid);
});

test('tabel Turso/tertutup tidak bisa dibaca anon dari browser (tanpa policy = kosong)', async () => {
  konteks = { uid: null, role: null };
  const r = await sb.from('pengaturan_ai').select('*');
  assert.deepEqual(r.data, []);
  const t = await sb.from('stok_vaksin').select('*');
  assert.deepEqual(t.data, []);
});
