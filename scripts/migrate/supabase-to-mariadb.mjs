// Pindahkan DATA dari Supabase (PostgreSQL) ke MariaDB.
//
// Prasyarat: schema/mariadb/01 .. 04 sudah dimuat di MariaDB tujuan (urutan di docs/MIGRASI_MARIADB.md).
// Jalankan dari root repo:
//   npm install --save-dev pg            (sekali saja)
//   node --env-file=.env.local scripts/migrate/supabase-to-mariadb.mjs --dry-run   (baca + cek, TANPA menulis)
//   node --env-file=.env.local scripts/migrate/supabase-to-mariadb.mjs             (pindahkan data)
//   node --env-file=.env.local scripts/migrate/supabase-to-mariadb.mjs --tabel=wilker_ref,profiles
//
// Variabel env:
//   SUPABASE_DB_URL  string koneksi Postgres (Supabase -> Project Settings -> Database -> Connection string;
//                    pakai "Session pooler" bila jaringan Anda tidak mendukung IPv6). JANGAN dikirim ke chat
//                    dan jangan di-commit. SUPABASE_DB_SSL=off hanya untuk Postgres lokal.
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SOCKET   tujuan MariaDB (sama dengan aplikasi)
//
// Sifat skrip:
//  * Sumber hanya DIBACA (transaksi read-only, satu gambaran data konsisten).
//  * Aman diulang: INSERT ... ON DUPLICATE KEY UPDATE dengan PK asal; tabel tanpa PK dikosongkan dulu.
//  * Koneksi MariaDB dipaksa utf8mb4 dan mode strict; bila tidak, skrip berhenti (server berdefault latin1
//    dan akan merusak emoji/karakter 4-byte TANPA error).
//  * Trigger hitung indikator (4 tabel vektor) dilewati lewat `SET @lewati_trigger_hitung = 1` pada koneksi
//    ini saja, supaya nilai historis tidak ditimpa hitung ulang.
//  * Tidak memotong/membulatkan diam-diam: pecahan desimal berlebih, teks kepanjangan, tanggal tak valid
//    dicatat sebagai GAGAL pada barisnya. Hanya pecahan detik (kolom DATETIME tanpa pecahan) yang dibuang,
//    dan jumlahnya dilaporkan.
//  * Laporan (tanpa isi data, hanya hitungan, nama kolom, dan nilai PK) ditulis ke
//    data-export/supabase_migrasi_laporan.txt. Folder itu jangan di-commit.
import mysql from 'mysql2/promise';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  TABEL_DIKECUALIKAN, bukaPg, qp, qm, ubahNilai, urutkanTabel, bangunInsert, galatAman, samaAngka,
} from './supabase-migrasi-lib.mjs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const ONLY = (argv.find((a) => a.startsWith('--tabel=')) ?? '').slice(8).split(',').map((s) => s.trim()).filter(Boolean);
const HALAMAN = 2000;
const CHUNK_BARIS = 500;

for (const k of ['SUPABASE_DB_URL', 'DB_USER', 'DB_NAME']) {
  if (!process.env[k]) {
    console.error(`Variabel ${k} belum diisi.`);
    process.exit(1);
  }
}

const laporan = [];
const log = (s = '') => { console.log(s); laporan.push(s); };
let adaMasalah = false;
const masalah = (s) => { adaMasalah = true; log('  !! ' + s); };

// ---------- Koneksi ----------
const pgc = await bukaPg(process.env.SUPABASE_DB_URL, { ssl: process.env.SUPABASE_DB_SSL !== 'off' });
const my = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  socketPath: process.env.DB_SOCKET || undefined,
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
  decimalNumbers: false,
});
await my.query("SET time_zone = '+00:00'");
await my.query('SET SESSION foreign_key_checks = 0');
await my.query('SET @lewati_trigger_hitung = 1');
await my.query('SET SESSION group_concat_max_len = 1048576');

const [[cs]] = await my.query('SELECT @@character_set_client c, @@character_set_connection n, @@character_set_results r, @@sql_mode m');
if (![cs.c, cs.n, cs.r].every((x) => x === 'utf8mb4')) {
  console.error(`Koneksi MariaDB bukan utf8mb4 (${cs.c}/${cs.n}/${cs.r}); dihentikan agar karakter tidak rusak.`);
  process.exit(1);
}
if (!/STRICT_(ALL|TRANS)_TABLES/.test(cs.m)) {
  console.error('Mode SQL MariaDB tidak strict; dihentikan agar data tidak dipotong diam-diam.');
  process.exit(1);
}

