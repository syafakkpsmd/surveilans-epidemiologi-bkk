// scripts/migrate/mariadb-ke-postgres.mjs
// Menyalin SEMUA data dari MariaDB (sumber) ke PostgreSQL (tujuan), lalu memverifikasi.
//
// Prasyarat (sekali):
//   1. Skema PostgreSQL sudah ada:  node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs schema/postgres/01_tabel.sql
//                                   ... dst 02_fungsi_trigger.sql (03 dan 04 dipasang skrip ini SETELAH data masuk)
//   2. Env sumber  : DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME (atau DB_SOCKET)       <- MariaDB, seperti biasa
//      Env tujuan  : PG_HOST PG_PORT PG_USER PG_PASSWORD PG_DATABASE (atau PG_URL)       <- PostgreSQL
//
// Pemakaian:
//   node --env-file=.env.local scripts/migrate/mariadb-ke-postgres.mjs --dry-run         (baca + validasi, tidak menulis)
//   node --env-file=.env.local scripts/migrate/mariadb-ke-postgres.mjs --tabel=wilker_ref (satu/beberapa tabel, pisah koma)
//   node --env-file=.env.local scripts/migrate/mariadb-ke-postgres.mjs                    (semua tabel)
//   Opsi: --kosongkan  = TRUNCATE tabel tujuan dulu (tanpa ini: upsert menurut PK/UNIQUE, aman diulang)
//         --tanpa-indeks = jangan jalankan 03_indeks_fk.sql dan 04_view.sql di akhir
//
// Jaminan:
//   * Satu transaksi per tabel; nilai yang tidak bisa dikonversi menghentikan tabel itu (bukan dipotong diam-diam).
//   * Trigger tabel dimatikan selama salin (nilai historis tersalin apa adanya), lalu dihidupkan lagi.
//   * Kolom identity disetel ulang ke MAX(id)+1. Laporan: data-export/mariadb_ke_postgres_laporan.txt (tanpa isi data).
import mysql from 'mysql2/promise';
import pg from 'pg';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const KOSONG = argv.includes('--kosongkan');
const TANPA_INDEKS = argv.includes('--tanpa-indeks');
const SATU = (argv.find((a) => a.startsWith('--tabel=')) ?? '').slice(8).split(',').filter(Boolean);
const UKURAN_BATCH = 500;

for (const k of ['DB_USER', 'DB_NAME']) if (!process.env[k]) { console.error(`Variabel ${k} (sumber MariaDB) belum diisi.`); process.exit(1); }
if (!process.env.PG_URL && !(process.env.PG_USER && process.env.PG_DATABASE)) { console.error('Isi PG_URL atau PG_USER + PG_DATABASE (+ PG_HOST, PG_PORT, PG_PASSWORD).'); process.exit(1); }

const meta = JSON.parse(readFileSync('schema/postgres/_meta.json', 'utf8')); // { identitas:[[tabel,kolom]], tipe:{tabel:{kolom:tipePG}} }
const laporan = [];
const log = (s = '') => { console.log(s); laporan.push(s); };

const src = await mysql.createConnection({
  ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306) }),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci', dateStrings: true, decimalNumbers: false, supportBigNumbers: true, bigNumberStrings: true,
});
await src.query("SET time_zone = '+00:00'");
const dst = new pg.Client(process.env.PG_URL ? { connectionString: process.env.PG_URL } : {
  host: process.env.PG_HOST ?? '127.0.0.1', port: Number(process.env.PG_PORT ?? 5432), user: process.env.PG_USER,
  password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE,
});
await dst.connect();
await dst.query("SET TIME ZONE 'UTC'");

const qi = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const dbSrc = (await src.query('SELECT DATABASE() d'))[0][0].d;

