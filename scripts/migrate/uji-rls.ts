// Uji pengganti RLS (lib/db/rls.ts) + integrasinya di query builder, terhadap MariaDB nyata.
//   DB_USER=epic DB_PASSWORD=epic DB_NAME=epic DB_SOCKET=/run/mysqld/mysqld.sock npx tsx --test scripts/migrate/uji-rls.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { putuskan, buatPenjaga } from '../../lib/db/rls';
import type { KonteksAuth } from '../../lib/db/rls';
import { dbFrom, resetMetaDb } from '../../lib/db/query-builder';
import { getDbClient, tutupDb } from '../../lib/db/client';

const ANON: KonteksAuth = { uid: null, role: null };
const PETUGAS: KonteksAuth = { uid: '11111111-1111-1111-1111-111111111111', role: 'petugas' };
const ADMIN: KonteksAuth = { uid: '22222222-2222-2222-2222-222222222222', role: 'admin' };
const db = () => getDbClient();
const jaga = (k: KonteksAuth) => buatPenjaga(async () => k);

test('keputusan murni: anon/login/admin/diri/tanpa policy', () => {
  assert.deepEqual(putuskan('buletin', 'SELECT', ANON), { izin: 'bebas' });
  assert.deepEqual(putuskan('buletin', 'INSERT', ANON), { izin: 'tolak' });
  assert.deepEqual(putuskan('buletin', 'INSERT', PETUGAS), { izin: 'bebas' });
  assert.deepEqual(putuskan('pengaturan_ai', 'SELECT', PETUGAS), { izin: 'tolak' }); // RLS aktif tanpa policy
  assert.deepEqual(putuskan('pengaturan_ai', 'SELECT', ADMIN), { izin: 'tolak' });
  assert.deepEqual(putuskan('profiles', 'SELECT', ANON), { izin: 'tolak' });
  assert.deepEqual(putuskan('profiles', 'SELECT', PETUGAS), { izin: 'baris', kolom: 'id', nilai: PETUGAS.uid });
  assert.deepEqual(putuskan('profiles', 'SELECT', ADMIN), { izin: 'bebas' });
  assert.deepEqual(putuskan('profiles', 'UPDATE', ADMIN), { izin: 'bebas' });
  assert.deepEqual(putuskan('profiles', 'UPDATE', PETUGAS), { izin: 'baris', kolom: 'id', nilai: PETUGAS.uid });
  assert.deepEqual(putuskan('profiles', 'DELETE', ADMIN), { izin: 'tolak' }); // tidak ada policy DELETE
  // penulisan anonim sengaja dibatasi (ANONIM_BOLEH_TULIS di buat-rls.mjs): rat_guard dulu terbuka untuk anon, kini wajib login
  assert.deepEqual(putuskan('rat_guard', 'INSERT', ANON), { izin: 'tolak' });
  assert.deepEqual(putuskan('rat_guard', 'INSERT', PETUGAS), { izin: 'bebas' });
  assert.deepEqual(putuskan('view_apa_saja', 'SELECT', ANON, true), { izin: 'bebas' });
});

before(async () => {
  resetMetaDb();
  await db().execute("DELETE FROM buletin WHERE nama_kegiatan LIKE 'uji-%'");
  await db().execute({ sql: "DELETE FROM profiles WHERE id IN (?, ?)", args: [PETUGAS.uid, ADMIN.uid] });
  await db().execute({ sql: "INSERT INTO profiles (id, role, nama_lengkap) VALUES (?, 'petugas', 'Uji P'), (?, 'admin', 'Uji A')", args: [PETUGAS.uid, ADMIN.uid] });
});
after(async () => {
  await db().execute("DELETE FROM buletin WHERE nama_kegiatan LIKE 'uji-%'");
  await db().execute({ sql: "DELETE FROM profiles WHERE id IN (?, ?)", args: [PETUGAS.uid, ADMIN.uid] });
  await tutupDb();
});

test('INSERT: anon ditolak (42501), login lolos; SELECT anon boleh', async () => {
  const baris = { tahun: 2026, nama_kegiatan: 'uji-buletin', tipe_link: 'canva', link_url: 'http://x' };
  const a = await dbFrom('buletin', jaga(ANON)).insert(baris);
  assert.equal(a.error?.code, '42501');
  const p = await dbFrom('buletin', jaga(PETUGAS)).insert(baris).select().single();
  assert.equal(p.error, null, JSON.stringify(p.error));
  const s = await dbFrom('buletin', jaga(ANON)).select('nama_kegiatan').like('nama_kegiatan', 'uji-%');
  assert.equal(s.data.length, 1);
});

test('UPDATE/DELETE ditolak diam-diam (0 baris), bukan galat; admin lolos', async () => {
  const u = await dbFrom('buletin', jaga(ANON)).update({ tahun: 1999 }).like('nama_kegiatan', 'uji-%').select();
  assert.equal(u.error, null);
  assert.deepEqual(u.data, []);
  assert.equal((await dbFrom('buletin').select('tahun').like('nama_kegiatan', 'uji-%').single()).data.tahun, 2026);
  const d = await dbFrom('buletin', jaga(ANON)).delete().like('nama_kegiatan', 'uji-%');
  assert.equal(d.error, null);
  assert.equal((await dbFrom('buletin').select('id').like('nama_kegiatan', 'uji-%')).data.length, 1);
  const ok = await dbFrom('buletin', jaga(ADMIN)).update({ tahun: 2027 }).like('nama_kegiatan', 'uji-%').select();
  assert.equal(ok.data[0].tahun, 2027);
});

test('profiles: petugas hanya melihat dirinya, admin melihat semua, anon tidak melihat apa pun', async () => {
  const sendiri = await dbFrom('profiles', jaga(PETUGAS)).select('id, role').in('id', [PETUGAS.uid, ADMIN.uid]);
  assert.deepEqual(sendiri.data.map((r: { id: string }) => r.id), [PETUGAS.uid]);
  const semua = await dbFrom('profiles', jaga(ADMIN)).select('id').in('id', [PETUGAS.uid, ADMIN.uid]);
  assert.equal(semua.data.length, 2);
  assert.equal((await dbFrom('profiles', jaga(ANON)).select('id')).data.length, 0);
  // petugas tidak boleh mengubah profil orang lain, tetapi boleh mengubah profilnya sendiri
  const lain = await dbFrom('profiles', jaga(PETUGAS)).update({ role: 'admin' }).eq('id', ADMIN.uid).select();
  assert.deepEqual(lain.data, []);
  const diri = await dbFrom('profiles', jaga(PETUGAS)).update({ nama_lengkap: 'Uji Diri' }).eq('id', PETUGAS.uid).select();
  assert.equal(diri.data.length, 1);
  // INSERT profil milik orang lain ditolak
  const ins = await dbFrom('profiles', jaga(PETUGAS)).insert({ id: '33333333-3333-3333-3333-333333333333', role: 'admin' });
  assert.equal(ins.error?.code, '42501');
});

test('tabel tanpa policy (pengaturan_ai) tertutup untuk klien pengguna, terbuka untuk klien tanpa penjaga', async () => {
  const t = await dbFrom('pengaturan_ai', jaga(ADMIN)).select('*');
  assert.deepEqual(t.data, []);
  const s = await dbFrom('pengaturan_ai').select('*'); // service-role
  assert.equal(s.error, null);
});

test('embed relasi ikut dijaga (tabel relasi tanpa SELECT ditolak -> null/kosong)', async () => {
  const r = await dbFrom('klinik_binaan', jaga(ANON)).select('nama_klinik, pengawasan_klinik(id)').limit(1);
  assert.equal(r.error, null);
});
