// scripts/migrate/pg-seed-uji.mjs
// HANYA UNTUK UJI: mengisi MariaDB LOKAL KOSONG dengan data sintetis (semua tabel, semua tipe) agar
// mariadb-ke-postgres.mjs dan perbandingan view bisa diuji tanpa data pasien. JANGAN dijalankan di database berisi data asli.
//   node --env-file=.env.local scripts/migrate/pg-seed-uji.mjs [jumlah_baris=40]
import mysql from 'mysql2/promise';
const N = Number(process.argv[2] ?? 40);
const c = await mysql.createConnection({ host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4_unicode_ci', dateStrings: true });
await c.query("SET time_zone='+00:00'");
const [[{ d: db }]] = await c.query('SELECT DATABASE() d');
const [[{ n: ada }]] = await c.query(`SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='profiles'`, [db]);
if (!ada) throw new Error('Skema belum terpasang.');
const [[{ n: isi }]] = await c.query('SELECT COUNT(*) n FROM profiles');
if (isi > 0 && !process.argv.includes('--paksa')) throw new Error('profiles tidak kosong: ini bukan database uji. Dibatalkan.');
await c.query('SET @lewati_trigger_hitung = 1'); // trigger hitung MariaDB dilewati; nilai kolom diisi acak
const tabel = (await c.query(`SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'`, [db]))[0].map((r) => r.n);
const kol = (await c.query(`SELECT TABLE_NAME t,COLUMN_NAME c,DATA_TYPE d,COLUMN_TYPE ct,IS_NULLABLE nl,CHARACTER_MAXIMUM_LENGTH len,NUMERIC_PRECISION np,NUMERIC_SCALE ns,EXTRA ex,COLUMN_DEFAULT df FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION`, [db]))[0];
const st = (await c.query(`SELECT TABLE_NAME t,INDEX_NAME i,NON_UNIQUE nu,COLUMN_NAME c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=?`, [db]))[0];
const fk = (await c.query(`SELECT TABLE_NAME t,COLUMN_NAME c,REFERENCED_TABLE_NAME rt,REFERENCED_COLUMN_NAME rc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL`, [db]))[0];
const cek = (await c.query(`SELECT TABLE_NAME t,CHECK_CLAUSE cl FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?`, [db]))[0];
const induk = new Map(tabel.map((t) => [t, new Set(fk.filter((f) => f.t === t && f.rt !== t).map((f) => f.rt))]));
const urut = []; const s = new Set(); const v = (t) => { if (s.has(t)) return; s.add(t); for (const p of induk.get(t)) v(p); urut.push(t); }; tabel.forEach(v);
const acak = (n) => Math.floor(Math.random() * n);
const pilih = (a) => a[acak(a.length)];
const TEKS = ['Samarinda', 'APT Pranoto', 'Lhoktuan', 'Kapal KM Satu', 'Ünïcödé ñ', 'emoji 😀 ok', 'Jl. Contoh No. 5', 'Pelabuhan Samarinda'];
const hex = (n) => [...Array(n)].map(() => acak(16).toString(16)).join('');
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
const tgl = () => `${2025 + acak(2)}-${String(1 + acak(12)).padStart(2, '0')}-${String(1 + acak(28)).padStart(2, '0')}`;
const jsonKol = new Set(cek.filter((r) => /json_valid/i.test(r.cl)).flatMap((r) => [...r.cl.matchAll(/json_valid\(`?(\w+)`?\)/gi)].map((m) => `${r.t}.${m[1]}`)));
const arrayKol = new Set(['wilker_ref.sub_lokasi', 'pengawasan_klinik.item_bermasalah']);
const kunciAda = {}; // tabel.kolom -> nilai yang sudah ada (untuk FK)
let hitung = 0;
for (const t of urut) {
  const ks = kol.filter((k) => k.t === t);
  const unikKol = new Set(st.filter((x) => x.t === t && x.nu === 0).map((x) => x.c));
  const cekT = cek.filter((r) => r.t === t && !/json_valid/i.test(r.cl));
  const [[{ n: sudah }]] = await c.query(`SELECT COUNT(*) n FROM \`${t}\``);
  let masuk = 0;
  for (let i = 0; i < N && (sudah === 0 || t === 'wilker_ref' ? true : false); i++) {
    const nilai = {};
    for (const k of ks) {
      if (/auto_increment/i.test(k.ex)) continue;
      const kunciKol = `${t}.${k.c}`;
      const f = fk.find((x) => x.t === t && x.c === k.c);
      let val;
      const boleh = k.nl === 'YES' && !unikKol.has(k.c) && Math.random() < 0.2;
      if (boleh) { nilai[k.c] = null; continue; }
      if (f) {
        const pool = kunciAda[`${f.rt}.${f.rc}`];
        if (!pool?.length) { if (k.nl === 'YES') { nilai[k.c] = null; continue; } throw new Error(`Induk kosong untuk ${t}.${k.c}`); }
        nilai[k.c] = pilih(pool); continue;
      }
      const dalamCek = cekT.map((r) => [...r.cl.matchAll(new RegExp('`' + k.c + '` in \\(([^)]*)\\)', 'ig'))]).flat();
      if (dalamCek.length) { nilai[k.c] = pilih(dalamCek[0][1].split(',').map((x) => x.trim().replace(/^'|'$/g, ''))); continue; }
      if (cekT.some((r) => new RegExp('`' + k.c + '` >= 1').test(r.cl))) { nilai[k.c] = 1 + acak(53); continue; }
      const unik = unikKol.has(k.c);
      if (arrayKol.has(kunciKol)) val = JSON.stringify(['a', 'b ü', 'c']);
      else if (jsonKol.has(kunciKol)) val = JSON.stringify({ a: [1, 2, { b: 'ü😀' }], i });
      else if (k.ct.toLowerCase() === 'tinyint(1)') val = acak(2);
      else switch (k.d) {
        case 'char': val = k.len === 36 ? uuid() : hex(k.len); break;
        case 'varchar': val = unik ? `u${i}_${hex(6)}`.slice(0, k.len) : pilih(TEKS).slice(0, k.len); if (k.c === 'email') val = `u${i}${hex(4)}@x.id`; break;
        case 'text': case 'longtext': val = unik ? `u${i}_${hex(6)}` : pilih(TEKS) + ' ' + 'x'.repeat(acak(30)); break;
        case 'int': case 'smallint': case 'mediumint': val = unik ? 1000 + i : acak(k.d === 'smallint' ? 100 : 500); break;
        case 'bigint': val = unik ? 100000 + i : acak(100000); break;
        case 'decimal': { const maks = Math.min(10 ** (k.np - k.ns) - 1, 9999); val = (Math.random() * maks).toFixed(k.ns); break; }
        case 'double': val = (Math.random() * 1000).toFixed(4); break;
        case 'datetime': case 'timestamp': val = `${tgl()} ${String(acak(24)).padStart(2, '0')}:${String(acak(60)).padStart(2, '0')}:${String(acak(60)).padStart(2, '0')}`; break;
        case 'date': val = tgl(); break;
        case 'time': val = `${String(acak(24)).padStart(2, '0')}:${String(acak(60)).padStart(2, '0')}:00`; break;
        case 'longblob': case 'blob': val = Buffer.from(hex(20), 'hex'); break;
        default: throw new Error(`tipe ${k.d} (${t}.${k.c})`);
      }
      nilai[k.c] = val;
    }
    const nama = Object.keys(nilai);
    try {
      const [h] = await c.query(`INSERT INTO \`${t}\` (${nama.map((x) => '`' + x + '`').join(',')}) VALUES (${nama.map(() => '?').join(',')})`, nama.map((x) => nilai[x]));
      masuk++;
      for (const x of nama) (kunciAda[`${t}.${x}`] ??= []).push(nilai[x]);
      if (h.insertId) (kunciAda[`${t}.id`] ??= []).push(h.insertId);
    } catch (e) { if (!/Duplicate/.test(e.message)) throw new Error(`${t}: ${e.message}`); }
  }
  const [pkRows] = await c.query(`SELECT * FROM \`${t}\` LIMIT 500`);
  for (const r of pkRows) for (const x of Object.keys(r)) { const a = (kunciAda[`${t}.${x}`] ??= []); if (!a.includes(r[x])) a.push(r[x]); }
  hitung += masuk;
}
console.log(`Seed selesai: ${hitung} baris di ${urut.length} tabel.`);
await c.end();
