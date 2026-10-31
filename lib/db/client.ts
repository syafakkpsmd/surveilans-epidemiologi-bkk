// lib/db/client.ts
// Klien database PostgreSQL (pg) dengan bentuk antarmuka yang MIRIP @libsql/client / klien MariaDB sebelumnya,
// supaya kode yang memanggil `client.execute({ sql, args })` tetap bisa dipakai.
//
// Yang sama dengan sebelumnya : execute(), batch(), transaction(); hasil { rows, columns, rowsAffected, lastInsertRowid }.
//                               argumen posisional `?` (diubah otomatis menjadi $1, $2, ...).
//                               baris berupa objek biasa dengan kunci = nama kolom.
// Yang BERBEDA (perhatikan saat menulis SQL):
//   * Dialek PostgreSQL: DATE_FORMAT -> to_char, UTC_TIMESTAMP()/NOW(3) -> now(), IF() -> CASE WHEN,
//     ON DUPLICATE KEY UPDATE -> ON CONFLICT (kolom) DO UPDATE SET x = EXCLUDED.x, CALL -> SELECT * FROM fungsi(...).
//   * `/` pada dua bilangan bulat = pembagian BULAT. Pakai ::numeric bila butuh pecahan.
//   * Perbandingan teks PEKA huruf besar/kecil (MariaDB sebelumnya tidak). Pakai ILIKE / lower() bila perlu.
//   * lastInsertRowid tidak ada: pakai `INSERT ... RETURNING id`.
//   * Kolom bytea dikembalikan sebagai Buffer.
//
// Tipe yang dikembalikan DISAMAKAN dengan perilaku MariaDB (dateStrings/decimalNumbers) agar kode lain tidak berubah:
//   date -> 'YYYY-MM-DD', time -> 'HH:MM:SS', timestamptz -> 'YYYY-MM-DD HH:MM:SS[.fff]' (UTC),
//   numeric/bigint -> number, boolean -> boolean, jsonb -> objek/array, text[] -> array.
//
// Variabel env: DB_HOST (default localhost), DB_PORT (5432), DB_USER, DB_PASSWORD, DB_NAME,
//               DB_SOCKET (opsional, DIREKTORI soket UNIX, mis. /var/run/postgresql), DB_SSL (true/false),
//               DB_POOL_SIZE (default 5), atau DATABASE_URL (menggantikan DB_* bila diisi).
import pg from 'pg';
import type { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';

export type DbValue =
  | string
  | number
  | boolean
  | bigint
  | Date
  | Buffer
  | ArrayBuffer
  | Uint8Array
  | string[]
  | number[]
  | null
  | undefined;

export type DbStatement = string | { sql: string; args?: DbValue[] | Record<string, DbValue> };

export interface DbResultSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  columns: string[];
  rowsAffected: number;
  /** Tidak ada di PostgreSQL; selalu undefined. Pakai `INSERT ... RETURNING id`. */
  lastInsertRowid: number | undefined;
}

export interface DbTransaction {
  execute(stmt: DbStatement): Promise<DbResultSet>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): void;
}

export interface DbClient {
  execute(stmt: DbStatement): Promise<DbResultSet>;
  /** Semua perintah dijalankan dalam SATU transaksi; gagal satu = batal semua. Argumen `mode` diabaikan (kompatibilitas). */
  batch(stmts: DbStatement[], mode?: string): Promise<DbResultSet[]>;
  transaction(mode?: string): Promise<DbTransaction>;
}

type GlobalDb = typeof globalThis & { __epicDbPool?: Pool; __epicDbClient?: DbClient };
const g = globalThis as GlobalDb; // bertahan saat hot-reload Next.js agar pool tidak bocor

// --- Parser tipe: samakan hasil dengan perilaku MariaDB (dateStrings, decimalNumbers) ---
const OID = { INT8: 20, NUMERIC: 1700, DATE: 1082, TIME: 1083, TIMESTAMP: 1114, TIMESTAMPTZ: 1184 } as const;

/** '2026-10-31 00:47:12.5+00' -> '2026-10-31 00:47:12.500' ; tanpa pecahan detik -> tanpa pecahan. Sesi selalu UTC. */
export function normalisasiWaktu(v: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:[+-]00(?::?00)?)?$/.exec(v);
  if (!m) return v; // 'infinity', offset non-UTC, dll: biarkan apa adanya
  return m[3] ? `${m[1]} ${m[2]}.${m[3].slice(0, 3).padEnd(3, '0')}` : `${m[1]} ${m[2]}`;
}

const parserKhusus: Record<number, (v: string) => unknown> = {
  [OID.INT8]: (v) => Number(v),
  [OID.NUMERIC]: (v) => Number(v),
  [OID.DATE]: (v) => v,
  [OID.TIME]: (v) => v,
  [OID.TIMESTAMP]: (v) => normalisasiWaktu(v),
  [OID.TIMESTAMPTZ]: (v) => normalisasiWaktu(v),
};
const tipeKhusus = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    parserKhusus[oid] ?? pg.types.getTypeParser(oid, format as 'text')) as typeof pg.types.getTypeParser,
};

