// scripts/migrate/pg-bandingkan-view.mjs
// Membandingkan keluaran SETIAP view di MariaDB (sumber) dengan di PostgreSQL (tujuan), baris demi baris,
// tanpa mencetak isi data. Angka dibandingkan dengan toleransi 1e-9 relatif; tanggal/waktu sebagai teks.
//   node --env-file=.env.local scripts/migrate/pg-bandingkan-view.mjs
// Tambahan: --prosedur  juga membandingkan status_lapor_mingguan/bulanan (CALL di MariaDB vs fungsi di PostgreSQL).
import mysql from 'mysql2/promise';
import pg from 'pg';
const c = await mysql.createConnection({
  ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306) }),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4_unicode_ci', dateStrings: true, decimalNumbers: false, supportBigNumbers: true, bigNumberStrings: true,
});
await c.query("SET time_zone='+00:00'");
const p = new pg.Client(process.env.PG_URL ? { connectionString: process.env.PG_URL } : { host: process.env.PG_HOST ?? '127.0.0.1', port: Number(process.env.PG_PORT ?? 5432), user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE });
await p.connect(); await p.query("SET TIME ZONE 'UTC'");
// Tipe pg -> teks mentah agar tidak ada konversi Date JS.
for (const oid of [1082, 1083, 1114, 1184, 1700, 20, 701, 700, 16, 3802, 114, 2950]) p.setTypeParser?.(oid, (v) => v);
const types = pg.types; for (const oid of [1082, 1083, 1114, 1184, 1700, 20, 701, 700, 16, 3802, 114, 2950]) types.setTypeParser(oid, (v) => v);

const norm = (v) => {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return 'b:' + v.toString('hex');
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  let s = String(v);
  if (/^t$|^f$/.test(s)) return s === 't' ? 1 : 0;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) return s.replace('T', ' ').replace(/(\.\d+)?(\+00(:00)?|Z)?$/, '').slice(0, 19);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
};
const sama = (a, b) => {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) + 1e-9;
  if (typeof a === 'string' && typeof b === 'string') { try { return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b)); } catch { return false; } }
  return false;
};
const kunciUrut = (r, kols) => JSON.stringify(kols.map((k) => { const v = norm(r[k]); return typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v; }));

const views = (await c.query(`SELECT TABLE_NAME n FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() ORDER BY 1`))[0].map((r) => r.n);
let bermasalah = 0, kosong = 0, ok = 0;
async function banding(nama, a, b) {
  if (a.length !== b.length) { bermasalah++; console.log(`  BEDA   ${nama}: baris MariaDB ${a.length}, PostgreSQL ${b.length}`); return; }
  if (!a.length) { kosong++; console.log(`  kosong ${nama}`); return; }
  const kA = Object.keys(a[0]).map((x) => x.toLowerCase()).sort(); const kB = Object.keys(b[0]).map((x) => x.toLowerCase()).sort();
  if (kA.join() !== kB.join()) { bermasalah++; console.log(`  BEDA   ${nama}: kolom ${kA.filter((x) => !kB.includes(x))} vs ${kB.filter((x) => !kA.includes(x))}`); return; }
  const low = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]));
  const A = a.map(low), B = b.map(low);
  A.sort((x, y) => (kunciUrut(x, kA) < kunciUrut(y, kA) ? -1 : 1)); B.sort((x, y) => (kunciUrut(x, kA) < kunciUrut(y, kA) ? -1 : 1));
  let n = 0; const kolBeda = new Set();
  for (let i = 0; i < A.length; i++) for (const k of kA) if (!sama(norm(A[i][k]), norm(B[i][k]))) { n++; kolBeda.add(k); }
  if (n) { bermasalah++; console.log(`  BEDA   ${nama}: ${n} sel berbeda, kolom: ${[...kolBeda].slice(0, 8).join(',')}`); } else { ok++; console.log(`  cocok  ${nama} (${A.length} baris)`); }
}
for (const v of views) {
  if (v === 'view_hiv_mingguan' || v === 'view_tb_mingguan') continue;
  try {
    const a = (await c.query(`SELECT * FROM \`${v}\``))[0];
    const b = (await p.query(`SELECT * FROM "${v}"`)).rows;
    await banding(v, a, b);
  } catch (e) { bermasalah++; console.log(`  GALAT  ${v}: ${e.message.split('\n')[0]}`); }
}
if (process.argv.includes('--prosedur')) {
  const tahun = 2025; 
  for (const [nama, rentang, args] of [['status_lapor_mingguan', [1, 2, 10, 30, 52], (t, x) => [t, x]], ['status_lapor_bulanan', [1, 3, 6, 10, 12], (t, x) => [t, x]]]) {
    for (const t of [2025, 2026]) for (const x of rentang) {
      const [hasil] = await c.query(`CALL \`${nama}\`(?, ?)`, args(t, x));
      const a = Array.isArray(hasil[0]) ? hasil[0] : hasil;
      const b = (await p.query(`SELECT * FROM ${nama}($1, $2)`, args(t, x))).rows;
      await banding(`${nama}(${t},${x})`, a, b);
    }
  }
}
console.log(`\nRingkasan: ${ok} cocok, ${kosong} kosong (tidak teruji), ${bermasalah} bermasalah.`);
await c.end(); await p.end();
process.exit(bermasalah ? 1 : 0);
