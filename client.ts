// lib/db/client.ts
// Klien database MariaDB (mysql2) dengan bentuk antarmuka yang MIRIP @libsql/client,
// supaya kode lama yang memanggil `client.execute({ sql, args })` tetap bisa dipakai.
//
// Yang sama dengan libsql : execute(), batch(), transaction(); hasil { rows, columns, rowsAffected }.
//                           baris berupa objek biasa dengan kunci = nama kolom.
// Yang BERBEDA (perhatikan saat menerjemahkan SQL):
//   * Dialek SQL MariaDB, bukan SQLite (strftime -> DATE_FORMAT, datetime('now') -> UTC_TIMESTAMP(),
//     ON CONFLICT -> ON DUPLICATE KEY UPDATE, excluded.x -> VALUES(x)).
//   * Hanya argumen posisional (`?`). Argumen bernama belum didukung.
//   * Kolom BLOB dikembalikan sebagai Buffer (libsql: ArrayBuffer).
//
// Variabel env: DB_HOST (default localhost), DB_PORT (3306), DB_USER, DB_PASSWORD, DB_NAME,
//               DB_SOCKET (opsional, jalur socket UNIX), DB_POOL_SIZE (default 5).
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, PoolOptions, ResultSetHeader } from 'mysql2/promise';

export type DbValue =
  | string
  | number
  | boolean
  | bigint
  | Date
  | Buffer
  | ArrayBuffer
  | Uint8Array
  | null
  | undefined;

export type DbStatement = string | { sql: string; args?: DbValue[] | Record<string, DbValue> };

export interface DbResultSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  columns: string[];
  rowsAffected: number;
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

function buatPool(): Pool {
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;
  if (!user || !database) {
    throw new Error('DB_USER dan DB_NAME belum diisi di variabel lingkungan (.env.local).');
  }
  const socketPath = process.env.DB_SOCKET;
  const opsi: PoolOptions = {
    ...(socketPath
      ? { socketPath }
      : { host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306) }),
    user,
    password: process.env.DB_PASSWORD,
    database,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: true, // DATE/DATETIME tetap string 'YYYY-MM-DD' / 'YYYY-MM-DD HH:MM:SS' seperti di SQLite
    decimalNumbers: true, // SUM()/DECIMAL menjadi number, bukan string
    supportBigNumbers: true,
    bigNumberStrings: false,
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 5), // hosting bersama membatasi jumlah koneksi
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: 10_000,
  };
  const pool = mysql.createPool(opsi);
  // Waktu disimpan UTC (sama dengan datetime('now') SQLite).
  pool.pool.on('connection', (koneksi) => {
    koneksi.query("SET time_zone = '+00:00'");
  });
  return pool;
}

export function getDbPool(): Pool {
  if (!g.__epicDbPool) g.__epicDbPool = buatPool();
  return g.__epicDbPool;
}

function normalisasiArgumen(args: DbValue[] | Record<string, DbValue> | undefined): unknown[] {
  if (args === undefined) return [];
  if (!Array.isArray(args)) {
    throw new Error('Argumen bernama belum didukung; pakai argumen posisional (?).');
  }
  return args.map((v) => {
    if (v === undefined) return null;
    if (v instanceof ArrayBuffer) return Buffer.from(v);
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
}

async function jalankan(sambungan: Pool | PoolConnection, stmt: DbStatement): Promise<DbResultSet> {
  const sql = typeof stmt === 'string' ? stmt : stmt.sql;
  const args = normalisasiArgumen(typeof stmt === 'string' ? undefined : stmt.args);

  // Jaga-jaga salah terjemahan: jumlah '?' harus sama dengan jumlah argumen.
  const jumlahTanya = (sql.match(/\?/g) ?? []).length;
  if (jumlahTanya !== args.length) {
    throw new Error(`Jumlah placeholder (${jumlahTanya}) tidak sama dengan jumlah argumen (${args.length}).`);
  }

  const [hasil, kolom] = await sambungan.query(sql, args);
  if (Array.isArray(hasil)) {
    return {
      rows: (hasil as Record<string, unknown>[]).map((r) => ({ ...r })), // objek biasa, aman untuk Server->Client Component
      columns: Array.isArray(kolom) ? kolom.map((k) => k.name) : [],
      rowsAffected: 0,
      lastInsertRowid: undefined,
    };
  }
  const h = hasil as ResultSetHeader;
  return { rows: [], columns: [], rowsAffected: h.affectedRows ?? 0, lastInsertRowid: h.insertId || undefined };
}

export function getDbClient(): DbClient {
  if (g.__epicDbClient) return g.__epicDbClient;
  // Pool baru dibuat saat query pertama (bukan saat getDbClient dipanggil), supaya `next build`
  // tidak gagal bila variabel env database belum tersedia saat build.
  const pool = () => getDbPool();

  const klien: DbClient = {
    execute: (stmt) => jalankan(pool(), stmt),

    async batch(stmts) {
      const k = await pool().getConnection();
      try {
        await k.beginTransaction();
        const hasil: DbResultSet[] = [];
        for (const s of stmts) hasil.push(await jalankan(k, s));
        await k.commit();
        return hasil;
      } catch (err) {
        await k.rollback().catch(() => undefined);
        throw err;
      } finally {
        k.release();
      }
    },

    async transaction() {
      const k = await pool().getConnection();
      await k.beginTransaction();
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
          await k.commit();
          akhiri();
        },
        async rollback() {
          if (selesai) return;
          await k.rollback();
          akhiri();
        },
        close() {
          if (selesai) return;
          k.rollback().catch(() => undefined).finally(akhiri);
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