function buatPool(): Pool {
  const url = process.env.DATABASE_URL;
  const opsi: PoolConfig = { types: tipeKhusus as never, max: Number(process.env.DB_POOL_SIZE ?? 5), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000, keepAlive: true, options: '-c TimeZone=UTC' };
  if (url) {
    opsi.connectionString = url;
  } else {
    const user = process.env.DB_USER;
    const database = process.env.DB_NAME;
    if (!user || !database) throw new Error('DB_USER dan DB_NAME belum diisi di variabel lingkungan (.env.local).');
    opsi.host = process.env.DB_SOCKET ?? process.env.DB_HOST ?? 'localhost'; // pg: host berawalan "/" = direktori soket
    opsi.port = Number(process.env.DB_PORT ?? 5432);
    opsi.user = user;
    opsi.password = process.env.DB_PASSWORD;
    opsi.database = database;
  }
  if (/^(1|true|yes)$/i.test(process.env.DB_SSL ?? '')) opsi.ssl = { rejectUnauthorized: false };
  const pool = new pg.Pool(opsi);
  // Waktu disimpan/dibaca UTC (sama dengan perilaku MariaDB sebelumnya yang memakai time_zone +00:00).
  pool.on('error', () => undefined); // koneksi idle putus: pool membuat yang baru saat dibutuhkan
  return pool;
}

export function getDbPool(): Pool {
  if (!g.__epicDbPool) g.__epicDbPool = buatPool();
  return g.__epicDbPool;
}

/** Ubah placeholder `?` menjadi `$1, $2, ...`. Tanda `?` di dalam '...', "...", komentar, dan $$...$$ tidak disentuh. */
export function ubahPlaceholder(sql: string): { teks: string; jumlah: number } {
  let hasil = '';
  let n = 0;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const dua = sql.slice(i, i + 2);
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch && sql[j + 1] === ch) j += 2;
        else if (sql[j] === ch) break;
        else j++;
      }
      hasil += sql.slice(i, j + 1);
      i = j + 1;
    } else if (dua === '--') {
      const j = sql.indexOf('\n', i);
      const akhir = j === -1 ? sql.length : j;
      hasil += sql.slice(i, akhir);
      i = akhir;
    } else if (dua === '/*') {
      const j = sql.indexOf('*/', i + 2);
      const akhir = j === -1 ? sql.length : j + 2;
      hasil += sql.slice(i, akhir);
      i = akhir;
    } else if (ch === '$' && /^\$[A-Za-z_]*\$/.test(sql.slice(i))) {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))![0];
      const j = sql.indexOf(tag, i + tag.length);
      const akhir = j === -1 ? sql.length : j + tag.length;
      hasil += sql.slice(i, akhir);
      i = akhir;
    } else if (ch === '?') {
      hasil += `$${++n}`;
      i++;
    } else {
      hasil += ch;
      i++;
    }
  }
  return { teks: hasil, jumlah: n };
}

function normalisasiArgumen(args: DbValue[] | Record<string, DbValue> | undefined): unknown[] {
  if (args === undefined) return [];
  if (!Array.isArray(args)) {
    throw new Error('Argumen bernama belum didukung; pakai argumen posisional (?).');
  }
  return args.map((v) => {
    if (v === undefined) return null;
    if (v instanceof ArrayBuffer) return Buffer.from(v);
    if (ArrayBuffer.isView(v) && !Buffer.isBuffer(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
}

async function jalankan(sambungan: Pool | PoolClient, stmt: DbStatement): Promise<DbResultSet> {
  const sqlAsli = typeof stmt === 'string' ? stmt : stmt.sql;
  const args = normalisasiArgumen(typeof stmt === 'string' ? undefined : stmt.args);
  const { teks, jumlah } = ubahPlaceholder(sqlAsli);

  // Jaga-jaga salah terjemahan: jumlah '?' harus sama dengan jumlah argumen.
  if (jumlah !== args.length) {
    throw new Error(`Jumlah placeholder (${jumlah}) tidak sama dengan jumlah argumen (${args.length}).`);
  }

  const hasil: QueryResult = await sambungan.query(teks, args as unknown[]);
  return {
    rows: (hasil.rows as Record<string, unknown>[]).map((r) => ({ ...r })), // objek biasa, aman untuk Server->Client Component
    columns: hasil.fields ? hasil.fields.map((f) => f.name) : [],
    rowsAffected: hasil.rowCount ?? 0,
    lastInsertRowid: undefined,
  };
}

export function getDbClient(): DbClient {
  if (g.__epicDbClient) return g.__epicDbClient;
  // Pool baru dibuat saat query pertama (bukan saat getDbClient dipanggil), supaya `next build`
  // tidak gagal bila variabel env database belum tersedia saat build.
  const pool = () => getDbPool();

  const klien: DbClient = {
    execute: (stmt) => jalankan(pool(), stmt),

    async batch(stmts) {
      const k = await pool().connect();
      try {
        await k.query('BEGIN');
        const hasil: DbResultSet[] = [];
        for (const s of stmts) hasil.push(await jalankan(k, s));
        await k.query('COMMIT');
        return hasil;
      } catch (err) {
        await k.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        k.release();
      }
    },

    async transaction() {
      const k = await pool().connect();
      try {
        await k.query('BEGIN');
      } catch (e) {
        k.release();
        throw e;
      }
      let selesai = false;
      const akhiri = () => {
        if (!selesai) {
          selesai = true;
          k.release();
        }
      };
      return {
        execute: (stmt) => jalankan(k, stmt),
        async commit() {
          if (selesai) return;
          await k.query('COMMIT');
          akhiri();
        },
        async rollback() {
          if (selesai) return;
          await k.query('ROLLBACK');
          akhiri();
        },
        close() {
          if (selesai) return;
          k.query('ROLLBACK').catch(() => undefined).finally(akhiri);
        },
      };
    },
  };

  g.__epicDbClient = klien;
  return klien;
}

/** Untuk skrip/CLI: tutup pool agar proses Node bisa berhenti. */
export async function tutupDb(): Promise<void> {
  if (g.__epicDbPool) {
    await g.__epicDbPool.end();
    g.__epicDbPool = undefined;
    g.__epicDbClient = undefined;
  }
}
