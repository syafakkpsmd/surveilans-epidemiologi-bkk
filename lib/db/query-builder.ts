// lib/db/query-builder.ts
// Adapter bergaya supabase-js (PostgREST) di atas MariaDB (lib/db/client.ts).
//
// Tujuan: kode lama `const { data, error } = await supabase.from('t').select(...).eq(...).order(...)`
// tetap jalan tanpa ditulis ulang, tetapi membaca/menulis MariaDB.
//
// YANG DIDUKUNG
//   from(t).select(cols, {count, head}) | insert | update | upsert | delete, lalu .select() untuk RETURNING
//   filter  : eq neq gt gte lt lte like ilike is in not or match filter
//   hasil   : order (NULL diperlakukan seperti Postgres: ASC = NULL terakhir) range limit single maybeSingle
//             throwOnError returns abortSignal(no-op)
//   select  : '*', kolom, alias:kolom, relasi sebagai embed 1 tingkat: rel(kolom...), alias:rel(...), rel!inner(...)
//             (to-one lewat FK anak->induk, to-many lewat FK induk<-anak; disambung di JS, bukan JOIN)
//   rpc(nama, args): prosedur tersimpan (CALL), hasil = result set pertama
//   Bentuk hasil sama dengan supabase-js: { data, error, count, status, statusText }; error.code berbentuk
//   kode Postgres (23505 duplikat, 23503 FK, 23502 NOT NULL, 23514 CHECK, PGRST116 single).
//
// PERBEDAAN DISENGAJA TERHADAP SUPABASE
//   * TIDAK ADA RLS. Adapter ini membaca/menulis sebagai pengguna database. Pemeriksaan role harus ada di
//     kode server (lihat Tahap 5). Jangan memberi akses adapter ini ke browser.
//   * Hasil dikonversi ke bentuk yang diharapkan kode lama: DATETIME -> ISO UTC ('...T..:..:..+00:00'),
//     TINYINT(1) -> boolean, kolom JSON (LONGTEXT + CHECK JSON_VALID) -> objek/array.
//   * Perbandingan teks mengikuti kolasi kolom (kolom kunci memakai utf8mb4_bin = peka huruf besar/kecil
//     seperti Postgres; kolom teks biasa utf8mb4_unicode_ci = tidak peka). `like` dipaksa peka, `ilike` tidak.
//   * Embed relasi hanya 1 tingkat. Filter pada kolom relasi (rel.kolom) belum didukung.
import { getDbClient, getDbPool } from './client';
import type { DbValue } from './client';
import type { Penjaga } from './rls';
import { PencatatQuery, pecahTingkatAtas } from './spec';
import type { DbError, DbResponse, Kond, Row } from './spec';


export type { DbError, DbResponse } from './spec';

// ---------------------------------------------------------------------
// Metadata skema (kolom, PK, FK), dimuat sekali per proses
// ---------------------------------------------------------------------

interface InfoKolom {
  tipe: string; // DATA_TYPE huruf kecil
  kolomTipe: string; // COLUMN_TYPE huruf kecil, mis. 'tinyint(1)'
  json: boolean;
}
interface InfoFk {
  anak: string;
  kolomAnak: string[];
  induk: string;
  kolomInduk: string[];
  nama: string;
}
interface Meta {
  kolom: Map<string, Map<string, InfoKolom>>;
  pk: Map<string, string[]>;
  fk: InfoFk[];
  parameter: Map<string, string[]>; // prosedur -> nama parameter berurutan
  views: Set<string>;
}

type GlobalMeta = typeof globalThis & { __epicDbMeta?: Promise<Meta> };
const gm = globalThis as GlobalMeta;

