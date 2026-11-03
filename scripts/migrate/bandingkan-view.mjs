// Bandingkan keluaran SETIAP view antara Supabase (PostgreSQL) dan MariaDB pada data yang sama.
// Jalankan SETELAH supabase-to-mariadb.mjs selesai tanpa masalah:
//   node --env-file=.env.local scripts/migrate/bandingkan-view.mjs
//   node --env-file=.env.local scripts/migrate/bandingkan-view.mjs --view=view_pab_bulanan
// Env: SUPABASE_DB_URL (+ SUPABASE_DB_SSL=off untuk lokal), DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SOCKET.
// Cara kerja: tiap kolom dibandingkan sebagai kumpulan nilai terurut (angka dibulatkan 8 desimal, waktu dipotong
// ke detik). Yang dilaporkan hanya jumlah baris dan NAMA kolom yang berbeda, tanpa isi data.
import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { bukaPg, qp, qm, normalisasiSel } from './supabase-migrasi-lib.mjs';

const ONLY = (process.argv.find((a) => a.startsWith('--view=')) ?? '').slice(7).split(',').filter(Boolean);
for (const k of ['SUPABASE_DB_URL', 'DB_USER', 'DB_NAME']) {
  if (!process.env[k]) { console.error(`Variabel ${k} belum diisi.`); process.exit(1); }
}
const pgc = await bukaPg(process.env.SUPABASE_DB_URL, { ssl: process.env.SUPABASE_DB_SSL !== 'off' });
const my = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  socketPath: process.env.DB_SOCKET || undefined, charset: 'utf8mb4', timezone: '+00:00',
  dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
});
await my.query("SET time_zone = '+00:00'");

const [vm] = await my.query("SELECT TABLE_NAME n FROM information_schema.VIEWS WHERE TABLE_SCHEMA=? ORDER BY 1", [process.env.DB_NAME]);
const { rows: vp } = await pgc.query("SELECT table_name n FROM information_schema.views WHERE table_schema='public'");
const adaPg = new Set(vp.map((r) => r.n));
let views = vm.map((r) => r.n);
if (ONLY.length) views = views.filter((v) => ONLY.includes(v));

const hashKolom = (rows, kol) =>
  createHash('sha1').update(rows.map((r) => normalisasiSel(r[kol])).sort().join('\u0001')).digest('hex');

const out = [];
const log = (s) => { console.log(s); out.push(s); };
let beda = 0;
for (const v of views) {
  if (!adaPg.has(v)) { log(`?  ${v}: tidak ada di Supabase`); continue; }
  let rp; let rm;
  try {
    rp = (await pgc.query(`SELECT * FROM ${qp(v)}`)).rows;
    [rm] = await my.query(`SELECT * FROM ${qm(v)}`);
  } catch (e) { beda++; log(`!! ${v}: galat saat membaca (${e.code ?? e.message?.slice(0, 80)})`); continue; }
  const kp = rp.length ? Object.keys(rp[0]) : [];
  const km = rm.length ? Object.keys(rm[0]) : [];
  const masalah = [];
  if (rp.length !== rm.length) masalah.push(`jumlah baris ${rp.length} vs ${rm.length}`);
  if (rp.length && rm.length) {
    const ks = new Set(kp);
    const hilang = km.filter((c) => !ks.has(c)); const lebih = kp.filter((c) => !km.includes(c));
    if (hilang.length || lebih.length) masalah.push(`kolom beda: ${[...hilang, ...lebih].join(',')}`);
    const sama = kp.filter((c) => km.includes(c));
    const bedaKol = sama.filter((c) => hashKolom(rp, c) !== hashKolom(rm, c));
    if (bedaKol.length) masalah.push(`isi kolom beda: ${bedaKol.join(',')}`);
  }
  if (masalah.length) { beda++; log(`!! ${v}: ${masalah.join('; ')}`); } else log(`ok ${v} (${rp.length} baris)`);
}
log(`\n${views.length} view dibandingkan; ${beda} bermasalah.`);
await pgc.query('ROLLBACK'); await pgc.end(); await my.end();
mkdirSync('data-export', { recursive: true });
writeFileSync('data-export/bandingkan_view_laporan.txt', out.join('\n') + '\n', 'utf8');
process.exit(beda ? 1 : 0);
