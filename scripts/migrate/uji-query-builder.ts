// Uji adapter lib/db/query-builder.ts terhadap MariaDB NYATA (skema 01-04 sudah dimuat).
// Jalankan (database uji kosong, JANGAN ke database yang berisi data asli):
//   DB_USER=epic DB_PASSWORD=epic DB_NAME=epic DB_SOCKET=/run/mysqld/mysqld.sock \
//     npx tsx --test scripts/migrate/uji-query-builder.ts
// Uji membuat dan membersihkan barisnya sendiri (awalan "uji-"), tetapi tetap pakai database terpisah.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dbFrom, dbRpc, resetMetaDb } from '../../lib/db/query-builder';
import { getDbClient, tutupDb } from '../../lib/db/client';

const db = () => getDbClient();

before(async () => {
  resetMetaDb();
  if (process.env.DB_NAME === 'epic_produksi') throw new Error('Jangan jalankan uji ini di database data asli.');
  await db().execute("DELETE FROM pengawasan_klinik WHERE 1=1");
  await db().execute("DELETE FROM klinik_binaan WHERE nama_klinik LIKE 'uji-%'");
  await db().execute("DELETE FROM wilker_ref WHERE kode LIKE 'UJI%'");
});
after(async () => {
  await db().execute("DELETE FROM pengawasan_klinik WHERE 1=1");
  await db().execute("DELETE FROM klinik_binaan WHERE nama_klinik LIKE 'uji-%'");
  await db().execute("DELETE FROM wilker_ref WHERE kode LIKE 'UJI%'");
  await tutupDb();
});

test('insert + RETURNING + single; JSON dan angka kembali sebagai objek/number', async () => {
  const r = await dbFrom('wilker_ref')
    .insert({ kode: 'UJI1', nama: 'Uji Satu', jenis: 'Pelabuhan', lat: -0.5, lng: 117.15, sub_lokasi: ['A', 'B c'] })
    .select()
    .single();
  assert.equal(r.error, null);
  assert.equal(r.data.kode, 'UJI1');
  assert.deepEqual(r.data.sub_lokasi, ['A', 'B c']);
  assert.equal(typeof r.data.lat, 'number');
  assert.equal(r.data.lat, -0.5);
});

test('select: eq, in, order (NULL terakhir saat ASC), limit, range, count+head', async () => {
  await dbFrom('wilker_ref').insert([
    { kode: 'UJI2', nama: 'Uji Dua', jenis: 'Bandara', lat: 1, lng: 2, catatan: null },
    { kode: 'UJI3', nama: 'Uji Tiga', jenis: 'Kantor', lat: 3, lng: 4, catatan: 'ada' },
  ]);
  const a = await dbFrom('wilker_ref').select('kode, catatan').in('kode', ['UJI1', 'UJI2', 'UJI3']).order('catatan', { ascending: true });
  // ASC: 'ada' dulu, lalu NULL (UJI1 dan UJI2 punya catatan NULL)
  assert.equal(a.data[0].kode, 'UJI3');
  const d = await dbFrom('wilker_ref').select('kode, catatan').in('kode', ['UJI1', 'UJI2', 'UJI3']).order('catatan', { ascending: false });
  assert.equal(d.data[0].kode === 'UJI3', false); // DESC: NULL dulu (seperti Postgres)
  const l = await dbFrom('wilker_ref').select('kode').like('kode', 'UJI%').order('kode').limit(2);
  assert.equal(l.data.length, 2);
  const g = await dbFrom('wilker_ref').select('kode').like('kode', 'UJI%').order('kode').range(1, 1);
  assert.deepEqual(g.data, [{ kode: 'UJI2' }]);
  const c = await dbFrom('wilker_ref').select('*', { count: 'exact', head: true }).like('kode', 'UJI%');
  assert.equal(c.count, 3);
  assert.equal(c.data, null);
});