async function muatMeta(): Promise<Meta> {
  const db = getDbClient();
  const [kol, pk, fk, chk, prm, vw] = await Promise.all([
    db.execute(`SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d, COLUMN_TYPE ct FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION`),
    db.execute(`SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY TABLE_NAME, ORDINAL_POSITION`),
    db.execute(`SELECT CONSTRAINT_NAME n, TABLE_NAME t, COLUMN_NAME c, REFERENCED_TABLE_NAME rt, REFERENCED_COLUMN_NAME rc
                  FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`),
    db.execute(`SELECT TABLE_NAME t, CHECK_CLAUSE cl FROM information_schema.CHECK_CONSTRAINTS
                 WHERE CONSTRAINT_SCHEMA = DATABASE() AND LOWER(CHECK_CLAUSE) LIKE '%json_valid%'`),
    db.execute(`SELECT SPECIFIC_NAME n, PARAMETER_NAME p FROM information_schema.PARAMETERS
                 WHERE SPECIFIC_SCHEMA = DATABASE() AND PARAMETER_NAME IS NOT NULL ORDER BY SPECIFIC_NAME, ORDINAL_POSITION`),
    db.execute(`SELECT TABLE_NAME t FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()`),
  ]);

  const jsonKol = new Set<string>();
  for (const r of chk.rows) {
    for (const m of String(r.cl).matchAll(/json_valid\(\s*`?([A-Za-z0-9_]+)`?\s*\)/gi)) jsonKol.add(`${r.t}.${m[1]}`);
  }
  const kolom = new Map<string, Map<string, InfoKolom>>();
  for (const r of kol.rows) {
    if (!kolom.has(r.t)) kolom.set(r.t, new Map());
    kolom.get(r.t)!.set(r.c, {
      tipe: String(r.d).toLowerCase(),
      kolomTipe: String(r.ct).toLowerCase(),
      json: jsonKol.has(`${r.t}.${r.c}`) || String(r.d).toLowerCase() === 'json',
    });
  }
  const pkMap = new Map<string, string[]>();
  for (const r of pk.rows) pkMap.set(r.t, [...(pkMap.get(r.t) ?? []), r.c]);

  const perFk = new Map<string, InfoFk>();
  for (const r of fk.rows) {
    const kunci = `${r.t}|${r.n}`;
    const f: InfoFk = perFk.get(kunci) ?? { anak: r.t, kolomAnak: [] as string[], induk: r.rt, kolomInduk: [] as string[], nama: r.n };
    f.kolomAnak.push(r.c);
    f.kolomInduk.push(r.rc);
    perFk.set(kunci, f);
  }
  const parameter = new Map<string, string[]>();
  for (const r of prm.rows) parameter.set(r.n, [...(parameter.get(r.n) ?? []), r.p]);

  return { kolom, pk: pkMap, fk: [...perFk.values()], parameter, views: new Set(vw.rows.map((r) => String(r.t))) };
}

function getMeta(): Promise<Meta> {
  if (!gm.__epicDbMeta) {
    gm.__epicDbMeta = muatMeta().catch((e) => {
      gm.__epicDbMeta = undefined; // coba lagi pada panggilan berikutnya
      throw e;
    });
  }
  return gm.__epicDbMeta;
}

/** Hanya untuk uji: buang cache metadata. */
export function resetMetaDb(): void {
  gm.__epicDbMeta = undefined;
}

// ---------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------

const RE_ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
function id(nama: string): string {
  if (!RE_ID.test(nama)) throw new Error(`Nama kolom/tabel tidak valid atau belum didukung: "${nama}"`);
  return '`' + nama + '`';
}

function petakanGalat(e: unknown): DbError {
  const x = e as { code?: string; errno?: number; sqlMessage?: string; message?: string };
  const no = x?.errno;
  let code = x?.code ?? 'XX000';
  if (no === 1062) code = '23505';
  else if (no === 1451 || no === 1452) code = '23503';
  else if (no === 1048 || no === 1364) code = '23502';
  else if (no === 4025 || no === 3819) code = '23514';
  else if (no === 1406 || no === 1264) code = '22001';
  else if (no === 1054) code = '42703';
  else if (no === 1146) code = '42P01';
  else if (no === 1292 || no === 1366) code = '22007';
  return { message: x?.sqlMessage ?? x?.message ?? String(e), code, details: null, hint: null };
}

const dua = (n: number) => String(n).padStart(2, '0');
function utcDatetime(d: Date): string {
  return `${d.getUTCFullYear()}-${dua(d.getUTCMonth() + 1)}-${dua(d.getUTCDate())} ${dua(d.getUTCHours())}:${dua(d.getUTCMinutes())}:${dua(d.getUTCSeconds())}`;
}

