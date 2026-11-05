// Jalankan satu berkas .sql ke PostgreSQL (memakai DATABASE_URL atau DB_* dari .env.local) dan tampilkan
// hasil tiap SELECT sebagai tabel.
//   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs scripts/migrate/20_wilker_ref_sumber_tunggal.sql
// Seluruh berkas dikirim apa adanya (protokol query sederhana), jadi BEGIN/COMMIT, DO $$ ... $$, dan fungsi
// bertanda $$ di dalam berkas berjalan normal. Kata sandi tidak pernah dicetak.
import pg from 'pg';
import { readFileSync } from 'node:fs';

const berkas = process.argv[2];
if (!berkas) {
  console.error('Pemakaian: node --env-file=.env.local scripts/migrate/jalankan-sql.mjs <berkas.sql>');
  process.exit(1);
}

const e = process.env;
const config = e.DATABASE_URL
  ? { connectionString: e.DATABASE_URL }
  : {
      host: e.DB_SOCKET || e.DB_HOST || 'localhost',
      port: Number(e.DB_PORT || 5432),
      user: e.DB_USER,
      password: e.DB_PASSWORD,
      database: e.DB_NAME,
    };
if (!e.DATABASE_URL && (!config.user || !config.database)) {
  console.error('Isi DATABASE_URL, atau DB_USER dan DB_NAME (dan DB_PASSWORD) di .env.local.');
  process.exit(1);
}
if (e.DB_SSL === 'true') config.ssl = { rejectUnauthorized: false };

const sql = readFileSync(berkas, 'utf8');
const klien = new pg.Client(config);
try {
  await klien.connect();
  const hasil = await klien.query(sql);
  const daftar = Array.isArray(hasil) ? hasil : [hasil];
  daftar.forEach((r, i) => {
    if (r.fields?.length) {
      console.log(`\n-- hasil #${i + 1} (${r.rowCount} baris)`);
      console.table(r.rows);
    } else if (r.command) {
      console.log(`${r.command}${r.rowCount != null ? ` ${r.rowCount}` : ''}`);
    }
  });
  console.log(`\nSelesai: ${berkas}`);
} catch (err) {
  console.error('GAGAL:', err.message);
  if (err.position) console.error('  posisi karakter:', err.position);
  process.exitCode = 1;
} finally {
  await klien.end().catch(() => {});
}