// ---------- Metadata ----------
const DB = process.env.DB_NAME;
const [tblM] = await my.query(
  "SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'", [DB]);
const tabelMaria = new Set(tblM.map((r) => r.n));

const [kolM] = await my.query(
  `SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d, NUMERIC_PRECISION p, NUMERIC_SCALE s,
          CHARACTER_MAXIMUM_LENGTH l, ORDINAL_POSITION o
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, ORDINAL_POSITION`, [DB]);
const kolomMaria = new Map();
for (const r of kolM) {
  if (!kolomMaria.has(r.t)) kolomMaria.set(r.t, []);
  kolomMaria.get(r.t).push({ nama: r.c, tipe: String(r.d).toLowerCase(), presisi: r.p == null ? null : Number(r.p), skala: r.s == null ? null : Number(r.s), panjang: r.l == null ? null : Number(r.l) });
}
const [pkM] = await my.query(
  `SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA=? AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME, ORDINAL_POSITION`, [DB]);
const pkMaria = new Map();
for (const r of pkM) pkMaria.set(r.t, [...(pkMaria.get(r.t) ?? []), r.c]);
const [fkM] = await my.query(
  `SELECT CONSTRAINT_NAME k, TABLE_NAME t, COLUMN_NAME c, REFERENCED_TABLE_NAME rt, REFERENCED_COLUMN_NAME rc
     FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`, [DB]);

const { rows: tblP } = await pgc.query(
  "SELECT table_name n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1");
const { rows: kolP } = await pgc.query(
  "SELECT table_name t, column_name c, data_type d FROM information_schema.columns WHERE table_schema='public'");
const kolomPg = new Map();
for (const r of kolP) {
  if (!kolomPg.has(r.t)) kolomPg.set(r.t, new Map());
  kolomPg.get(r.t).set(r.c, r.d);
}
const { rows: pkP } = await pgc.query(
  `SELECT c.relname t, a.attname col FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum = ANY(i.indkey)
    WHERE i.indisprimary AND n.nspname='public' ORDER BY c.relname, array_position(i.indkey, a.attnum)`);
const pkPg = new Map();
for (const r of pkP) pkPg.set(r.t, [...(pkPg.get(r.t) ?? []), r.col]);

// ---------- Pilih tabel ----------
log(`# Migrasi data Supabase -> MariaDB  ${DRY ? '(DRY-RUN, tidak menulis)' : ''}`);
log(`Mulai: ${new Date().toISOString()}`);
const dilewati = [];
let daftar = tblP.map((r) => r.n).filter((n) => {
  if (TABEL_DIKECUALIKAN.has(n)) { dilewati.push(`${n} (dummy, sengaja dilewati)`); return false; }
  if (!tabelMaria.has(n)) { dilewati.push(`${n} (TIDAK ADA di MariaDB)`); adaMasalah = true; return false; }
  return true;
});
if (ONLY.length) {
  const tak = ONLY.filter((t) => !daftar.includes(t));
  if (tak.length) { console.error('Tabel tidak dikenal/tak bisa dipindah: ' + tak.join(', ')); process.exit(1); }
  daftar = daftar.filter((t) => ONLY.includes(t));
}
daftar = urutkanTabel(daftar, fkM.map((r) => [r.t, r.rt]));
for (const d of dilewati) log('  dilewati: ' + d);
log(`Tabel yang diproses: ${daftar.length}\n`);

// ---------- Pindahkan ----------
const ringkas = [];

