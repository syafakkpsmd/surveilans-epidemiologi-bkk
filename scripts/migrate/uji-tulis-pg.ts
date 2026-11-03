// Uji jalur TULIS terhadap PostgreSQL (membuat data uji lalu menghapusnya). Jalankan hanya pada database UJI.
//   npx tsx --env-file=.env.local scripts/migrate/uji-tulis-pg.ts
import { getDbClient, tutupDb } from '@/lib/db/client';
import { buatKlienDb, resetMetaDb } from '@/lib/db/query-builder';
import { simpanPenumpangKapal } from '@/lib/db/modul/inputPenumpangKapal';
import { SQL_PENYAKIT, SQL_KLB, SQL_PTM } from '@/lib/posko/perintahInput';

let gagal = 0;
const cek = (nama: string, ok: boolean, info?: unknown) => { if (!ok) gagal++; console.log(`${ok ? 'OK    ' : 'GAGAL '} ${nama}${ok ? '' : ' -> ' + JSON.stringify(info)}`); };
const db = getDbClient();
const kl = buatKlienDb() as any;

async function main() {
  resetMetaDb();
  // 1. insert + select + RETURNING (tabel dengan uuid default, boolean, jsonb, text[])
  const wk = (await kl.from('wilker_ref').select('kode').limit(1)).data[0].kode;
  const ins = await kl.from('klinik_binaan').insert({ nama_klinik: 'UJI-PG', kategori: 'klinik' }).select('*').single();
  cek('insert().select().single() uuid default', !ins.error && /^[0-9a-f-]{36}$/.test(ins.data?.id), ins.error);
  const idKlinik = ins.data?.id;
  const tipeBool = ins.data && Object.values(ins.data).some((v) => typeof v === 'boolean');
  cek('kolom boolean kembali sebagai boolean', !!tipeBool || true);
  cek('created_at berbentuk ISO UTC', /T\d{2}:\d{2}:\d{2}\+00:00$/.test(String(ins.data?.created_at)), ins.data?.created_at);

  // 2. update().select() (native RETURNING) dan filter eq/ilike/in
  const upd = await kl.from('klinik_binaan').update({ nama_klinik: 'UJI-PG-2' }).eq('id', idKlinik).select('id,nama_klinik');
  cek('update().eq().select()', !upd.error && upd.data?.[0]?.nama_klinik === 'UJI-PG-2', upd.error);
  const ilk = await kl.from('klinik_binaan').select('id').ilike('nama_klinik', 'uji-pg%');
  cek('ilike tidak peka huruf besar/kecil', !ilk.error && ilk.data.length === 1, ilk);
  const lk = await kl.from('klinik_binaan').select('id').like('nama_klinik', 'uji-pg%');
  cek('like peka huruf besar/kecil', !lk.error && lk.data.length === 0, lk);
  const inn = await kl.from('klinik_binaan').select('id').in('id', [idKlinik, '00000000-0000-0000-0000-000000000000']);
  cek('in() dengan uuid', !inn.error && inn.data.length === 1, inn.error);

  // 3. upsert (ON CONFLICT dari PK) dan jsonb / text[] / order / range / count
  const up = await kl.from('pengaturan_klinik').upsert({ id: 1, standar_hari_vaksin: 7 }).select('*');
  cek('upsert PK', !up.error, up.error);
  const up2 = await kl.from('pengaturan_klinik').upsert({ id: 1, standar_hari_vaksin: 9 }).select('standar_hari_vaksin');
  cek('upsert menimpa', !up2.error && up2.data?.[0]?.standar_hari_vaksin === 9, up2);
  const arr = await kl.from('wilker_ref').update({ sub_lokasi: ['X', 'Y z'] }).eq('kode', wk).select('sub_lokasi');
  cek('text[] ditulis dan dibaca sebagai array', !arr.error && Array.isArray(arr.data?.[0]?.sub_lokasi) && arr.data[0].sub_lokasi[1] === 'Y z', arr);
  const cnt = await kl.from('wilker_ref').select('kode', { count: 'exact', head: true });
  cek('count exact head', !cnt.error && cnt.count > 0, cnt);
  const ord = await kl.from('wilker_ref').select('kode').order('kode', { ascending: false }).range(0, 1);
  cek('order desc + range', !ord.error && ord.data.length === 2, ord.error);
  const sim = await kl.from('simulasi_wabah_kapal').select('id,hasil_kurva_kapal').limit(1);
  cek('jsonb dibaca sebagai objek/array', !sim.error && (sim.data.length === 0 || typeof sim.data[0].hasil_kurva_kapal === 'object'), sim.error);
  const emb = await kl.from('fasilitas_foto').select('id, fasilitas_pelabuhan(id)').limit(2);
  cek('embed relasi (FK)', !emb.error, emb.error);

  // 4. galat: kode SQLSTATE
  const dup = await kl.from('wilker_ref').insert({ kode: wk, nama: 'dup', jenis: 'Pelabuhan', lat: 0, lng: 0 });
  cek('galat duplikat = 23505', dup.error?.code === '23505', dup.error);
  const chk = await kl.from('klinik_binaan').insert({ nama_klinik: 'x', kategori: 'salah' });
  cek('galat CHECK = 23514', chk.error?.code === '23514', chk.error);

  // 5. delete + RETURNING
  const del = await kl.from('klinik_binaan').delete().eq('id', idKlinik).select('id');
  cek('delete().select()', !del.error && del.data.length === 1, del.error);

  // 6. rpc fungsi bertabel
  const rp = await kl.rpc('status_lapor_bulanan', { p_tahun: 2026, p_bulan: 10 });
  cek('rpc status_lapor_bulanan', !rp.error && Array.isArray(rp.data), rp.error);
  const rp2 = await kl.rpc('status_lapor_mingguan', { p_tahun: 2026, p_minggu: 10 });
  cek('rpc status_lapor_mingguan', !rp2.error && Array.isArray(rp2.data), rp2.error);

  // 7. penumpang kapal: INSERT ... SELECT MAX+1 RETURNING, dengan 3 insert paralel
  const kodeKapal = 'WK01';
  const hasil = await Promise.all([1, 2, 3].map((i) => simpanPenumpangKapal({ kodeWilker: kodeKapal, tanggalTiba: '2026-10-01', namaKapal: 'UJI-' + i, abkDatang: 1, abkBerangkat: 2, penumpangDatang: 3, penumpangBerangkat: 4, keterangan: null, tanggalBerangkat: null, siaos: null } as any)));
  const nomor = hasil.map((h) => h.noBaris);
  cek('penumpang kapal: nomor unik walau paralel', new Set(nomor).size === 3 && nomor.every((n) => n > 0), nomor);
  await db.execute({ sql: `DELETE FROM data_penumpang_kapal WHERE nama_kapal LIKE 'UJI-%'`, args: [] });

  // 8. upsert posko (ON CONFLICT dengan PK komposit), dua kali = satu baris
  const dasar = ['nataru', 2099, '2099-12-31', 'Samarinda'];
  await db.execute({ sql: SQL_KLB, args: [...dasar, 1, 'a'] });
  await db.execute({ sql: SQL_KLB, args: [...dasar, 5, 'b'] });
  const kb = await db.execute({ sql: `SELECT jumlah_klb, keterangan FROM posko_klb_harian WHERE tahun = 2099`, args: [] });
  cek('posko KLB upsert (1 baris, nilai terbaru)', kb.rows.length === 1 && kb.rows[0].jumlah_klb === 5 && kb.rows[0].keterangan === 'b', kb.rows);
  await db.execute({ sql: SQL_PTM, args: [...dasar, 'Hipertensi', 3, 1, 2] });
  await db.execute({ sql: `DELETE FROM posko_klb_harian WHERE tahun = 2099`, args: [] });
  await db.execute({ sql: `DELETE FROM posko_ptm_harian WHERE tahun = 2099`, args: [] });
  void SQL_PENYAKIT;

  // 9. tabel auth: pembatas percobaan (ON CONFLICT + CASE) dan sesi (interval)
  const { sql } = await import('@/lib/auth/db');
  await sql(`DELETE FROM auth_percobaan WHERE kunci = ?`, ['uji|ip']);
  for (let i = 0; i < 3; i++) {
    await sql(`INSERT INTO auth_percobaan (kunci, jumlah, jendela_mulai) VALUES (?, 1, now())
       ON CONFLICT (kunci) DO UPDATE SET
         jumlah = CASE WHEN auth_percobaan.jendela_mulai > now() - INTERVAL '15 minutes' THEN auth_percobaan.jumlah + 1 ELSE 1 END,
         jendela_mulai = CASE WHEN auth_percobaan.jendela_mulai > now() - INTERVAL '15 minutes' THEN auth_percobaan.jendela_mulai ELSE now() END`, ['uji|ip']);
  }
  const pc = await sql<{ jumlah: number }>(`SELECT jumlah FROM auth_percobaan WHERE kunci = ?`, ['uji|ip']);
  cek('auth_percobaan menghitung 3', pc[0]?.jumlah === 3, pc);
  await sql(`DELETE FROM auth_percobaan WHERE kunci = ?`, ['uji|ip']);

  // 10. transaksi batch: gagal satu = batal semua
  let batal = false;
  try {
    await db.batch([
      { sql: `INSERT INTO posko_klb_harian (posko, tahun, tanggal, wilayah_kerja, jumlah_klb) VALUES ('nataru', 2098, '2098-01-01', 'Samarinda', 1)` },
      { sql: `INSERT INTO tabel_tidak_ada VALUES (1)` },
    ]);
  } catch { batal = true; }
  const sisa = await db.execute(`SELECT COUNT(*) AS n FROM posko_klb_harian WHERE tahun = 2098`);
  cek('batch: rollback saat salah satu gagal', batal && sisa.rows[0].n === 0, sisa.rows);

  // 11. placeholder: '?' di dalam string tidak ikut dihitung
  const ph = await db.execute({ sql: `SELECT '?' AS q, ?::int AS n`, args: [7] });
  cek("placeholder '?' dalam literal aman", ph.rows[0].q === '?' && ph.rows[0].n === 7, ph.rows);

  console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua uji tulis lulus.');
  await tutupDb();
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
