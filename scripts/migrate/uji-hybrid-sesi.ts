// Uji penjaga RLS berbasis sesi MariaDB (lib/db/hybrid.ts: buatPenjagaDariSesi). Murni, tanpa database.
//   npx tsx --test scripts/migrate/uji-hybrid-sesi.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buatPenjagaDariSesi } from '../../lib/db/hybrid';

const ID = '11111111-1111-1111-1111-111111111111';

test('tanpa sesi (null) = anonim: profiles ditolak, rat_guard SELECT bebas', async () => {
  const g = buatPenjagaDariSesi(async () => null);
  assert.deepEqual(await g('profiles', 'SELECT'), { izin: 'tolak' });
  assert.deepEqual(await g('rat_guard', 'SELECT'), { izin: 'bebas' });
});

test('petugas login: profiles SELECT dibatasi ke baris sendiri', async () => {
  const g = buatPenjagaDariSesi(async () => ({ id: ID, role: 'petugas' }));
  assert.deepEqual(await g('profiles', 'SELECT'), { izin: 'baris', kolom: 'id', nilai: ID });
});

test('admin login: profiles SELECT dan UPDATE bebas', async () => {
  const g = buatPenjagaDariSesi(async () => ({ id: ID, role: 'admin' }));
  assert.deepEqual(await g('profiles', 'SELECT'), { izin: 'bebas' });
  assert.deepEqual(await g('profiles', 'UPDATE'), { izin: 'bebas' });
});

test('gagal membaca sesi = gagal tertutup (anonim), bukan melempar galat', async () => {
  const diam = console.error;
  console.error = () => {};
  try {
    const g = buatPenjagaDariSesi(async () => { throw new Error('cookies() di luar request'); });
    assert.deepEqual(await g('profiles', 'SELECT'), { izin: 'tolak' });
  } finally {
    console.error = diam;
  }
});

test('sesi dibaca sekali per permintaan walau banyak tabel', async () => {
  let n = 0;
  const g = buatPenjagaDariSesi(async () => { n++; return { id: ID, role: 'admin' }; });
  await g('profiles', 'SELECT'); await g('profiles', 'UPDATE'); await g('rat_guard', 'SELECT');
  assert.equal(n, 1);
});
