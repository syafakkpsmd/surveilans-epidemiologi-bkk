// scripts/migrate/pg-buat-skema.mjs
// Membuat berkas skema PostgreSQL (schema/postgres/*.sql) dari STRUKTUR MariaDB yang sedang terpasang,
// dengan tipe asli Supabase (schema-dump/supabase_schema.json) dipakai bila kolomnya berasal dari Supabase.
//
// Jalankan di komputer yang bisa menjangkau MariaDB lokal (yang sudah berisi skema 01..06):
//   node --env-file=.env.local scripts/migrate/pg-buat-skema.mjs
//
// Hasil (SUDAH ada di repo; jalankan ulang hanya bila skema MariaDB berubah):
//   schema/postgres/01_tabel.sql          tabel + PK + UNIQUE + CHECK (tanpa indeks/FK, agar salin data cepat)
//   schema/postgres/02_fungsi_trigger.sql fungsi dan trigger (diambil dari definisi PostgreSQL ASLI Supabase)
//   schema/postgres/03_indeks_fk.sql      indeks dan foreign key (dipasang SETELAH data masuk)
//   schema/postgres/04_view.sql           42 view (definisi ASLI Supabase, diurutkan menurut ketergantungan)
//
// Aturan pemetaan tipe ada di fungsi petaTipe() di bawah. Kolom yang berasal dari Supabase memakai tipe
// aslinya (uuid, timestamptz, numeric tanpa presisi, text[], jsonb) supaya view/fungsi asli berjalan apa adanya.
import mysql from 'mysql2/promise';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

for (const k of ['DB_USER', 'DB_NAME']) if (!process.env[k]) { console.error(`Variabel ${k} belum diisi.`); process.exit(1); }

const KELUAR = 'schema/postgres';
const TABEL_DUMMY_SUPABASE = new Set(['hiv_data', 'tb_data']); // tabel Turso bernama sama; tipe dump TIDAK dipakai
const VIEW_DIBUANG = new Set(['view_hiv_mingguan', 'view_tb_mingguan']); // bergantung pada tabel dummy Supabase

const dump = JSON.parse(readFileSync('schema-dump/supabase_schema.json', 'utf8'));
const namaViewDump = new Set(dump.view.map((v) => v.table_name));
const kolomDump = new Map(); // "tabel.kolom" -> baris dump
for (const k of dump.kolom) if (!namaViewDump.has(k.table_name) && !TABEL_DUMMY_SUPABASE.has(k.table_name)) kolomDump.set(`${k.table_name}.${k.column_name}`, k);

const c = await mysql.createConnection({
  ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306) }),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4_unicode_ci',
});
const [[{ db }]] = await c.query('SELECT DATABASE() db');
const q = async (sql, a = []) => (await c.query(sql, a))[0];