/** Nilai JS -> parameter SQL, dengan memperhatikan tipe kolom tujuan. */
function keParam(v: unknown, info?: InfoKolom): DbValue {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return info?.tipe === 'date' ? utcDatetime(v).slice(0, 10) : utcDatetime(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return v.toString();
  if (Buffer.isBuffer(v) || v instanceof Uint8Array || v instanceof ArrayBuffer) return v as DbValue;
  if (typeof v === 'object') return JSON.stringify(v); // objek/array -> kolom JSON
  if (typeof v === 'string' && info) {
    if ((info.tipe === 'datetime' || info.tipe === 'timestamp') && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) {
      // ISO dengan 'T', 'Z' atau offset -> UTC 'YYYY-MM-DD HH:MM:SS'
      if (/(Z|[+-]\d{2}(:?\d{2})?)$/.test(v) || v.includes('T')) {
        const d = new Date(/(Z|[+-]\d{2}(:?\d{2})?)$/.test(v) ? v : v.replace(' ', 'T') + 'Z');
        if (!Number.isNaN(d.getTime())) return utcDatetime(d);
      }
    }
    if (info.tipe === 'date' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  }
  return v as DbValue;
}

/** Baris hasil MariaDB -> bentuk PostgREST. */
function keBentukPostgrest(row: Row, kolom: Map<string, InfoKolom> | undefined, aliasKe?: Map<string, string>): Row {
  if (!kolom) return row;
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    const asal = aliasKe?.get(k) ?? k;
    const info = kolom.get(asal);
    out[k] = info ? konversiNilai(v, info) : v;
  }
  return out;
}

function konversiNilai(v: unknown, info: InfoKolom): unknown {
  if (v === null || v === undefined) return v ?? null;
  if (info.json && typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  if (info.tipe === 'datetime' || info.tipe === 'timestamp') {
    const s = String(v);
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s);
    return m ? `${m[1]}T${m[2]}+00:00` : s;
  }
  if (info.kolomTipe === 'tinyint(1)' && (typeof v === 'number' || typeof v === 'string')) return Number(v) !== 0;
  return v;
}

// ---------------------------------------------------------------------
// Kondisi WHERE
// ---------------------------------------------------------------------

function nilaiPola(v: unknown): string {
  return String(v).replace(/\*/g, '%'); // PostgREST memakai * sebagai wildcard di dalam or()
}

function kompilKond(k: Kond, info: Map<string, InfoKolom> | undefined, p: DbValue[]): string {
  if (k.t === 'and' || k.t === 'or') {
    if (!k.items.length) return k.t === 'and' ? '1=1' : '1=0';
    return '(' + k.items.map((x) => kompilKond(x, info, p)).join(k.t === 'and' ? ' AND ' : ' OR ') + ')';
  }
  if (k.t === 'not') return `(NOT ${kompilKond(k.item, info, p)})`;
  const c = id(k.kol);
  const kolInfo = info?.get(k.kol);
  const push = (v: unknown) => {
    p.push(keParam(v, kolInfo));
    return '?';
  };
  switch (k.op) {
    case 'eq':
      return k.val === null ? `${c} IS NULL` : `${c} = ${push(k.val)}`;
    case 'neq':
      return k.val === null ? `${c} IS NOT NULL` : `${c} <> ${push(k.val)}`; // NULL tidak ikut, sama dengan Postgres
    case 'gt':
      return `${c} > ${push(k.val)}`;
    case 'gte':
      return `${c} >= ${push(k.val)}`;
    case 'lt':
      return `${c} < ${push(k.val)}`;
    case 'lte':
      return `${c} <= ${push(k.val)}`;
    case 'like':
      return `${c} COLLATE utf8mb4_bin LIKE ${push(nilaiPola(k.val))}`;
    case 'ilike':
      return `${c} COLLATE utf8mb4_unicode_ci LIKE ${push(nilaiPola(k.val))}`;
    case 'is': {
      const v = k.val;
      if (v === null || v === 'null') return `${c} IS NULL`;
      if (v === true || v === 'true') return `${c} IS TRUE`;
      if (v === false || v === 'false') return `${c} IS FALSE`;
      throw new Error(`Operator is hanya mendukung null/true/false, bukan: ${String(v)}`);
    }
    case 'in': {
      const arr = Array.isArray(k.val) ? k.val : [];
      if (!arr.length) return '1=0';
      return `${c} IN (${arr.map((x) => push(x)).join(',')})`;
    }
    default:
      throw new Error(`Operator filter belum didukung: ${k.op}`);
  }
}

// ---------------------------------------------------------------------
// Parser daftar kolom select (alias, relasi)
// ---------------------------------------------------------------------

interface ItemKolom {
  kol: string; // '*' atau nama kolom
  alias?: string;
}
interface ItemRelasi {
  nama: string; // nama tabel yang di-embed
  alias?: string;
  inner: boolean;
  fkHint?: string;
  isi: string; // daftar kolom di dalam kurung
}
interface Pilihan {
  semua: boolean;
  kolom: ItemKolom[];
  relasi: ItemRelasi[];
}

function parsePilihan(s: string | undefined): Pilihan {
  const teks = (s ?? '*').trim() || '*';
  const p: Pilihan = { semua: false, kolom: [], relasi: [] };
  for (const item0 of pecahTingkatAtas(teks.replace(/\s+/g, ' '))) {
    const item = item0.replace(/::\w+$/, '').trim();
    if (item === '*') {
      p.semua = true;
      continue;
    }
    const rel = /^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)(?:!(inner|left|[A-Za-z_]\w*))?(?:!(inner|left))?\(([\s\S]*)\)$/.exec(item);
    if (rel) {
      const tanda = [rel[3], rel[4]].filter(Boolean) as string[];
      p.relasi.push({
        nama: rel[2],
        alias: rel[1],
        inner: tanda.includes('inner'),
        fkHint: tanda.find((x) => x !== 'inner' && x !== 'left'),
        isi: rel[5],
      });
      continue;
    }
    const al = /^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)$/.exec(item);
    if (!al) throw new Error(`Daftar kolom select belum didukung: "${item0}"`);
    p.kolom.push({ kol: al[2], alias: al[1] });
  }
  return p;
}

