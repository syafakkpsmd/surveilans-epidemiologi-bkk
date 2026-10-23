// Pindahkan DATA dari Turso (SQLite) ke MariaDB.
//
// Jalankan dari root repo (setelah schema/mariadb/01_turso_modules.sql dimuat ke MariaDB):
//   node --env-file=.env.local scripts/migrate/turso-to-mariadb.mjs --dry-run     (cek dulu, tanpa menulis)
//   node --env-file=.env.local scripts/migrate/turso-to-mariadb.mjs               (pindahkan data)
//   node --env-file=.env.local scripts/migrate/turso-to-mariadb.mjs --tabel=tb_data,hiv_data
//
// Variabel env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (sumber, hanya DIBACA)
//               DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SOCKET (tujuan)
//
// Sifat skrip:
//  * Aman diulang: INSERT ... ON DUPLICATE KEY UPDATE, id asal dipertahankan.
//  * Tidak memotong data diam-diam: nilai tak valid dilaporkan; baris yang tak bisa masuk dicatat.
//  * Tidak mencetak token atau isi data pribadi. Laporan ditulis ke data-export/migrasi_laporan.txt
//    (folder itu jangan di-commit).
import { createClient } from '@libsql/client';
import mysql from 'mysql2/promise';
import { mkdirSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const ONLY = (argv.find((a) => a.startsWith('--tabel=')) ?? '').slice(8).split(',').map((s) => s.trim()).filter(Boolean);
const CHUNK_ROWS = 500;
const CHUNK_BYTES = 4 * 1024 * 1024;
const PAGE = 2000;

for (const k of ['TURSO_DATABASE_URL', 'DB_USER', 'DB_NAME']) {
  if (!process.env[k]) {
    console.error(`Variabel ${k} belum diisi.`);
    process.exit(1);
  }
}

const q = (id) => '`' + String(id).replace(/`/g, '``') + '`';
const laporan = [];
const catat = (s) => laporan.push(s);
const log = (s = '') => console.log(s);

// ---------- Normalisasi nilai ----------
const T_INT = new Set(['int', 'integer', 'smallint', 'mediumint', 'tinyint']);
const T_NUM = new Set(['double', 'float', 'decimal', 'numeric', 'real']);
const T_BLOB = new Set(['blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary']);
const T_DATE = new Set(['date']);
const T_DT = new Set(['datetime', 'timestamp']);

const dua = (n) => String(n).padStart(2, '0');

function normDate(v) {
  if (v == null) return { value: null };
  const s = String(v).trim();
  if (s === '') return { value: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return { error: 'format tanggal tidak dikenal' };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return { error: 'tanggal tidak ada di kalender' };
  return { value: `${m[1]}-${m[2]}-${m[3]}` };
}

function normDateTime(v) {
  if (v == null) return { value: null };
  const s = String(v).trim();
  if (s === '') return { value: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (!m) {
    const d = normDate(s);
    if (d.error) return d;
    return { value: `${d.value} 00:00:00` };
  }
  const detik = m[6] ?? '00';
  if (m[8]) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${detik}${m[7] ?? ''}${m[8] === 'Z' ? 'Z' : m[8].length === 5 ? m[8].slice(0, 3) + ':' + m[8].slice(3) : m[8]}`;
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return { error: 'waktu tidak valid' };
    return { value: `${t.getUTCFullYear()}-${dua(t.getUTCMonth() + 1)}-${dua(t.getUTCDate())} ${dua(t.getUTCHours())}:${dua(t.getUTCMinutes())}:${dua(t.getUTCSeconds())}` };
  }
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +detik));
  if (t.getUTCMonth() !== +m[2] - 1 || t.getUTCDate() !== +m[3]) return { error: 'waktu tidak valid' };
  return { value: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${detik}` };
}

function normalisasi(v, kol) {
  const tipe = kol.data_type;
  if (T_DATE.has(tipe)) return normDate(v);
  if (T_DT.has(tipe)) return normDateTime(v);
  if (v == null) return { value: null };
  if (tipe === 'bigint') return { value: String(v) };
  if (T_INT.has(tipe)) {
    if (typeof v === 'string' && v.trim() === '') return { value: null };
    const n = Number(v);
    return Number.isFinite(n) ? { value: Math.trunc(n) } : { error: 'bukan angka bulat' };
  }
  if (T_NUM.has(tipe)) {
    if (typeof v === 'string' && v.trim() === '') return { value: null };
    const n = Number(v);
    return Number.isFinite(n) ? { value: n } : { error: 'bukan angka' };
  }
  if (T_BLOB.has(tipe)) {
    if (v instanceof ArrayBuffer) return { value: Buffer.from(v) };
    if (ArrayBuffer.isView(v)) return { value: Buffer.from(v.buffer, v.byteOffset, v.byteLength) };
    return { value: Buffer.from(String(v)) };
  }
  return { value: typeof v === 'string' ? v : String(v) };
}

const taksirUkuran = (v) => (v == null ? 4 : Buffer.isBuffer(v) ? v.length : String(v).length * 2 + 4);

// ---------- Koneksi ----------
const sumber = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'bigint', // NIK 16 digit melebihi batas aman angka JavaScript
});

const tujuan = await mysql.createConnection({
  ...(process.env.DB_SOCKET
    ? { socketPath: process.env.DB_SOCKET }
    : { host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306) }),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true,
  timezone: 'Z',
});
await tujuan.query("SET time_zone = '+00:00'");

