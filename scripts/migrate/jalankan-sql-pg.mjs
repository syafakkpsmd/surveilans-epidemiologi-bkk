// scripts/migrate/jalankan-sql-pg.mjs
// Menjalankan satu atau beberapa berkas .sql ke PostgreSQL memakai env PG_* (tanpa perlu psql; cocok untuk PowerShell).
//   node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs schema/postgres/01_tabel.sql schema/postgres/02_fungsi_trigger.sql
// Env: PG_URL  atau  PG_HOST PG_PORT PG_USER PG_PASSWORD PG_DATABASE. Kata sandi tidak pernah dicetak.
import pg from 'pg';
import { readFileSync } from 'node:fs';
const berkas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!berkas.length) { console.error('Pemakaian: node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs <berkas.sql> [...]'); process.exit(1); }
if (!process.env.PG_URL && !(process.env.PG_USER && process.env.PG_DATABASE)) { console.error('Isi PG_URL atau PG_USER + PG_DATABASE.'); process.exit(1); }
const k = new pg.Client(process.env.PG_URL ? { connectionString: process.env.PG_URL } : {
  host: process.env.PG_HOST ?? '127.0.0.1', port: Number(process.env.PG_PORT ?? 5432), user: process.env.PG_USER,
  password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE,
});
await k.connect();
await k.query("SET TIME ZONE 'UTC'");
try {
  for (const b of berkas) {
    await k.query(readFileSync(b, 'utf8')); // protokol sederhana: boleh banyak pernyataan dan $$ ... $$
    console.log(`OK  ${b}`);
  }
} catch (e) {
  console.error(`GAGAL: ${e.message}${e.position ? ` (posisi ${e.position})` : ''}`);
  process.exitCode = 1;
} finally { await k.end(); }
