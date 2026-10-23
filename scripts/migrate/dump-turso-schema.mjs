// Dump SKEMA Turso (tanpa data) + jumlah baris per tabel.
// Jalankan dari root repo:
//   node --env-file=.env.local scripts/migrate/dump-turso-schema.mjs
// Hasil: schema-dump/turso_schema.sql dan schema-dump/turso_rowcounts.txt
// Token tidak pernah dicetak atau ditulis ke file.
import { createClient } from '@libsql/client';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN belum ada di .env.local');
  process.exit(1);
}

const db = createClient({ url, authToken });

const { rows } = await db.execute(`
  SELECT type, name, tbl_name, sql
  FROM sqlite_master
  WHERE sql IS NOT NULL
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_litestream_%'
    AND name NOT LIKE 'libsql_%'
  ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 WHEN 'view' THEN 3 ELSE 4 END, name
`);

mkdirSync('schema-dump', { recursive: true });

let ddl = `-- Skema Turso (tanpa data) - dibuat ${new Date().toISOString()}\n\n`;
for (const r of rows) {
  ddl += `-- ${r.type}: ${r.name}\n${String(r.sql).trim()};\n\n`;
}
writeFileSync('schema-dump/turso_schema.sql', ddl, 'utf8');

let counts = 'tabel\tjumlah_baris\n';
const tables = rows.filter((r) => r.type === 'table').map((r) => String(r.name));
for (const t of tables) {
  try {
    const res = await db.execute(`SELECT COUNT(*) AS n FROM "${t.replace(/"/g, '""')}"`);
    counts += `${t}\t${res.rows[0].n}\n`;
  } catch (e) {
    counts += `${t}\tERROR: ${e.message}\n`;
  }
}
writeFileSync('schema-dump/turso_rowcounts.txt', counts, 'utf8');

console.log(`Selesai: ${rows.length} objek skema, ${tables.length} tabel.`);
console.log('File: schema-dump/turso_schema.sql dan schema-dump/turso_rowcounts.txt');