// ---------- Daftar tabel ----------
const [tabelTujuanRows] = await tujuan.query(
  "SELECT table_name AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY table_name",
);
const tabelTujuan = new Set(tabelTujuanRows.map((r) => r.n));
const sumberTabelRes = await sumber.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE 'libsql_%' ORDER BY name",
);
const tabelSumber = sumberTabelRes.rows.map((r) => String(r.name));

let daftar = tabelSumber.filter((t) => tabelTujuan.has(t));
if (ONLY.length) daftar = daftar.filter((t) => ONLY.includes(t));
const tidakAdaDiTujuan = tabelSumber.filter((t) => !tabelTujuan.has(t));

log(`${DRY ? '[DRY-RUN] ' : ''}Tabel diproses: ${daftar.length} dari ${tabelSumber.length} tabel sumber.`);
if (tidakAdaDiTujuan.length) {
  log(`PERINGATAN: tabel sumber yang TIDAK ada di MariaDB (tidak dipindah): ${tidakAdaDiTujuan.join(', ')}`);
  catat(`Tabel sumber tanpa pasangan di MariaDB: ${tidakAdaDiTujuan.join(', ')}`);
}

const ringkasan = [];

for (const tabel of daftar) {
  // Metadata kolom tujuan
  const [kolTujuan] = await tujuan.query(
    `SELECT column_name AS name, data_type, is_nullable, column_default, extra
       FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position`,
    [tabel],
  );
  const meta = new Map(kolTujuan.map((c) => [c.name, c]));
  const [pkRows] = await tujuan.query(`SHOW KEYS FROM ${q(tabel)} WHERE Key_name = 'PRIMARY'`);
  const pk = pkRows.sort((a, b) => a.Seq_in_index - b.Seq_in_index).map((r) => r.Column_name);

  // Kolom sumber
  const infoSumber = await sumber.execute(`PRAGMA table_info(${q(tabel).replace(/`/g, '"')})`);
  const kolSumber = infoSumber.rows.map((r) => String(r.name));
  const kolom = kolSumber.filter((c) => meta.has(c));
  const hilang = kolSumber.filter((c) => !meta.has(c));
  if (hilang.length) {
    log(`  PERINGATAN ${tabel}: kolom sumber tanpa pasangan di MariaDB (DATA TIDAK DIPINDAH): ${hilang.join(', ')}`);
    catat(`[${tabel}] kolom sumber tanpa pasangan: ${hilang.join(', ')}`);
  }

  const cnt = await sumber.execute(`SELECT COUNT(*) AS n FROM ${q(tabel).replace(/`/g, '"')}`);
  const nSumber = Number(cnt.rows[0].n);
  const [[sebelum]] = await tujuan.query(`SELECT COUNT(*) AS n FROM ${q(tabel)}`);
  const nSebelum = Number(sebelum.n);

  const kolomUpdate = kolom.filter((c) => !String(meta.get(c).extra).includes('auto_increment') && !pk.includes(c));
  const sqlInsert =
    `INSERT INTO ${q(tabel)} (${kolom.map(q).join(', ')}) VALUES ?` +
    (kolomUpdate.length
      ? ` ON DUPLICATE KEY UPDATE ${kolomUpdate.map((c) => `${q(c)} = VALUES(${q(c)})`).join(', ')}`
      : '');
  const sqlSatu = sqlInsert.replace('VALUES ?', `VALUES (${kolom.map(() => '?').join(', ')})`);

  let ditulis = 0, dilewati = 0, gagal = 0, diubah = 0;
  let buffer = [], bufferPk = [], bufferByte = 0;

  const idBaris = (row) => (pk.length ? pk.map((c) => `${c}=${row[c] == null ? 'NULL' : String(row[c]).slice(0, 60)}`).join(',') : '?');

  async function kosongkan() {
    if (!buffer.length) return;
    const baris = buffer, pks = bufferPk;
    buffer = []; bufferPk = []; bufferByte = 0;
    if (DRY) { ditulis += baris.length; return; }
    try {
      await tujuan.query(sqlInsert, [baris]);
      ditulis += baris.length;
    } catch {
      // Isolasi baris bermasalah satu per satu
      for (let i = 0; i < baris.length; i++) {
        try {
          await tujuan.query(sqlSatu, baris[i]);
          ditulis++;
        } catch (e) {
          gagal++;
          const kol = /column ['`]?([A-Za-z0-9_]+)['`]?/i.exec(e.sqlMessage ?? '');
          catat(`[${tabel}] GAGAL ${pks[i]} -> ${e.code ?? 'ERROR'}${kol ? ' kolom=' + kol[1] : ''}`);
        }
      }
    }
  }

  let lastRid = 0n;
  for (;;) {
    const hal = await sumber.execute({
      sql: `SELECT rowid AS __rid, * FROM ${q(tabel).replace(/`/g, '"')} WHERE rowid > ? ORDER BY rowid LIMIT ${PAGE}`,
      args: [lastRid],
    });
    if (!hal.rows.length) break;
    for (const row of hal.rows) {
      lastRid = BigInt(row.__rid);
      const nilai = [];
      let lewati = false;
      let berubah = false;
      for (const c of kolom) {
        const m = meta.get(c);
        const hasil = normalisasi(row[c], m);
        let v = hasil.value ?? null;
        if (hasil.error) {
          const mentah = T_DATE.has(m.data_type) || T_DT.has(m.data_type) ? ` nilai="${String(row[c]).slice(0, 40)}"` : '';
          if (m.is_nullable === 'NO') {
            catat(`[${tabel}] DILEWATI ${idBaris(row)} -> kolom ${c} wajib diisi tetapi ${hasil.error}${mentah}`);
            lewati = true;
            break;
          }
          catat(`[${tabel}] DIUBAH ke NULL ${idBaris(row)} -> kolom ${c}: ${hasil.error}${mentah}`);
          berubah = true;
          v = null;
        } else if (v === null && m.is_nullable === 'NO' && m.column_default == null && !String(m.extra).includes('auto_increment')) {
          catat(`[${tabel}] DILEWATI ${idBaris(row)} -> kolom ${c} wajib diisi tetapi kosong`);
          lewati = true;
          break;
        } else if (v === null && m.is_nullable === 'NO' && T_DT.has(m.data_type)) {
          v = new Date().toISOString().slice(0, 19).replace('T', ' '); // kolom waktu wajib: pakai waktu sekarang (UTC)
        }
        nilai.push(v);
      }
      if (lewati) { dilewati++; continue; }
      if (berubah) diubah++;
      buffer.push(nilai);
      bufferPk.push(idBaris(row));
      bufferByte += nilai.reduce((a, x) => a + taksirUkuran(x), 0);
      if (buffer.length >= CHUNK_ROWS || bufferByte >= CHUNK_BYTES) await kosongkan();
    }
  }
  await kosongkan();

  const [[sesudah]] = await tujuan.query(`SELECT COUNT(*) AS n FROM ${q(tabel)}`);
  const nSesudah = Number(sesudah.n);
  const harapan = nSumber - dilewati - gagal;
  let status;
  if (DRY) status = '-';
  else if (gagal > 0) status = 'GAGAL';
  else if (nSebelum === 0) status = nSesudah === harapan ? 'OK' : 'BEDA';
  else status = nSesudah >= harapan ? 'OK*' : 'BEDA';
  ringkasan.push({ tabel, sumber: nSumber, ditulis, dilewati, gagal, diubah, sebelum: nSebelum, sesudah: nSesudah, status });
  log(`  ${tabel.padEnd(36)} sumber=${String(nSumber).padStart(6)}  ditulis=${String(ditulis).padStart(6)}  dilewati=${dilewati}  gagal=${gagal}  diubah=${diubah}  tujuan=${nSesudah}  ${status}`);
}

// ---------- Laporan ----------
mkdirSync('data-export', { recursive: true });
const teks = [
  `Laporan migrasi Turso -> MariaDB (${DRY ? 'DRY-RUN' : 'TULIS'}) ${new Date().toISOString()}`,
  '',
  'tabel\tsumber\tditulis\tdilewati\tgagal\tdiubah\ttujuan_sebelum\ttujuan_sesudah\tstatus',
  ...ringkasan.map((r) => [r.tabel, r.sumber, r.ditulis, r.dilewati, r.gagal, r.diubah, r.sebelum, r.sesudah, r.status].join('\t')),
  '',
  `Catatan (${laporan.length}):`,
  ...laporan,
].join('\n');
writeFileSync('data-export/migrasi_laporan.txt', teks, 'utf8');

const bermasalah = ringkasan.filter((r) => r.status === 'BEDA' || r.gagal > 0);
const perhatian = ringkasan.filter((r) => r.dilewati > 0 || r.diubah > 0);
log('');
log(`Laporan: data-export/migrasi_laporan.txt (${laporan.length} catatan)`);
if (perhatian.length) log(`Perhatian: ${perhatian.length} tabel punya baris dilewati/diubah. Periksa laporan.`);
if (bermasalah.length) {
  log(`GAGAL/BEDA pada: ${bermasalah.map((r) => r.tabel).join(', ')}`);
  process.exitCode = 1;
} else {
  log(DRY ? 'Dry-run selesai. Tidak ada yang ditulis.' : 'Selesai. Jumlah baris sesuai.');
}

await tujuan.end();
sumber.close();