test('like peka huruf besar/kecil, ilike tidak; wildcard * di or()', async () => {
  const k = await dbFrom('klinik_binaan').insert([
    { nama_klinik: 'uji-Klinik Sehat', kategori: 'klinik' },
    { nama_klinik: 'uji-BKK Pusat', kategori: 'bkk' },
  ]).select();
  assert.equal(k.data.length, 2);
  assert.equal((await dbFrom('klinik_binaan').select('nama_klinik').like('nama_klinik', 'uji-klinik%')).data.length, 0);
  assert.equal((await dbFrom('klinik_binaan').select('nama_klinik').ilike('nama_klinik', 'uji-klinik%')).data.length, 1);
  const o = await dbFrom('klinik_binaan').select('nama_klinik').or('nama_klinik.ilike.*KLINIK*,kategori.eq.bkk').like('nama_klinik', 'uji-%');
  assert.equal(o.data.length, 2);
  const o2 = await dbFrom('klinik_binaan').select('nama_klinik').or('and(kategori.eq.bkk,nama_klinik.ilike.*pusat*),nama_klinik.eq.tidak-ada').like('nama_klinik', 'uji-%');
  assert.equal(o2.data.length, 1);
});

test('is null, not is null, neq, in kosong', async () => {
  assert.equal((await dbFrom('wilker_ref').select('kode').like('kode', 'UJI%').is('catatan', null)).data.length, 2);
  assert.equal((await dbFrom('wilker_ref').select('kode').like('kode', 'UJI%').not('catatan', 'is', null)).data.length, 1);
  assert.equal((await dbFrom('wilker_ref').select('kode').like('kode', 'UJI%').neq('jenis', 'Kantor')).data.length, 2);
  assert.equal((await dbFrom('wilker_ref').select('kode').in('kode', [])).data.length, 0);
});

test('upsert (PK), ignoreDuplicates, update().select(), delete().select()', async () => {
  const u = await dbFrom('wilker_ref').upsert({ kode: 'UJI1', nama: 'Uji Satu (baru)', jenis: 'Pelabuhan', lat: 9, lng: 9 }).select().single();
  assert.equal(u.data.nama, 'Uji Satu (baru)');
  await dbFrom('wilker_ref').upsert({ kode: 'UJI1', nama: 'TIDAK BOLEH', jenis: 'Pelabuhan', lat: 9, lng: 9 }, { ignoreDuplicates: true });
  assert.equal((await dbFrom('wilker_ref').select('nama').eq('kode', 'UJI1').single()).data.nama, 'Uji Satu (baru)');
  const up = await dbFrom('wilker_ref').update({ catatan: 'diubah', sub_lokasi: { x: 1 } }).eq('kode', 'UJI3').select();
  assert.equal(up.data.length, 1);
  assert.equal(up.data[0].catatan, 'diubah');
  assert.deepEqual(up.data[0].sub_lokasi, { x: 1 });
  const del = await dbFrom('wilker_ref').delete().eq('kode', 'UJI3').select();
  assert.equal(del.data.length, 1);
  assert.equal((await dbFrom('wilker_ref').select('kode').eq('kode', 'UJI3')).data.length, 0);
});

test('galat dipetakan ke kode Postgres', async () => {
  const dup = await dbFrom('klinik_binaan').insert({ nama_klinik: 'uji-BKK Pusat', kategori: 'bkk' });
  assert.equal(dup.error?.code, '23505');
  const chk = await dbFrom('klinik_binaan').insert({ nama_klinik: 'uji-x', kategori: 'salah' });
  assert.equal(chk.error?.code, '23514');
  const nn = await dbFrom('wilker_ref').insert({ kode: 'UJIN', jenis: 'Kantor', lat: 1, lng: 1 });
  assert.equal(nn.error?.code, '23502');
  const s0 = await dbFrom('wilker_ref').select('*').eq('kode', 'TIDAK-ADA').single();
  assert.equal(s0.error?.code, 'PGRST116');
  const mb = await dbFrom('wilker_ref').select('*').eq('kode', 'TIDAK-ADA').maybeSingle();
  assert.equal(mb.error, null);
  assert.equal(mb.data, null);
  const kol = await dbFrom('wilker_ref').select('kolom_tidak_ada');
  assert.equal(kol.error?.code, '42703');
  await assert.rejects(async () => { await dbFrom('klinik_binaan').insert({ nama_klinik: 'uji-BKK Pusat' }).throwOnError(); });
});