const tabel = (await q(`SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`, [db])).map((r) => r.n);
const kolom = await q(`SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d, COLUMN_TYPE ct, IS_NULLABLE nl, COLUMN_DEFAULT df, EXTRA ex,
  CHARACTER_MAXIMUM_LENGTH len, NUMERIC_PRECISION np, NUMERIC_SCALE ns, DATETIME_PRECISION dp
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, ORDINAL_POSITION`, [db]);
const idx = await q(`SELECT TABLE_NAME t, INDEX_NAME i, NON_UNIQUE nu, SEQ_IN_INDEX s, COLUMN_NAME c, SUB_PART sp
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, [db]);
const fk = await q(`SELECT k.CONSTRAINT_NAME n, k.TABLE_NAME t, k.COLUMN_NAME c, k.REFERENCED_TABLE_NAME rt, k.REFERENCED_COLUMN_NAME rc,
  r.DELETE_RULE dr, r.UPDATE_RULE ur, k.ORDINAL_POSITION o
  FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
    ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME
  WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`, [db]);
const cek = await q(`SELECT cc.TABLE_NAME t, cc.CONSTRAINT_NAME n, cc.CHECK_CLAUSE cl FROM information_schema.CHECK_CONSTRAINTS cc
  WHERE cc.CONSTRAINT_SCHEMA=? ORDER BY cc.TABLE_NAME, cc.CONSTRAINT_NAME`, [db]);
await c.end();

const qi = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const ringkas = (nama) => {
  if (nama.length <= 60) return nama;
  return nama.slice(0, 51) + '_' + createHash('md5').update(nama).digest('hex').slice(0, 8);
};
const pakaiNama = new Set(); // nama indeks/constraint PostgreSQL bersifat global per skema
function namaUnik(tabelNama, nama) {
  let n = nama.toLowerCase().startsWith(tabelNama.toLowerCase()) ? nama : `${tabelNama}_${nama}`;
  n = ringkas(n);
  let i = 2; const dasar = n;
  while (pakaiNama.has(n.toLowerCase())) n = ringkas(`${dasar}_${i++}`);
  pakaiNama.add(n.toLowerCase());
  return n;
}

// --- Pemetaan tipe ---
function tipeDump(k) {
  const u = k.udt_name;
  switch (u) {
    case 'text': return 'text';
    case 'int4': return 'integer';
    case 'int8': return 'bigint';
    case 'int2': return 'smallint';
    case 'numeric': return k.numeric_precision ? `numeric(${k.numeric_precision},${k.numeric_scale ?? 0})` : 'numeric';
    case 'timestamptz': return 'timestamptz';
    case 'uuid': return 'uuid';
    case 'bool': return 'boolean';
    case 'date': return 'date';
    case 'jsonb': return 'jsonb';
    case 'float8': return 'double precision';
    case 'time': return 'time';
    case '_text': return 'text[]';
    case 'varchar': return k.character_maximum_length ? `varchar(${k.character_maximum_length})` : 'varchar';
    default: throw new Error(`Tipe dump belum dipetakan: ${u}`);
  }
}
function petaTipe(k, jsonKol) {
  const d = k.d.toLowerCase();
  const adaJson = jsonKol.has(`${k.t}.${k.c}`);
  if (adaJson) return 'jsonb';
  if (k.ct.toLowerCase() === 'tinyint(1)') return 'boolean';
  if (k.ct.toLowerCase().includes('unsigned') && d !== 'bigint') {
    // tidak ada kolom unsigned di skema saat ini; jaga-jaga agar tidak diam-diam meluap
    return d === 'int' ? 'bigint' : d === 'smallint' ? 'integer' : 'bigint';
  }
  switch (d) {
    case 'varchar': return `varchar(${k.len})`;
    case 'char': return k.len === 36 ? 'uuid' : `char(${k.len})`;
    case 'text': case 'longtext': case 'mediumtext': case 'tinytext': return 'text';
    case 'int': case 'mediumint': return 'integer';
    case 'smallint': return 'smallint';
    case 'tinyint': return 'smallint';
    case 'bigint': return 'bigint';
    case 'decimal': return `numeric(${k.np},${k.ns})`;
    case 'double': return 'double precision';
    case 'float': return 'real';
    case 'datetime': case 'timestamp': return 'timestamptz';
    case 'date': return 'date';
    case 'time': return 'time';
    case 'longblob': case 'blob': case 'mediumblob': case 'tinyblob': return 'bytea';
    default: throw new Error(`Tipe MariaDB belum dipetakan: ${k.t}.${k.c} ${k.ct}`);
  }
}
function petaDefault(k, tipe) {
  if (k.df === null || k.df === undefined) return null;
  let v = String(k.df);
  if (/^(current_timestamp|utc_timestamp|now|localtimestamp)(\(\d*\))?$/i.test(v)) return 'now()';
  if (/^uuid\(\)$/i.test(v)) return 'gen_random_uuid()';
  if (/^NULL$/i.test(v)) return null;
  if (tipe === 'boolean') return v === '1' || /^true$/i.test(v) ? 'true' : 'false';
  if (/^'.*'$/s.test(v)) {
    const isi = v.slice(1, -1).replace(/\\'/g, "''").replace(/''/g, "''");
    if (/^(integer|bigint|smallint|numeric|double|real)/.test(tipe)) return isi;
    return `'${isi.replace(/\\\\/g, '\\')}'`;
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return v;
  throw new Error(`Default belum dipetakan: ${k.t}.${k.c} = ${v}`);
}
function petaDefaultDump(kd) {
  let v = kd.column_default;
  if (v === null || v === undefined) return null;
  if (/^nextval\(/i.test(v)) return null; // jadi IDENTITY
  if (/uuid_generate_v4\(\)|gen_random_uuid\(\)/i.test(v)) return 'gen_random_uuid()';
  if (/^timezone\('utc'::text, now\(\)\)$/i.test(v)) return 'now()';
  return v;
}

// --- Himpunan kolom JSON (CHECK JSON_VALID) ---
const jsonKol = new Set();
for (const r of cek) for (const m of String(r.cl).matchAll(/json_valid\(\s*`?([A-Za-z0-9_]+)`?\s*\)/gi)) jsonKol.add(`${r.t}.${m[1]}`);

// --- 01_tabel.sql ---
const out1 = [`-- schema/postgres/01_tabel.sql  (DIBUAT OTOMATIS oleh scripts/migrate/pg-buat-skema.mjs; jangan sunting tangan)`,
  `-- Tabel + PRIMARY KEY + UNIQUE + CHECK. Indeks dan FOREIGN KEY ada di 03_indeks_fk.sql (dipasang setelah data masuk).`,
  `-- PostgreSQL 13+ (gen_random_uuid() bawaan). Aman dijalankan ulang (IF NOT EXISTS).`, ''];
const identitas = []; // [tabel, kolom]
const berUpdateOtomatis = []; // [tabel, kolom]
const petaKolom = {}; // untuk dokumentasi/verifikasi: tabel -> kolom -> tipe
for (const t of tabel) {
  const ks = kolom.filter((k) => k.t === t);
  const pk = idx.filter((i) => i.t === t && i.i === 'PRIMARY').map((i) => i.c);
  const baris = [];
  petaKolom[t] = {};
  for (const k of ks) {
    const kd = kolomDump.get(`${t}.${k.c}`);
    const auto = /auto_increment/i.test(k.ex);
    let tipe = kd ? tipeDump(kd) : petaTipe(k, jsonKol);
    if (/on update/i.test(k.ex)) berUpdateOtomatis.push([t, k.c]);
    let sql = `  ${qi(k.c)} ${tipe}`;
    if (auto) { sql += ' GENERATED BY DEFAULT AS IDENTITY'; identitas.push([t, k.c]); }
    else {
      const df = kd ? petaDefaultDump(kd) : petaDefault({ ...k, t }, tipe);
      if (df !== null) sql += ` DEFAULT ${df}`;
    }
    const nullable = kd ? kd.is_nullable === 'YES' : k.nl === 'YES';
    if (!nullable && !pk.includes(k.c)) sql += ' NOT NULL';
    baris.push(sql);
    petaKolom[t][k.c] = tipe;
  }
  if (pk.length) baris.push(`  PRIMARY KEY (${pk.map(qi).join(', ')})`);
  // UNIQUE (nama indeks global dibuat unik)
  const unik = new Map();
  for (const i of idx.filter((x) => x.t === t && x.i !== 'PRIMARY' && x.nu === 0)) {
    if (!unik.has(i.i)) unik.set(i.i, []);
    unik.get(i.i).push(i.c);
  }
  for (const [nama, cols] of unik) baris.push(`  CONSTRAINT ${qi(namaUnik(t, nama))} UNIQUE (${cols.map(qi).join(', ')})`);
  for (const r of cek.filter((x) => x.t === t)) {
    if (/json_valid/i.test(r.cl)) continue; // jsonb sudah menjamin JSON valid
    baris.push(`  CONSTRAINT ${qi(namaUnik(t, r.n))} CHECK (${String(r.cl).replace(/`/g, '"')})`);
  }
  out1.push(`CREATE TABLE IF NOT EXISTS ${qi(t)} (\n${baris.join(',\n')}\n);`, '');
}

// --- 03_indeks_fk.sql ---
const out3 = [`-- schema/postgres/03_indeks_fk.sql  (DIBUAT OTOMATIS; jangan sunting tangan)`,
  `-- Indeks non-unik dan FOREIGN KEY. Dipasang SETELAH data masuk. IF NOT EXISTS untuk indeks; FK dibungkus agar bisa diulang.`, ''];
for (const t of tabel) {
  const grup = new Map();
  for (const i of idx.filter((x) => x.t === t && x.i !== 'PRIMARY' && x.nu === 1)) {
    if (!grup.has(i.i)) grup.set(i.i, []);
    grup.get(i.i).push(i.c);
  }
  for (const [nama, cols] of grup) out3.push(`CREATE INDEX IF NOT EXISTS ${qi(namaUnik(t, nama))} ON ${qi(t)} (${cols.map(qi).join(', ')});`);
}
out3.push('');
const grupFk = new Map();
for (const r of fk) {
  const kunci = `${r.t}|${r.n}`;
  if (!grupFk.has(kunci)) grupFk.set(kunci, { ...r, cols: [], rcols: [] });
  grupFk.get(kunci).cols.push(r.c); grupFk.get(kunci).rcols.push(r.rc);
}
for (const f of grupFk.values()) {
  const nama = namaUnik(f.t, f.n);
  const aksi = (x) => (x === 'RESTRICT' || x === 'NO ACTION' ? '' : ` ${x}`);
  out3.push(`DO $$ BEGIN
  ALTER TABLE ${qi(f.t)} ADD CONSTRAINT ${qi(nama)} FOREIGN KEY (${f.cols.map(qi).join(', ')}) REFERENCES ${qi(f.rt)} (${f.rcols.map(qi).join(', ')})${f.dr === 'RESTRICT' || f.dr === 'NO ACTION' ? '' : ' ON DELETE ' + f.dr}${f.ur === 'RESTRICT' || f.ur === 'NO ACTION' ? '' : ' ON UPDATE ' + f.ur};
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
}
out3.push('');

// --- 02_fungsi_trigger.sql (definisi ASLI PostgreSQL dari dump) ---
const FUNGSI_DIPAKAI = ['epi_week_start', 'mmwr_week', 'hitung_indikator_anopheles', 'hitung_indikator_dbd', 'hitung_indikator_diare', 'hitung_indikator_tikus',
  'set_updated_at', 'set_updated_at_lpn', 'status_lapor_bulanan', 'status_lapor_mingguan'];
const out2 = [`-- schema/postgres/02_fungsi_trigger.sql  (DIBUAT OTOMATIS; definisi fungsi/trigger = ASLI Supabase/PostgreSQL)`,
  `-- Dikecualikan: is_admin() (RLS Supabase; otorisasi kini di server aplikasi). Dijalankan SETELAH 01_tabel.sql.`, ''];
for (const nama of FUNGSI_DIPAKAI) {
  const f = dump.fungsi.find((x) => x.proname === nama);
  if (!f) throw new Error(`Fungsi ${nama} tidak ada di dump`);
  out2.push(f.definisi.replace(/\r\n/g, '\n').replace(/public\./g, '').trim() + ';', '');
}
// fungsi pembaruan 'diubah_pada' untuk auth_kredensial (padanan ON UPDATE CURRENT_TIMESTAMP)
out2.push(`CREATE OR REPLACE FUNCTION set_diubah_pada() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN NEW.diubah_pada = now(); RETURN NEW; END; $f$;`, '');
for (const tr of dump.trigger) {
  const jenis = tr.event_manipulation;
  out2.push(`DROP TRIGGER IF EXISTS ${qi(tr.trigger_name)} ON ${qi(tr.event_object_table)};`,
    `CREATE TRIGGER ${qi(tr.trigger_name)} ${tr.action_timing} ${jenis} ON ${qi(tr.event_object_table)} FOR EACH ROW ${tr.action_statement};`, '');
}
if (berUpdateOtomatis.some(([t]) => t === 'auth_kredensial')) {
  out2.push(`DROP TRIGGER IF EXISTS trg_auth_kredensial_diubah ON auth_kredensial;`,
    `CREATE TRIGGER trg_auth_kredensial_diubah BEFORE UPDATE ON auth_kredensial FOR EACH ROW EXECUTE FUNCTION set_diubah_pada();`, '');
}
const ONUPDATE_DITANGANI = new Set(['kegiatan_pesawat', 'laporan_penyakit_nasional', 'auth_kredensial']);
for (const [t, kc] of berUpdateOtomatis) if (!ONUPDATE_DITANGANI.has(t)) throw new Error(`ON UPDATE belum ditangani: ${t}.${kc}`);

// --- 04_view.sql (urut menurut ketergantungan) ---
const views = dump.view.filter((v) => !VIEW_DIBUANG.has(v.table_name));
const nama = views.map((v) => v.table_name);
const dep = new Map(views.map((v) => [v.table_name, nama.filter((n) => n !== v.table_name && new RegExp(`\\b${n}\\b`).test(v.view_definition))]));
const urut = []; const sudah = new Set();
const kunjungi = (n, jalur = []) => {
  if (sudah.has(n)) return;
  if (jalur.includes(n)) throw new Error('Siklus view: ' + [...jalur, n].join(' -> '));
  for (const d of dep.get(n)) kunjungi(d, [...jalur, n]);
  sudah.add(n); urut.push(n);
};
nama.forEach((n) => kunjungi(n));
const out4 = [`-- schema/postgres/04_view.sql  (DIBUAT OTOMATIS; definisi view = ASLI Supabase, ${urut.length} view)`,
  `-- Dikecualikan: ${[...VIEW_DIBUANG].join(', ')} (bergantung pada tabel dummy Supabase yang dibuang). Dijalankan SETELAH 01 dan 03.`, ''];
for (const n of urut) {
  const v = views.find((x) => x.table_name === n);
  out4.push(`CREATE OR REPLACE VIEW ${qi(n)} AS\n${v.view_definition.replace(/\r\n/g, '\n').replace(/public\./g, '').trim().replace(/;$/, '')};`, '');
}

mkdirSync(KELUAR, { recursive: true });
writeFileSync(`${KELUAR}/01_tabel.sql`, out1.join('\n'));
writeFileSync(`${KELUAR}/02_fungsi_trigger.sql`, out2.join('\n'));
writeFileSync(`${KELUAR}/03_indeks_fk.sql`, out3.join('\n'));
writeFileSync(`${KELUAR}/04_view.sql`, out4.join('\n'));
// Daftar kolom identity + peta tipe dipakai skrip salin data (agar tidak menebak ulang).
writeFileSync(`${KELUAR}/_meta.json`, JSON.stringify({ identitas, tipe: petaKolom }, null, 1));
console.log(`Tabel ${tabel.length}, identity ${identitas.length}, indeks+FK -> 03, view ${urut.length}, fungsi ${FUNGSI_DIPAKAI.length + 1}.`);
console.log(`Ditulis ke ${KELUAR}/`);