for (const tabel of daftar) {
  const kolMaria = kolomMaria.get(tabel);
  const kolSumber = kolomPg.get(tabel);
  const kolom = kolMaria.filter((k) => kolSumber.has(k.nama));
  const hanyaSumber = [...kolSumber.keys()].filter((c) => !kolMaria.some((k) => k.nama === c));
  const pk = pkMaria.get(tabel) ?? [];
  const urut = (pkPg.get(tabel) ?? []).length ? pkPg.get(tabel).map(qp).join(',') : 'ctid';
  const nama = kolom.map((k) => k.nama);
  log(`== ${tabel}`);
  if (hanyaSumber.length) masalah(`kolom ada di Supabase tapi tidak di MariaDB (tidak dipindah): ${hanyaSumber.join(', ')}`);
  if (!pk.length) log('  (tanpa PK: tabel tujuan dikosongkan dulu)');

  const { rows: [{ n: totalSumber }] } = await pgc.query(`SELECT count(*)::text n FROM ${qp(tabel)}`);
  const stat = { masuk: 0, gagal: 0, pecahan: 0 };
  const gagal = [];

  if (!DRY && !pk.length) await my.query(`DELETE FROM ${qm(tabel)}`);

  for (let off = 0; off < Number(totalSumber); off += HALAMAN) {
    const { rows } = await pgc.query(
      `SELECT ${nama.map(qp).join(',')} FROM ${qp(tabel)} ORDER BY ${urut} LIMIT ${HALAMAN} OFFSET ${off}`);
    const siap = [];
    for (const r of rows) {
      const nilai = [];
      let galat = null;
      for (const k of kolom) {
        const h = ubahNilai(r[k.nama], k);
        if (h.error) { galat = `${k.nama}: ${h.error}`; break; }
        if (h.catatan === 'pecahan_detik_dibuang') stat.pecahan++;
        nilai.push(h.value);
      }
      const idBaris = pk.length ? pk.map((c) => `${c}=${r[c]}`).join(',') : `#${off + siap.length + stat.gagal}`;
      if (galat) { stat.gagal++; gagal.push(`${idBaris} -> ${galat}`); } else siap.push({ nilai, idBaris });
    }
    if (DRY) { stat.masuk += siap.length; continue; }

    for (let i = 0; i < siap.length; i += CHUNK_BARIS) {
      const bagian = siap.slice(i, i + CHUNK_BARIS);
      try {
        await my.beginTransaction();
        await my.execute(bangunInsert(tabel, nama, pk, bagian.length), bagian.flatMap((b) => b.nilai));
        await my.commit();
        stat.masuk += bagian.length;
      } catch {
        await my.rollback();
        for (const b of bagian) { // cari baris yang bermasalah satu per satu
          try {
            await my.execute(bangunInsert(tabel, nama, pk, 1), b.nilai);
            stat.masuk++;
          } catch (e2) {
            stat.gagal++;
            gagal.push(`${b.idBaris} -> ${galatAman(e2)}`);
          }
        }
      }
    }
  }

  log(`  sumber ${totalSumber} baris; ${DRY ? 'siap' : 'masuk'} ${stat.masuk}; gagal ${stat.gagal}` +
      (stat.pecahan ? `; pecahan detik dibuang pada ${stat.pecahan} nilai` : ''));
  if (stat.gagal) { adaMasalah = true; for (const g of gagal.slice(0, 50)) log('   GAGAL ' + g); if (gagal.length > 50) log(`   ... dan ${gagal.length - 50} lagi`); }

  // ---------- Verifikasi (hanya bila menulis) ----------
  if (!DRY) {
    const [[{ n: totalTujuan }]] = await my.query(`SELECT COUNT(*) n FROM ${qm(tabel)}`);
    if (String(totalTujuan) !== String(totalSumber)) {
      const lebih = Number(totalTujuan) > Number(totalSumber);
      masalah(`jumlah baris beda: sumber ${totalSumber}, tujuan ${totalTujuan}` +
              (lebih ? ' (tujuan lebih banyak: mungkin benih/baris lama, periksa)' : ''));
    }
    const bedaKolom = [];
    for (const k of kolom) {
      const t = kolSumber.get(k.nama);
      const q1 = qp(k.nama);
      const q2 = qm(k.nama);
      let sp; let sm;
      if (['smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision'].includes(t) && k.tipe !== 'char') {
        sp = (await pgc.query(`SELECT COUNT(${q1})::text n, SUM(${q1})::text s FROM ${qp(tabel)}`)).rows[0];
        [[sm]] = await my.query(`SELECT COUNT(${q2}) n, SUM(${q2}) s FROM ${qm(tabel)}`);
        if (String(sp.n) !== String(sm.n) || !samaAngka(sp.s, sm.s)) bedaKolom.push(`${k.nama} (hitung/jumlah)`);
      } else if (t === 'boolean') {
        sp = (await pgc.query(`SELECT COUNT(${q1})::text n, COUNT(*) FILTER (WHERE ${q1})::text s FROM ${qp(tabel)}`)).rows[0];
        [[sm]] = await my.query(`SELECT COUNT(${q2}) n, SUM(${q2}) s FROM ${qm(tabel)}`);
        if (String(sp.n) !== String(sm.n) || !samaAngka(sp.s, sm.s ?? 0)) bedaKolom.push(`${k.nama} (boolean)`);
      } else if (t === 'date' || t.startsWith('timestamp')) {
        const potong = t === 'date' ? 10 : 19;
        sp = (await pgc.query(`SELECT COUNT(${q1})::text n, MIN(${q1})::text a, MAX(${q1})::text b FROM ${qp(tabel)}`)).rows[0];
        [[sm]] = await my.query(`SELECT COUNT(${q2}) n, MIN(${q2}) a, MAX(${q2}) b FROM ${qm(tabel)}`);
        const c = (x) => (x == null ? null : String(x).slice(0, potong));
        if (String(sp.n) !== String(sm.n) || c(sp.a) !== c(sm.a) || c(sp.b) !== c(sm.b)) bedaKolom.push(`${k.nama} (tanggal)`);
      } else if (t === 'text' || t === 'character varying' || t === 'character' || t === 'uuid' || t === 'jsonb' || t === 'json') {
        sp = (await pgc.query(`SELECT COUNT(${q1})::text n, COALESCE(SUM(char_length(${q1}::text)),0)::text s FROM ${qp(tabel)}`)).rows[0];
        [[sm]] = await my.query(`SELECT COUNT(${q2}) n, COALESCE(SUM(CHAR_LENGTH(${q2})),0) s FROM ${qm(tabel)}`);
        if (String(sp.n) !== String(sm.n) || String(sp.s) !== String(sm.s)) bedaKolom.push(`${k.nama} (jumlah/panjang teks)`);
      } else {
        sp = (await pgc.query(`SELECT COUNT(${q1})::text n FROM ${qp(tabel)}`)).rows[0];
        [[sm]] = await my.query(`SELECT COUNT(${q2}) n FROM ${qm(tabel)}`);
        if (String(sp.n) !== String(sm.n)) bedaKolom.push(`${k.nama} (jumlah terisi)`);
      }
    }
    if (bedaKolom.length) masalah('kolom BEDA setelah pindah: ' + bedaKolom.join('; '));
    else log('  verifikasi kolom: sama');
  }
  ringkas.push({ tabel, sumber: totalSumber, ...stat });
}

