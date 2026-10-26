// Jalankan satu berkas .sql ke MariaDB (memakai DB_* dari .env.local) dan tampilkan hasil tiap SELECT sebagai tabel.
//   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/03_wilayah_kerja.sql
//   node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/02_supabase_tables.sql
// Cocok untuk PowerShell (tidak perlu operator "<"). Mendukung baris `DELIMITER //` ... `DELIMITER ;`
// (dipakai untuk trigger/prosedur). Kata sandi tidak pernah dicetak.
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const berkas = process.argv[2];
if (!berkas) { console.error('Pemakaian: node --env-file=.env.local scripts/migrate/jalankan-sql.mjs <berkas.sql>'); process.exit(1); }
for (const k of ['DB_USER', 'DB_NAME']) if (!process.env[k]) { console.error(`Variabel ${k} belum diisi.`); process.exit(1); }

// Buang komentar "-- ..." di ujung baris (tidak memotong tanda -- yang ada di dalam tanda kutip).
function tanpaKomentar(baris) {
  let kutip = null;
  for (let i = 0; i < baris.length; i++) {
    const ch = baris[i];
    if (kutip) { if (ch === '\\' && kutip !== '`') i++; else if (ch === kutip) kutip = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { kutip = ch; continue; }
    if (ch === '-' && baris[i + 1] === '-' && (i + 2 >= baris.length || /\s/.test(baris[i + 2]))) return baris.slice(0, i);
    if (ch === '#') return baris.slice(0, i);
  }
  return baris;
}

// Pecah berkas menjadi pernyataan; mengenali perintah klien `DELIMITER x`.
function pecah(sql) {
  const hasil = [];
  let pemisah = ';';
  let buf = '';
  const simpan = () => {
    const kode = buf.split('\n').map(tanpaKomentar).join('\n').trim();
    if (kode) hasil.push(buf.trim());
    buf = '';
  };
  for (const baris of sql.split(/\r?\n/)) {
    const d = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(baris);
    if (d) { simpan(); pemisah = d[1]; continue; }
    buf += baris + '\n';
    const kode = tanpaKomentar(baris).trimEnd();
    if (kode.endsWith(pemisah)) {
      const utuh = buf.trimEnd();
      const potong = utuh.lastIndexOf(pemisah);
      buf = utuh.slice(0, potong);
      simpan();
    }
  }
  simpan();
  return hasil;
}

const sql = readFileSync(berkas, 'utf8');
const pakaiDelimiter = /^\s*DELIMITER\s+\S+\s*$/im.test(sql);
const c = await mysql.createConnection({
  ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306) }),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci', multipleStatements: !pakaiDelimiter, dateStrings: true, decimalNumbers: true,
});
await c.query("SET time_zone = '+00:00'");

let nTabel = 0, nPernyataan = 0, diubah = 0;
const cetak = (h) => {
  if (Array.isArray(h)) { nTabel++; console.log(`\n--- hasil ${nTabel} (${h.length} baris) ---`); if (h.length) console.table(h.map((r) => ({ ...r }))); }
  else if (h && typeof h.affectedRows === 'number') diubah += h.affectedRows;
};
try {
  if (pakaiDelimiter) {
    for (const p of pecah(sql)) { nPernyataan++; const [h] = await c.query(p); cetak(h); }
    console.log(`\n(${nPernyataan} pernyataan dijalankan satu per satu karena berkas memakai DELIMITER)`);
  } else {
    const [hasil] = await c.query(sql);
    const daftar = Array.isArray(hasil) && hasil.length && (Array.isArray(hasil[0]) || (hasil[0] && 'affectedRows' in hasil[0])) ? hasil : [hasil];
    for (const h of daftar) cetak(h);
  }
  console.log(`\nSelesai. Baris terpengaruh oleh INSERT/UPDATE/ALTER: ${diubah}.`);
} catch (e) {
  console.error('\nGAGAL:', e.code ?? '', (e.sqlMessage ?? e.message).split('\n')[0]);
  process.exitCode = 1;
}
await c.end();