// ---------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------

export class QueryBuilder extends PencatatQuery implements PromiseLike<DbResponse> {
  constructor(tabel: string, private penjaga?: Penjaga) {
    super(tabel);
    id(tabel);
  }

  // --- eksekusi ---
  then<A = DbResponse, B = never>(
    ok?: ((v: DbResponse) => A | PromiseLike<A>) | null,
    gagal?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.jalankan().then(ok, gagal);
  }

  private async jalankan(): Promise<DbResponse> {
    let hasil: DbResponse;
    try {
      hasil = await this.eksekusi();
    } catch (e) {
      hasil = { data: null, error: petakanGalat(e), count: null, status: 400, statusText: 'Bad Request' };
    }
    if (this.lempar && hasil.error) {
      const err = new Error(hasil.error.message) as Error & { code?: string };
      err.code = hasil.error.code;
      throw err;
    }
    return hasil;
  }

  /** Keputusan RLS untuk tabel ini (view dan klien tanpa penjaga = bebas). */
  private async periksa(meta: Meta, cmd: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') {
    if (!this.penjaga || meta.views.has(this.tabel)) return { izin: 'bebas' } as const;
    return this.penjaga(this.tabel, cmd);
  }

  private static galatRls(tabel: string): DbResponse {
    return {
      data: null,
      error: { code: '42501', message: `new row violates row-level security policy for table "${tabel}"`, details: null, hint: null },
      count: null,
      status: 403,
      statusText: 'Forbidden',
    };
  }

  private whereSql(meta: Meta, p: DbValue[]): string {
    if (!this.kond.length) return '';
    const info = meta.kolom.get(this.tabel);
    return ' WHERE ' + this.kond.map((k) => kompilKond(k, info, p)).join(' AND ');
  }

  private orderSql(): string {
    if (!this.urutan.length) return '';
    const bagian = this.urutan.map((o) => {
      const c = id(o.kol);
      // NULL: Postgres menganggap NULL "terbesar"; MariaDB "terkecil". Samakan secara eksplisit.
      const n = `(${c} IS NULL) ${o.nullsFirst ? 'DESC' : 'ASC'}`;
      return `${n}, ${c} ${o.asc ? 'ASC' : 'DESC'}`;
    });
    return ' ORDER BY ' + bagian.join(', ');
  }