// --- konversi nilai MariaDB -> parameter pg, menurut tipe kolom tujuan ---
class GalatNilai extends Error {}
function konversi(nilai, tipe) {
  if (nilai === null || nilai === undefined) return null;
  const t = tipe.toLowerCase();
  if (t === 'boolean') {
    if (nilai === 1 || nilai === '1' || nilai === true) return true;
    if (nilai === 0 || nilai === '0' || nilai === false) return false;
    throw new GalatNilai('boolean tidak dikenal');
  }
  if (t === 'bytea') return Buffer.isBuffer(nilai) ? nilai : Buffer.from(nilai);
  if (t === 'jsonb') {
    const s = Buffer.isBuffer(nilai) ? nilai.toString('utf8') : String(nilai);
    try { JSON.parse(s); } catch { throw new GalatNilai('JSON tidak valid'); }
    return s; // dikirim sebagai teks; kolom jsonb mengurai sendiri
  }
  if (t === 'text[]') {
    // Di MariaDB: LONGTEXT berisi array JSON. Di PostgreSQL asli: text[].
    const s = Buffer.isBuffer(nilai) ? nilai.toString('utf8') : String(nilai);
    let a;
    try { a = JSON.parse(s); } catch { throw new GalatNilai('array JSON tidak valid'); }
    if (!Array.isArray(a)) throw new GalatNilai('bukan array');
    return a.map((x) => (x === null ? null : String(x)));
  }
  if (t === 'uuid') {
    const s = String(nilai);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) throw new GalatNilai('format uuid salah');
    return s.toLowerCase();
  }
  if (t === 'timestamptz') {
    const s = String(nilai);
    if (s.startsWith('0000-00-00')) throw new GalatNilai('tanggal nol');
    return s.replace(' ', 'T') + 'Z'; // MariaDB menyimpan UTC (sesi diset +00:00)
  }
  if (t === 'date') {
    const s = String(nilai);
    if (s.startsWith('0000-00-00') || /-00$/.test(s)) throw new GalatNilai('tanggal nol/tidak valid');
    return s;
  }
  if (/^(integer|bigint|smallint)$/.test(t)) {
    const s = String(nilai);
    if (!/^-?\d+$/.test(s)) throw new GalatNilai('bukan bilangan bulat');
    return s;
  }
  if (t.startsWith('numeric') || t === 'double precision' || t === 'real') return String(nilai);
  if (typeof nilai === 'string' && nilai.includes('\u0000')) throw new GalatNilai('karakter NUL tidak diizinkan di PostgreSQL');
  return Buffer.isBuffer(nilai) ? nilai.toString('utf8') : nilai;
}

// --- urutan tabel (induk dulu) dari FK MariaDB ---
const [fkRows] = await src.query(`SELECT DISTINCT TABLE_NAME t, REFERENCED_TABLE_NAME r FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME <> REFERENCED_TABLE_NAME`, [dbSrc]);
const semua = Object.keys(meta.tipe);
const induk = new Map(semua.map((t) => [t, new Set()]));
for (const r of fkRows) induk.get(r.t)?.add(r.r);
const urut = []; const sudah = new Set();
const kunjungi = (t) => { if (sudah.has(t)) return; sudah.add(t); for (const p of induk.get(t) ?? []) kunjungi(p); urut.push(t); };
semua.forEach(kunjungi);
const target = SATU.length ? urut.filter((t) => SATU.includes(t)) : urut;
for (const t of SATU) if (!semua.includes(t)) { console.error(`Tabel tidak dikenal: ${t}`); process.exit(1); }

const ringkasan = { ok: 0, gagal: 0, baris: 0 };
const bandingkan = [];
log(`Migrasi MariaDB (${dbSrc}) -> PostgreSQL ${DRY ? '[DRY-RUN]' : ''}  ${new Date().toISOString()}`);
log(`Tabel: ${target.length}`);