// ---------- Pemeriksaan FK yatim ----------
if (!DRY) {
  log('\n== Pemeriksaan baris yatim (FK)');
  const perFk = new Map();
  for (const r of fkM) perFk.set(r.k + '|' + r.t, [...(perFk.get(r.k + '|' + r.t) ?? []), r]);
  let yatim = 0;
  for (const [kunci, kolFk] of perFk) {
    const t = kolFk[0].t;
    const rt = kolFk[0].rt;
    if (!daftar.includes(t) && !daftar.includes(rt)) continue;
    const on = kolFk.map((r) => `a.${qm(r.c)} = b.${qm(r.rc)}`).join(' AND ');
    const adaNilai = kolFk.map((r) => `a.${qm(r.c)} IS NOT NULL`).join(' AND ');
    const [[{ n }]] = await my.query(
      `SELECT COUNT(*) n FROM ${qm(t)} a LEFT JOIN ${qm(rt)} b ON ${on} WHERE ${adaNilai} AND b.${qm(kolFk[0].rc)} IS NULL`);
    if (Number(n) > 0) { yatim += Number(n); masalah(`${kunci.split('|')[0]}: ${n} baris di ${t} merujuk ${rt} yang tidak ada`); }
  }
  if (!yatim) log('  tidak ada baris yatim');
}

// ---------- Penutup ----------
log('\n== Ringkasan');
for (const r of ringkas) log(`  ${r.tabel.padEnd(36)} sumber ${String(r.sumber).padStart(7)}  ${DRY ? 'siap' : 'masuk'} ${String(r.masuk).padStart(7)}  gagal ${r.gagal}`);
log(adaMasalah ? '\nSELESAI DENGAN CATATAN (lihat baris "!!" dan "GAGAL"). Jangan lanjut sebelum dibahas.' : '\nSELESAI TANPA MASALAH.');
log('Catatan: bandingkan juga keluaran view (node scripts/migrate/bandingkan-view.mjs) pada data asli.');

await pgc.query('ROLLBACK');
await pgc.end();
await my.end();
mkdirSync('data-export', { recursive: true });
writeFileSync('data-export/supabase_migrasi_laporan.txt', laporan.join('\n') + '\n', 'utf8');
process.exit(adaMasalah ? 1 : 0);