  private limitSql(): string {
    if (this.batas === null && this.mulai === 0) return '';
    // MariaDB: OFFSET butuh LIMIT; angka besar = "tanpa batas".
    return ` LIMIT ${this.batas === null ? '18446744073709551615' : Math.trunc(this.batas)} OFFSET ${Math.trunc(this.mulai)}`;
  }

  /** Daftar kolom SQL untuk SELECT/RETURNING + peta alias + relasi yang perlu disambung. */
  private rakitKolom(meta: Meta): { sql: string; alias: Map<string, string>; relasi: ItemRelasi[]; perluKolom: string[] } {
    const pil = parsePilihan(this.pilihan);
    const info = meta.kolom.get(this.tabel);
    const alias = new Map<string, string>();
    const bagian: string[] = [];
    if (pil.semua || (!pil.kolom.length && pil.relasi.length)) bagian.push('*');
    for (const k of pil.kolom) {
      if (info && !info.has(k.kol)) throw Object.assign(new Error(`Unknown column ${k.kol}`), { errno: 1054, sqlMessage: `column ${this.tabel}.${k.kol} does not exist` });
      bagian.push(k.alias ? `${id(k.kol)} AS ${id(k.alias)}` : id(k.kol));
      if (k.alias) alias.set(k.alias, k.kol);
    }
    // kolom yang dibutuhkan untuk menyambung relasi harus ikut terambil
    const perluKolom: string[] = [];
    if (pil.relasi.length && !pil.semua) {
      for (const r of pil.relasi) {
        const f = this.cariFk(meta, r);
        const kunciLokal = f.arah === 'ke-induk' ? f.fk.kolomAnak : f.fk.kolomInduk;
        for (const kc of kunciLokal) {
          if (!pil.kolom.some((x) => (x.alias ?? x.kol) === kc)) {
            bagian.push(id(kc));
            perluKolom.push(kc);
          }
        }
      }
    }
    return { sql: bagian.length ? bagian.join(', ') : '*', alias, relasi: pil.relasi, perluKolom };
  }

  private cariFk(meta: Meta, r: ItemRelasi): { fk: InfoFk; arah: 'ke-induk' | 'ke-anak' } {
    const cocok = (f: InfoFk) => !r.fkHint || f.nama === r.fkHint || f.kolomAnak.includes(r.fkHint);
    const keInduk = meta.fk.filter((f) => f.anak === this.tabel && f.induk === r.nama && cocok(f));
    if (keInduk.length === 1) return { fk: keInduk[0], arah: 'ke-induk' };
    const keAnak = meta.fk.filter((f) => f.induk === this.tabel && f.anak === r.nama && cocok(f));
    if (keInduk.length + keAnak.length === 1) return keInduk.length ? { fk: keInduk[0], arah: 'ke-induk' } : { fk: keAnak[0], arah: 'ke-anak' };
    throw new Error(
      keInduk.length + keAnak.length === 0
        ? `Tidak ada foreign key antara ${this.tabel} dan ${r.nama}`
        : `Relasi ${this.tabel} -> ${r.nama} ambigu (beberapa FK); tambahkan petunjuk !nama_fk`,
    );
  }