for (const t of target) {
  const tipeKol = meta.tipe[t];
  const kolom = Object.keys(tipeKol);
  const [[{ n: jumlahSumber }]] = await src.query(`SELECT COUNT(*) n FROM ${qi(t).replace(/"/g, '`')}`);
  const pk = (await src.query(`SELECT COLUMN_NAME c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX`, [dbSrc, t]))[0].map((r) => r.c);
  const orderBy = pk.length ? ` ORDER BY ${pk.map((c) => '`' + c + '`').join(',')}` : '';
  const masalah = [];
  let masuk = 0;

  const sqlInsertDasar = `INSERT INTO ${qi(t)} (${kolom.map(qi).join(',')}) OVERRIDING SYSTEM VALUE VALUES `;
  const sisip = (n) => {
    const bagian = [];
    for (let r = 0; r < n; r++) bagian.push('(' + kolom.map((c, i) => {
      const tp = tipeKol[c].toLowerCase();
      const ph = `$${r * kolom.length + i + 1}`;
      return tp === 'jsonb' ? `${ph}::jsonb` : tp === 'text[]' ? `${ph}::text[]` : ph;
    }).join(',') + ')');
    return bagian.join(',');
  };
  // Upsert menurut PK agar bisa diulang. Tanpa PK: tabel dikosongkan dulu lalu INSERT (lihat di bawah).
  const konflik = pk.length
    ? ` ON CONFLICT (${pk.map(qi).join(',')}) DO ${kolom.filter((c) => !pk.includes(c)).length ? 'UPDATE SET ' + kolom.filter((c) => !pk.includes(c)).map((c) => `${qi(c)}=EXCLUDED.${qi(c)}`).join(',') : 'NOTHING'}`
    : '';

  try {
    if (!DRY) {
      await dst.query('BEGIN');
      await dst.query(`ALTER TABLE ${qi(t)} DISABLE TRIGGER USER`);
      if (KOSONG) await dst.query(`TRUNCATE ${qi(t)} CASCADE`);
      else if (!pk.length) await dst.query(`TRUNCATE ${qi(t)}`); // tanpa PK tidak bisa upsert: kosongkan agar tidak ganda saat diulang
    }
    let offset = 0;
    while (offset < jumlahSumber || (jumlahSumber === 0 && offset === 0)) {
      if (jumlahSumber === 0) break;
      const [baris] = await src.query(`SELECT ${kolom.map((c) => '`' + c + '`').join(',')} FROM \`${t}\`${orderBy} LIMIT ${UKURAN_BATCH} OFFSET ${offset}`);
      offset += baris.length;
      if (!baris.length) break;
      const nilaiBatch = [];
      const bersih = [];
      baris.forEach((b, idxBaris) => {
        try {
          const v = kolom.map((c) => {
            try { return konversi(b[c], tipeKol[c]); }
            catch (e) { if (e instanceof GalatNilai) throw new GalatNilai(`${c}: ${e.message}`); throw e; }
          });
          bersih.push(v);
        } catch (e) {
          if (!(e instanceof GalatNilai)) throw e;
          const idRow = pk.length ? pk.map((c) => `${c}=${b[c]}`).join(',') : `baris#${offset - baris.length + idxBaris + 1}`;
          masalah.push(`${idRow}: ${e.message}`);
        }
      });
      for (let i = 0; i < bersih.length; i += Math.floor(60000 / Math.max(kolom.length, 1)) || 1) {
        const potong = bersih.slice(i, i + (Math.floor(60000 / Math.max(kolom.length, 1)) || 1));
        nilaiBatch.push(potong);
      }
      for (const potong of nilaiBatch) {
        if (!potong.length) continue;
        if (!DRY) await dst.query(sqlInsertDasar + sisip(potong.length) + konflik, potong.flat());
        masuk += potong.length;
      }
    }
    if (masalah.length) throw new Error(`${masalah.length} baris bermasalah (lihat daftar)`);
    if (!DRY) await dst.query('COMMIT');
    if (!DRY) await dst.query(`ALTER TABLE ${qi(t)} ENABLE TRIGGER USER`);
    log(`  OK     ${t.padEnd(42)} sumber ${String(jumlahSumber).padStart(7)}  masuk ${String(masuk).padStart(7)}`);
    ringkasan.ok++; ringkasan.baris += masuk;
    bandingkan.push(t);
  } catch (e) {
    if (!DRY) { await dst.query('ROLLBACK').catch(() => {}); await dst.query(`ALTER TABLE ${qi(t)} ENABLE TRIGGER USER`).catch(() => {}); }
    ringkasan.gagal++;
    log(`  GAGAL  ${t.padEnd(42)} ${e.message}`);
    for (const m of masalah.slice(0, 25)) log(`           - ${m}`);
    if (masalah.length > 25) log(`           ... dan ${masalah.length - 25} lainnya`);
  }
}

// --- identity -> MAX(id)+1 ---
if (!DRY && !SATU.length) {
  for (const [t, c] of meta.identitas) {
    await dst.query(`SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${qi(c)}) FROM ${qi(t)}), 0) + 1, false)`, [qi(t), c]);
  }
  log(`Identity disetel ulang: ${meta.identitas.length} kolom.`);
}

// --- indeks, FK, view ---
if (!DRY && !SATU.length && !TANPA_INDEKS && ringkasan.gagal === 0) {
  for (const f of ['03_indeks_fk', '04_view']) {
    try { await dst.query(readFileSync(`schema/postgres/${f}.sql`, 'utf8')); log(`Dipasang: schema/postgres/${f}.sql`); }
    catch (e) { ringkasan.gagal++; log(`GAGAL memasang ${f}.sql: ${e.message}`); }
  }
}

// --- verifikasi: jumlah baris + sidik per kolom ---
if (!DRY && bandingkan.length) {
  log('\nVerifikasi (jumlah baris dan jumlah/min/maks per kolom angka dan tanggal):');
  let beda = 0;
  for (const t of bandingkan) {
    const tipeKol = meta.tipe[t];
    const [[{ n: ns }]] = await src.query(`SELECT COUNT(*) n FROM \`${t}\``);
    const nd = Number((await dst.query(`SELECT COUNT(*)::int n FROM ${qi(t)}`)).rows[0].n);
    if (Number(ns) !== nd) { beda++; log(`  BEDA  ${t}: baris sumber ${ns}, tujuan ${nd}`); continue; }
    for (const [c, tp] of Object.entries(tipeKol)) {
      const l = tp.toLowerCase();
      if (/^(integer|bigint|smallint)$/.test(l) || l.startsWith('numeric')) {
        const [[a]] = await src.query(`SELECT CAST(SUM(\`${c}\`) AS CHAR) s, CAST(MIN(\`${c}\`) AS CHAR) lo, CAST(MAX(\`${c}\`) AS CHAR) hi, COUNT(\`${c}\`) k FROM \`${t}\``);
        const b = (await dst.query(`SELECT SUM(${qi(c)})::text s, MIN(${qi(c)})::text lo, MAX(${qi(c)})::text hi, COUNT(${qi(c)})::int k FROM ${qi(t)}`)).rows[0];
        const sama = (x, y) => (x === null && y === null) || (x !== null && y !== null && Number(x) === Number(y));
        if (!sama(a.s, b.s) || !sama(a.lo, b.lo) || !sama(a.hi, b.hi) || Number(a.k) !== Number(b.k)) { beda++; log(`  BEDA  ${t}.${c}: sumber ${JSON.stringify(a)} tujuan ${JSON.stringify(b)}`); }
      } else if (l === 'date' || l === 'timestamptz') {
        const [[a]] = await src.query(`SELECT CAST(MIN(\`${c}\`) AS CHAR) lo, CAST(MAX(\`${c}\`) AS CHAR) hi, COUNT(\`${c}\`) k FROM \`${t}\``);
        const fmt = l === 'date' ? `to_char(%s,'YYYY-MM-DD')` : `to_char(%s AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS')`;
        const b = (await dst.query(`SELECT ${fmt.replace('%s', `MIN(${qi(c)})`)} lo, ${fmt.replace('%s', `MAX(${qi(c)})`)} hi, COUNT(${qi(c)})::int k FROM ${qi(t)}`)).rows[0];
        const potong = (x) => (x === null ? null : String(x).slice(0, 19));
        if (potong(a.lo) !== potong(b.lo) || potong(a.hi) !== potong(b.hi) || Number(a.k) !== Number(b.k)) { beda++; log(`  BEDA  ${t}.${c}: sumber ${JSON.stringify(a)} tujuan ${JSON.stringify(b)}`); }
      } else if (/^(text|varchar|char)/.test(l) && !l.endsWith('[]')) {
        // sidik panjang teks (karakter) dan jumlah non-NULL
        const [[a]] = await src.query(`SELECT COALESCE(SUM(CHAR_LENGTH(\`${c}\`)),0) p, COUNT(\`${c}\`) k FROM \`${t}\``);
        const b = (await dst.query(`SELECT COALESCE(SUM(CHAR_LENGTH(${qi(c)})),0)::text p, COUNT(${qi(c)})::int k FROM ${qi(t)}`)).rows[0];
        if (String(a.p) !== String(b.p) || Number(a.k) !== Number(b.k)) { beda++; log(`  BEDA  ${t}.${c}: panjang teks sumber ${a.p}/${a.k} tujuan ${b.p}/${b.k}`); }
      }
    }
  }
  log(beda ? `Verifikasi: ${beda} perbedaan.` : 'Verifikasi: tidak ada perbedaan.');
  if (beda) ringkasan.gagal++;
}

log(`\nRingkasan: ${ringkasan.ok} tabel OK, ${ringkasan.gagal} gagal/beda, ${ringkasan.baris} baris dipindah.`);
mkdirSync('data-export', { recursive: true });
writeFileSync('data-export/mariadb_ke_postgres_laporan.txt', laporan.join('\n') + '\n');
await src.end(); await dst.end();
process.exit(ringkasan.gagal ? 1 : 0);
