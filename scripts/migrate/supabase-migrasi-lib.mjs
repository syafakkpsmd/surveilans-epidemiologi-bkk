// Fungsi bantu untuk supabase-to-mariadb.mjs dan bandingkan-view.mjs.
// Dipisah supaya bagian murni (tanpa koneksi) bisa diuji: lihat uji-supabase-migrasi.mjs.
import pg from 'pg';

// Tabel Supabase yang SENGAJA tidak dipindah (tabel dummy; keputusan pengguna 26 Okt 2026).
export const TABEL_DIKECUALIKAN = new Set(['hiv_data', 'tb_data']);

// ---------- Koneksi PostgreSQL (sumber, hanya dibaca) ----------

/** Nilai mentah dari pg: tanggal/waktu/json sebagai TEKS agar tidak ada konversi zona atau parse ganda. */
export function pasangParserPg() {
  const mentah = (v) => v;
  for (const oid of [1082, 1083, 1114, 1184, 114, 3802]) pg.types.setTypeParser(oid, mentah);
}

export async function bukaPg(url, { ssl = true } = {}) {
  pasangParserPg();
  const client = new pg.Client({
    connectionString: url,
    // Sertifikat Supabase tidak ada di daftar CA Node; koneksi tetap terenkripsi.
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  await client.query("SET TIME ZONE 'UTC'");
  // Satu gambaran data yang konsisten selama seluruh pembacaan; tidak mungkin menulis.
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  return client;
}

export const qp = (id) => '"' + String(id).replace(/"/g, '""') + '"';
export const qm = (id) => '`' + String(id).replace(/`/g, '``') + '`';

// ---------- Normalisasi nilai pg -> MariaDB ----------

const BATAS_BYTE = { tinytext: 255, text: 65535, mediumtext: 16777215, longtext: 4294967295 };
const RE_INT = /^-?\d+$/;
const RE_DEC = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * kol: { nama, tipe (DATA_TYPE huruf kecil di MariaDB), presisi, skala, panjang }
 * Hasil: { value, catatan? } atau { error }.
 *  catatan = hal yang diubah tetapi bukan kegagalan ('pecahan_detik_dibuang').
 */
export function ubahNilai(v, kol) {
  if (v === null || v === undefined) return { value: null };
  const t = kol.tipe;

  if (t === 'tinyint' || t === 'smallint' || t === 'mediumint' || t === 'int' || t === 'integer' || t === 'bigint') {
    if (typeof v === 'boolean') return { value: v ? 1 : 0 };
    const s = String(v).trim();
    if (!RE_INT.test(s)) return { error: 'bukan bilangan bulat' };
    return { value: t === 'bigint' ? s : Number(s) };
  }

  if (t === 'decimal' || t === 'numeric') {
    const s = String(v).trim();
    const m = RE_DEC.exec(s);
    if (!m) return { error: 'bukan bilangan desimal' };
    const [, tanda, bulat, pecah = ''] = m;
    const skala = kol.skala ?? 0;
    const maxBulat = (kol.presisi ?? 65) - skala;
    if (bulat.replace(/^0+(?=\d)/, '').length > maxBulat) return { error: 'bagian bulat melebihi kolom' };
    const sisa = pecah.slice(skala);
    if (/[1-9]/.test(sisa)) return { error: 'pecahan melebihi skala kolom (akan dibulatkan diam-diam)' };
    const pecahOk = pecah.slice(0, skala);
    return { value: tanda + bulat + (pecahOk ? '.' + pecahOk : '') };
  }

  if (t === 'double' || t === 'float' || t === 'real') {
    const n = Number(v);
    if (!Number.isFinite(n)) return { error: 'bukan bilangan hingga' };
    return { value: n };
  }

  if (t === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    if (!m) return { error: 'tanggal tak dikenal (infinity?)' };
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) return { error: 'tanggal tidak ada di kalender' };
    return { value: String(v) };
  }

  if (t === 'datetime' || t === 'timestamp') {
    // Sesi pg diset UTC: '2026-10-20 22:15:01.226328+00' atau tanpa zona (timestamp biasa).
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:\+00(?::00)?)?$/.exec(String(v));
    if (!m) return { error: 'waktu tak dikenal (infinity atau zona bukan UTC)' };
    const r = { value: `${m[1]} ${m[2]}` };
    if (m[3] && /[1-9]/.test(m[3])) r.catatan = 'pecahan_detik_dibuang';
    return r;
  }

  if (t === 'time') {
    const m = /^(\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/.exec(String(v));
    if (!m) return { error: 'waktu tak dikenal' };
    const r = { value: m[1] };
    if (m[2] && /[1-9]/.test(m[2])) r.catatan = 'pecahan_detik_dibuang';
    return r;
  }

  if (t === 'binary' || t === 'varbinary' || t === 'blob' || t === 'mediumblob' || t === 'longblob' || t === 'tinyblob') {
    return { value: Buffer.isBuffer(v) ? v : Buffer.from(String(v)) };
  }

  // Teks (char/varchar/*text), uuid (char), json (longtext), array.
  let s;
  if (Array.isArray(v)) s = JSON.stringify(v); // array teks Postgres -> JSON
  else if (typeof v === 'object') s = JSON.stringify(v);
  else if (typeof v === 'boolean') s = v ? '1' : '0';
  else s = String(v);

  if (kol.panjang != null && (t === 'char' || t === 'varchar')) {
    if ([...s].length > kol.panjang) return { error: `teks lebih panjang dari ${kol.panjang} karakter` };
  } else if (BATAS_BYTE[t] && Buffer.byteLength(s, 'utf8') > BATAS_BYTE[t]) {
    return { error: 'teks melebihi batas tipe kolom' };
  }
  return { value: s };
}

// ---------- Urutan tabel dan kueri tulis ----------

/** edges: [anak, induk]. Hasil: urutan induk dulu. Tabel yang saling mengait tetap dimasukkan di akhir. */
export function urutkanTabel(tabel, edges) {
  const set = new Set(tabel);
  const induk = new Map(tabel.map((t) => [t, new Set()]));
  for (const [anak, ibu] of edges) {
    if (anak !== ibu && set.has(anak) && set.has(ibu)) induk.get(anak).add(ibu);
  }
  const hasil = [];
  const sisa = new Set(tabel);
  while (sisa.size) {
    const siap = [...sisa].filter((t) => [...induk.get(t)].every((p) => !sisa.has(p))).sort();
    if (!siap.length) {
      hasil.push(...[...sisa].sort()); // siklus: FOREIGN_KEY_CHECKS=0 + pemeriksaan yatim sesudahnya
      break;
    }
    for (const t of siap) {
      hasil.push(t);
      sisa.delete(t);
    }
  }
  return hasil;
}

export function bangunInsert(tabel, kolom, pk, jumlahBaris) {
  const baris = '(' + kolom.map(() => '?').join(',') + ')';
  const nilai = Array.from({ length: jumlahBaris }, () => baris).join(',');
  let sql = `INSERT INTO ${qm(tabel)} (${kolom.map(qm).join(',')}) VALUES ${nilai}`;
  if (pk.length) {
    const ubah = kolom.filter((k) => !pk.includes(k));
    const set = ubah.length ? ubah.map((k) => `${qm(k)}=VALUES(${qm(k)})`) : [`${qm(pk[0])}=${qm(pk[0])}`];
    sql += ' ON DUPLICATE KEY UPDATE ' + set.join(',');
  }
  return sql;
}

/** Pesan galat MariaDB bisa memuat NILAI data; simpan hanya kode dan nama kolom. */
export function galatAman(e) {
  const kol = /column '([^']+)'/i.exec(e?.sqlMessage ?? e?.message ?? '');
  return `${e?.code ?? 'GALAT'}${kol ? ' kolom ' + kol[1] : ''}`;
}

// ---------- Perbandingan ----------

const kosongNol = (s) => (s == null ? null : String(s));

/** Bandingkan dua angka (string) dengan toleransi relatif; keduanya null dianggap sama. */
export function samaAngka(a, b, eps = 1e-9) {
  a = kosongNol(a);
  b = kosongNol(b);
  if (a === null || b === null) return a === b;
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return a === b;
  return Math.abs(x - y) <= eps * Math.max(1, Math.abs(x), Math.abs(y));
}

/** Nilai pada hasil view -> bentuk teks seragam untuk dibandingkan antara pg dan MariaDB. */
export function normalisasiSel(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'bigint') return v.toString();
  if (Buffer.isBuffer(v)) return 'bin:' + v.toString('hex');
  if (typeof v === 'number') return String(Number(v.toFixed(8)));
  const s = String(v);
  if (/^-?\d+(\.\d+)?$/.test(s)) return String(Number(Number(s).toFixed(8)));
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 19).replace('T', ' ');
  return s;
}