  private async sambungRelasi(meta: Meta, rows: Row[], relasi: ItemRelasi[]): Promise<Row[]> {
    let hasil = rows;
    for (const r of relasi) {
      const { fk, arah } = this.cariFk(meta, r);
      const kunciLokal = arah === 'ke-induk' ? fk.kolomAnak : fk.kolomInduk;
      const kunciJauh = arah === 'ke-induk' ? fk.kolomInduk : fk.kolomAnak;
      if (kunciLokal.length !== 1) throw new Error('Embed relasi dengan FK komposit belum didukung.');
      const nilai = [...new Set(hasil.map((x) => x[kunciLokal[0]]).filter((v) => v !== null && v !== undefined))];
      const kolomJauh = meta.kolom.get(r.nama);
      const sub = new QueryBuilder(r.nama, this.penjaga);
      const isi = r.isi.trim() === '' ? '*' : r.isi;
      const subPil = parsePilihan(isi);
      if (subPil.relasi.length) throw new Error('Embed relasi bersarang (lebih dari 1 tingkat) belum didukung.');
      // pastikan kolom penyambung ikut dibaca, lalu dibuang lagi jika tidak diminta
      const sambungSudahAda = subPil.semua || subPil.kolom.some((x) => (x.alias ?? x.kol) === kunciJauh[0]);
      sub.pilihan = sambungSudahAda ? isi : `${isi},${kunciJauh[0]}`;
      const peta = new Map<unknown, Row[]>();
      if (nilai.length) {
        sub.kond.push({ t: 'cmp', kol: kunciJauh[0], op: 'in', val: nilai });
        const jawab = await sub.eksekusiSelect(meta);
        for (const j of jawab.rows) {
          const kunci = j[kunciJauh[0]];
          if (!peta.has(kunci)) peta.set(kunci, []);
          peta.get(kunci)!.push(sambungSudahAda ? j : Object.fromEntries(Object.entries(j).filter(([k]) => k !== kunciJauh[0])));
        }
      }
      void kolomJauh;
      const nama = r.alias ?? r.nama;
      hasil = hasil
        .map((x) => {
          const l = peta.get(x[kunciLokal[0]]) ?? [];
          return { ...x, [nama]: arah === 'ke-induk' ? (l[0] ?? null) : l };
        })
        .filter((x) => !(r.inner && (arah === 'ke-induk' ? x[nama] === null : (x[nama] as Row[]).length === 0)));
    }
    return hasil;
  }

