import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

const args = process.argv.slice(2);
const tandaiSaja = args.includes('--tandai');
const dir = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'sql/migrasi');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrasi (
  nama VARCHAR(255) PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  diterapkan_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const [rows] = await conn.query('SELECT nama, checksum FROM schema_migrasi');
const sudah = new Map(rows.map((r) => [r.nama, r.checksum]));
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

let baru = 0;
for (const f of files) {
  const sql = await readFile(path.join(dir, f), 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  if (sudah.has(f)) {
    if (sudah.get(f) !== checksum) {
      console.error(`[migrasi] ${f} sudah diterapkan lalu diubah. Buat file baru, jangan ubah yang lama.`);
      process.exit(1);
    }
    continue;
  }
  console.log(`[migrasi] ${tandaiSaja ? 'menandai' : 'menerapkan'} ${f}`);
  try {
    if (!tandaiSaja) await conn.query(sql);
    await conn.query('INSERT INTO schema_migrasi (nama, checksum) VALUES (?, ?)', [f, checksum]);
    baru++;
  } catch (e) {
    console.error(`[migrasi] GAGAL di ${f}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`[migrasi] selesai, ${baru} file diproses`);
await conn.end();