test('embed relasi: to-one, to-many, alias, inner; tinyint(1) -> boolean; DATETIME -> ISO UTC; date tetap', async () => {
  const kl = (await dbFrom('klinik_binaan').select('id').eq('nama_klinik', 'uji-Klinik Sehat').single()).data.id;
  const p = await dbFrom('pengawasan_klinik')
    .insert({ klinik_id: kl, tanggal_kegiatan: '2026-10-20T08:00:00Z', papan_nama_vaksinasi: true, ruang_vaksinasi: false, item_bermasalah: ['a'], created_at: '2026-10-21T06:15:01.226Z' })
    .select('*, klinik_binaan(nama_klinik)')
    .single();
  assert.equal(p.error, null, JSON.stringify(p.error));
  assert.equal(p.data.klinik_binaan.nama_klinik, 'uji-Klinik Sehat');
  assert.equal(p.data.tanggal_kegiatan, '2026-10-20');
  assert.equal(p.data.papan_nama_vaksinasi, true);
  assert.equal(p.data.ruang_vaksinasi, false);
  assert.equal(p.data.sio_ada, null);
  assert.deepEqual(p.data.item_bermasalah, ['a']);
  if ('created_at' in p.data) assert.match(String(p.data.created_at), /^2026-10-21T06:15:01\+00:00$/);

  const anak = await dbFrom('klinik_binaan').select('nama_klinik, pengawasan_klinik(id, tanggal_kegiatan)').eq('id', kl).single();
  assert.equal(anak.data.pengawasan_klinik.length, 1);
  assert.equal(anak.data.pengawasan_klinik[0].tanggal_kegiatan, '2026-10-20');
  assert.equal('id' in anak.data, false); // kolom penyambung tidak bocor

  const inner = await dbFrom('klinik_binaan').select('nama_klinik, pengawasan_klinik!inner(id)').like('nama_klinik', 'uji-%');
  assert.equal(inner.data.length, 1);
  const alias = await dbFrom('pengawasan_klinik').select('tanggal_kegiatan, kl:klinik_binaan(nama_klinik)').eq('klinik_id', kl).single();
  assert.equal(alias.data.kl.nama_klinik, 'uji-Klinik Sehat');
});

test('alias kolom (minggu:minggu_epid) pada view', async () => {
  const r = await dbFrom('view_pab_mingguan').select('tahun, m:minggu, wilayah_kerja').limit(1);
  assert.equal(r.error, null, JSON.stringify(r.error));
  await db().execute("INSERT INTO pab (wilayah_kerja, nama_ttu, tanggal, jumlah_pab_diperiksa, fisik, kimia, bakteriologis) VALUES ('WK01','uji-ttu','2026-10-05',1,'Memenuhi Syarat','Memenuhi Syarat','Memenuhi Syarat')");
  const v = await dbFrom('view_pab_mingguan').select('tahun, m:minggu, wilayah_kerja').eq('wilayah_kerja', 'WK01');
  assert.equal(v.error, null, JSON.stringify(v.error));
  assert.ok(v.data.length >= 1 && 'm' in v.data[0] && !('minggu' in v.data[0]));
  await db().execute("DELETE FROM pab WHERE nama_ttu = 'uji-ttu'");
});

test('rpc: prosedur status_lapor_mingguan mengembalikan array baris', async () => {
  const r = await dbRpc('status_lapor_mingguan', { p_tahun: 2026, p_minggu: 40 });
  assert.equal(r.error, null, JSON.stringify(r.error));
  assert.ok(Array.isArray(r.data));
  const t = await dbRpc('tidak_ada', {});
  assert.ok(t.error);
});

test('nama kolom berbahaya ditolak (injeksi)', async () => {
  const r = await dbFrom('wilker_ref').select('*').eq('kode`; DROP TABLE wilker_ref; --', 'x');
  assert.ok(r.error);
  assert.equal((await dbFrom('wilker_ref').select('kode').limit(1)).error, null);
});