  /** SELECT lengkap (tanpa pembungkus respons); dipakai juga oleh embed. */
  private async eksekusiSelect(meta: Meta): Promise<{ rows: Row[]; total: number | null }> {
    const izin = await this.periksa(meta, 'SELECT');
    if (izin.izin === 'tolak') return { rows: [], total: this.opsiHitung.count ? 0 : null };
    if (izin.izin === 'baris') this.kond.push({ t: 'cmp', kol: izin.kolom, op: 'eq', val: izin.nilai });
    const { sql: kolSql, alias, relasi, perluKolom } = this.rakitKolom(meta);
    const p: DbValue[] = [];
    const where = this.whereSql(meta, p);
    const db = getDbClient();
    let total: number | null = null;
    if (this.opsiHitung.count) {
      const pc: DbValue[] = [];
      const wc = this.whereSql(meta, pc);
      const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM ${id(this.tabel)}${wc}`, args: pc });
      total = Number(r.rows[0]?.n ?? 0);
    }
    if (this.opsiHitung.head) return { rows: [], total };
    const r = await db.execute({
      sql: `SELECT ${kolSql} FROM ${id(this.tabel)}${where}${this.orderSql()}${this.limitSql()}`,
      args: p,
    });
    let rows = r.rows.map((x) => keBentukPostgrest(x, meta.kolom.get(this.tabel), alias));
    if (relasi.length) {
      rows = await this.sambungRelasi(meta, rows, relasi);
      if (perluKolom.length) rows = rows.map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !perluKolom.includes(k))));
    }
    return { rows, total };
  }

  private bentukRespons(rows: Row[], total: number | null, status = 200): DbResponse {
    const ok = (data: unknown, st = status): DbResponse =>
      ({ data, error: null, count: total, status: st, statusText: st === 200 ? 'OK' : 'Created' }) as DbResponse;
    if (this.mode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
            details: `The result contains ${rows.length} rows`,
            hint: null,
          },
          count: total,
          status: 406,
          statusText: 'Not Acceptable',
        };
      }
      return ok(rows[0]);
    }
    if (this.mode === 'maybe') {
      if (rows.length > 1) {
        return {
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null },
          count: total,
          status: 406,
          statusText: 'Not Acceptable',
        };
      }
      return ok(rows[0] ?? null);
    }
    return ok(rows);
  }

  private async eksekusi(): Promise<DbResponse> {
    const meta = await getMeta();
    const db = getDbClient();

    if (this.op === 'select') {
      const { rows, total } = await this.eksekusiSelect(meta);
      if (this.opsiHitung.head) return { data: null, error: null, count: total, status: 200, statusText: 'OK' };
      return this.bentukRespons(rows, total);
    }

    const info = meta.kolom.get(this.tabel);
    if (!info) throw Object.assign(new Error(`Table ${this.tabel} doesn't exist`), { errno: 1146, sqlMessage: `Tabel ${this.tabel} tidak ada` });

    if (this.op === 'insert' || this.op === 'upsert') {
      if (!this.payload.length) return this.bentukRespons([], null, 201);
      const izinIns = await this.periksa(meta, 'INSERT');
      const izinUpd = this.op === 'upsert' ? await this.periksa(meta, 'UPDATE') : izinIns;
      for (const iz of [izinIns, izinUpd]) {
        if (iz.izin === 'tolak') return QueryBuilder.galatRls(this.tabel);
        if (iz.izin === 'baris' && this.payload.some((r) => String(r[iz.kolom] ?? '') !== iz.nilai)) return QueryBuilder.galatRls(this.tabel);
      }
      if (this.kembalikan && (await this.periksa(meta, 'SELECT')).izin === 'tolak') return QueryBuilder.galatRls(this.tabel);
      const kolom = [...new Set(this.payload.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
      for (const k of kolom) if (!info.has(k)) throw Object.assign(new Error(`Unknown column ${k}`), { errno: 1054, sqlMessage: `Kolom ${k} tidak ada di tabel ${this.tabel}` });
      const p: DbValue[] = [];
      const barisSql = this.payload.map(
        (r) => '(' + kolom.map((k) => (r[k] === undefined ? 'DEFAULT' : (p.push(keParam(r[k], info.get(k))), '?'))).join(',') + ')',
      );
      let sql = `INSERT INTO ${id(this.tabel)} (${kolom.map(id).join(',')}) VALUES ${barisSql.join(',')}`;
      if (this.op === 'upsert') {
        const kunci = this.onConflict ?? meta.pk.get(this.tabel) ?? [];
        const ubah = kolom.filter((k) => !kunci.includes(k));
        const set = this.abaikanDuplikat || !ubah.length
          ? [`${id(kunci[0] ?? kolom[0])} = ${id(kunci[0] ?? kolom[0])}`]
          : ubah.map((k) => `${id(k)} = VALUES(${id(k)})`);
        sql += ' ON DUPLICATE KEY UPDATE ' + set.join(', ');
      }
      const rak = this.kembalikan ? this.rakitKolom(meta) : null;
      if (rak) sql += ` RETURNING ${rak.sql}`;
      const r = await db.execute({ sql, args: p });
      if (!rak) return { data: null, error: null, count: null, status: 201, statusText: 'Created' };
      let rows = r.rows.map((x) => keBentukPostgrest(x, info, rak.alias));
      if (rak.relasi.length) rows = await this.sambungRelasi(meta, rows, rak.relasi);
      return this.bentukRespons(rows, null, 201);
    }

    if (this.op === 'update') {
      const izinUp = await this.periksa(meta, 'UPDATE');
      if (izinUp.izin === 'tolak') return this.bentukRespons([], null);
      if (izinUp.izin === 'baris') this.kond.push({ t: 'cmp', kol: izinUp.kolom, op: 'eq', val: izinUp.nilai });
      const nilai = this.payload[0];
      const kolom = Object.keys(nilai).filter((k) => nilai[k] !== undefined);
      if (!kolom.length) return { data: null, error: null, count: null, status: 204, statusText: 'No Content' };
      for (const k of kolom) if (!info.has(k)) throw Object.assign(new Error(`Unknown column ${k}`), { errno: 1054, sqlMessage: `Kolom ${k} tidak ada di tabel ${this.tabel}` });
      const pw: DbValue[] = [];
      const where = this.whereSql(meta, pw);
      const set = kolom.map((k) => `${id(k)} = ?`).join(', ');
      const ps = kolom.map((k) => keParam(nilai[k], info.get(k)));
      if (!this.kembalikan) {
        await db.execute({ sql: `UPDATE ${id(this.tabel)} SET ${set}${where}`, args: [...ps, ...pw] });
        return { data: null, error: null, count: null, status: 204, statusText: 'No Content' };
      }
      // MariaDB tidak punya UPDATE ... RETURNING: kunci baris, ubah, lalu baca ulang lewat PK.
      const pk = meta.pk.get(this.tabel);
      if (!pk?.length) throw new Error(`update().select() butuh PRIMARY KEY pada tabel ${this.tabel}`);
      const tx = await db.transaction();
      try {
        const pk0: DbValue[] = [];
        const w0 = this.whereSql(meta, pk0);
        const ids = (await tx.execute({ sql: `SELECT ${pk.map(id).join(',')} FROM ${id(this.tabel)}${w0} FOR UPDATE`, args: pk0 })).rows;
        await tx.execute({ sql: `UPDATE ${id(this.tabel)} SET ${set}${where}`, args: [...ps, ...pw] });
        let rows: Row[] = [];
        if (ids.length) {
          const rak = this.rakitKolom(meta);
          const pb: DbValue[] = [];
          const cond = ids.map((r) => '(' + pk.map((c) => { pb.push(r[c] as DbValue); return `${id(c)} = ?`; }).join(' AND ') + ')').join(' OR ');
          const ambil = await tx.execute({ sql: `SELECT ${rak.sql} FROM ${id(this.tabel)} WHERE ${cond}${this.orderSql()}`, args: pb });
          rows = ambil.rows.map((x) => keBentukPostgrest(x, info, rak.alias));
          if (rak.relasi.length) rows = await this.sambungRelasi(meta, rows, rak.relasi);
        }
        await tx.commit();
        return this.bentukRespons(rows, null);
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    }

    // delete
    const izinDel = await this.periksa(meta, 'DELETE');
    if (izinDel.izin === 'tolak') return this.kembalikan ? this.bentukRespons([], null) : { data: null, error: null, count: null, status: 204, statusText: 'No Content' };
    if (izinDel.izin === 'baris') this.kond.push({ t: 'cmp', kol: izinDel.kolom, op: 'eq', val: izinDel.nilai });
    const pw: DbValue[] = [];
    const where = this.whereSql(meta, pw);
    const rak = this.kembalikan ? this.rakitKolom(meta) : null;
    const r = await db.execute({ sql: `DELETE FROM ${id(this.tabel)}${where}${rak ? ` RETURNING ${rak.sql}` : ''}`, args: pw });
    if (!rak) return { data: null, error: null, count: null, status: 204, statusText: 'No Content' };
    let rows = r.rows.map((x) => keBentukPostgrest(x, info, rak.alias));
    if (rak.relasi.length) rows = await this.sambungRelasi(meta, rows, rak.relasi);
    return this.bentukRespons(rows, null);
  }
}

// ---------------------------------------------------------------------
// RPC (prosedur tersimpan) dan klien
// ---------------------------------------------------------------------

export function dbRpc(nama: string, args: Row = {}): PromiseLike<DbResponse> {
  const jalan = async (): Promise<DbResponse> => {
    try {
      id(nama);
      const meta = await getMeta();
      const parameter = meta.parameter.get(nama);
      if (!parameter) throw Object.assign(new Error(`Prosedur ${nama} tidak ada`), { errno: 1305, sqlMessage: `Prosedur ${nama} tidak ada` });
      const nilai = parameter.map((p) => keParam(args[p] ?? args[p.replace(/^p_/, '')] ?? null));
      // CALL mengembalikan [result sets..., OkPacket]; ambil result set pertama.
      const [hasil] = await getDbPool().query(`CALL ${id(nama)}(${parameter.map(() => '?').join(',')})`, nilai);
      const rs = Array.isArray(hasil) && Array.isArray(hasil[0]) ? (hasil[0] as Row[]) : [];
      return { data: rs.map((x) => ({ ...x })), error: null, count: null, status: 200, statusText: 'OK' } as DbResponse;
    } catch (e) {
      return { data: null, error: petakanGalat(e), count: null, status: 400, statusText: 'Bad Request' };
    }
  };
  return { then: (ok, gagal) => jalan().then(ok, gagal) };
}

export function dbFrom(tabel: string, penjaga?: Penjaga): QueryBuilder {
  return new QueryBuilder(tabel, penjaga);
}

/** Klien bentuk supabase-js yang hanya punya .from() dan .rpc(), di atas MariaDB. */
export function buatKlienDb(penjaga?: Penjaga) {
  return { from: (t: string) => dbFrom(t, penjaga), rpc: dbRpc };
}
