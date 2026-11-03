// lib/db/spec.ts
// Bagian query builder yang MURNI (tanpa koneksi database): mencatat rantai pemanggilan .from().select().eq()...
// menjadi "spec" yang bisa dijalankan di server (lib/db/query-builder.ts) atau dikirim dari browser ke /api/db
// (lib/db/browser-client.ts). Aman diimpor dari Client Component.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface DbError {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
}

export interface DbResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: DbError | null;
  count: number | null;
  status: number;
  statusText: string;
}

export type Kond =
  | { t: 'cmp'; kol: string; op: string; val: unknown }
  | { t: 'and'; items: Kond[] }
  | { t: 'or'; items: Kond[] }
  | { t: 'not'; item: Kond };

// Parser string filter PostgREST untuk .or(...) dan .filter()
export function pecahTingkatAtas(s: string): string[] {
  const hasil: string[] = [];
  let dalam = 0;
  let kutip = false;
  let cur = '';
  for (const ch of s) {
    if (ch === '"') kutip = !kutip;
    if (!kutip) {
      if (ch === '(') dalam++;
      else if (ch === ')') dalam--;
      else if (ch === ',' && dalam === 0) {
        hasil.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) hasil.push(cur);
  return hasil.map((x) => x.trim()).filter(Boolean);
}

function bukaKutip(v: string): string {
  return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

export function parseKondisi(s: string): Kond[] {
  return pecahTingkatAtas(s).map((item): Kond => {
    const grup = /^(not\.)?(and|or)\(([\s\S]*)\)$/.exec(item);
    if (grup) {
      const k: Kond = { t: grup[2] as 'and' | 'or', items: parseKondisi(grup[3]) };
      return grup[1] ? { t: 'not', item: k } : k;
    }
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\.(not\.)?([a-z]+)\.([\s\S]*)$/.exec(item);
    if (!m) throw new Error(`Filter or() tidak dikenal: ${item}`);
    const [, kol, neg, op, mentah] = m;
    let val: unknown = bukaKutip(mentah);
    let opAkhir = op;
    if (op === 'in') {
      const d = /^\(([\s\S]*)\)$/.exec(mentah);
      val = d ? pecahTingkatAtas(d[1]).map(bukaKutip) : [];
    } else if (op === 'is') {
      val = mentah === 'null' ? null : mentah === 'true' ? true : mentah === 'false' ? false : mentah;
    }
    if (op === 'eq' && mentah === 'null') opAkhir = 'eq';
    const kond: Kond = { t: 'cmp', kol, op: opAkhir, val };
    return neg ? { t: 'not', item: kond } : kond;
  });
}

export type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
export interface OpsiHitung {
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
}

export interface SpecQuery {
  tabel: string;
  op: Op;
  pilihan: string | undefined;
  opsiHitung: OpsiHitung;
  kond: Kond[];
  urutan: { kol: string; asc: boolean; nullsFirst: boolean }[];
  batas: number | null;
  mulai: number;
  mode: 'banyak' | 'single' | 'maybe';
  payload: Row[];
  onConflict: string[] | null;
  abaikanDuplikat: boolean;
  kembalikan: boolean;
  lempar: boolean;
}

export abstract class PencatatQuery {
  protected op: Op = 'select';
  protected pilihan: string | undefined = '*';
  protected opsiHitung: OpsiHitung = {};
  protected kond: Kond[] = [];
  protected urutan: { kol: string; asc: boolean; nullsFirst: boolean }[] = [];
  protected batas: number | null = null;
  protected mulai = 0;
  protected mode: 'banyak' | 'single' | 'maybe' = 'banyak';
  protected payload: Row[] = [];
  protected onConflict: string[] | null = null;
  protected abaikanDuplikat = false;
  protected kembalikan = false; // mutasi + .select()
  protected lempar = false;

  constructor(protected readonly tabel: string) {}

  // --- operasi ---
  select(kolom = '*', opsi: OpsiHitung = {}): this {
    if (this.op === 'select') {
      this.pilihan = kolom;
      this.opsiHitung = opsi;
    } else {
      this.pilihan = kolom;
      this.kembalikan = true;
    }
    return this;
  }
  insert(nilai: Row | Row[], opsi: { count?: 'exact' } = {}): this {
    this.op = 'insert';
    this.payload = Array.isArray(nilai) ? nilai : [nilai];
    this.pilihan = undefined;
    void opsi;
    return this;
  }
  upsert(nilai: Row | Row[], opsi: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this.op = 'upsert';
    this.payload = Array.isArray(nilai) ? nilai : [nilai];
    this.onConflict = opsi.onConflict ? opsi.onConflict.split(',').map((x) => x.trim()) : null;
    this.abaikanDuplikat = !!opsi.ignoreDuplicates;
    this.pilihan = undefined;
    return this;
  }
  update(nilai: Row): this {
    this.op = 'update';
    this.payload = [nilai];
    this.pilihan = undefined;
    return this;
  }
  delete(): this {
    this.op = 'delete';
    this.pilihan = undefined;
    return this;
  }

  // --- filter ---
  private tambah(kol: string, op: string, val: unknown): this {
    this.kond.push({ t: 'cmp', kol, op, val });
    return this;
  }
  eq(kol: string, v: unknown): this { return this.tambah(kol, 'eq', v); }
  neq(kol: string, v: unknown): this { return this.tambah(kol, 'neq', v); }
  gt(kol: string, v: unknown): this { return this.tambah(kol, 'gt', v); }
  gte(kol: string, v: unknown): this { return this.tambah(kol, 'gte', v); }
  lt(kol: string, v: unknown): this { return this.tambah(kol, 'lt', v); }
  lte(kol: string, v: unknown): this { return this.tambah(kol, 'lte', v); }
  like(kol: string, v: string): this { return this.tambah(kol, 'like', v); }
  ilike(kol: string, v: string): this { return this.tambah(kol, 'ilike', v); }
  is(kol: string, v: null | boolean): this { return this.tambah(kol, 'is', v); }
  in(kol: string, v: unknown[]): this { return this.tambah(kol, 'in', v); }
  contains(): this {
    throw new Error('Filter contains() (kolom JSON/array) belum didukung oleh adapter MariaDB.');
  }
  match(obj: Row): this {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }
  not(kol: string, op: string, v: unknown): this {
    this.kond.push({ t: 'not', item: { t: 'cmp', kol, op, val: v } });
    return this;
  }
  or(filter: string): this {
    this.kond.push({ t: 'or', items: parseKondisi(filter) });
    return this;
  }
  filter(kol: string, op: string, v: unknown): this {
    return this.tambah(kol, op, v);
  }

  // --- bentuk hasil ---
  order(kol: string, opsi: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
    const asc = opsi.ascending !== false;
    // Default Postgres: ASC -> NULL terakhir, DESC -> NULL pertama.
    this.urutan.push({ kol, asc, nullsFirst: opsi.nullsFirst ?? !asc });
    return this;
  }
  limit(n: number): this {
    this.batas = n;
    return this;
  }
  range(dari: number, sampai: number): this {
    this.mulai = dari;
    this.batas = Math.max(0, sampai - dari + 1);
    return this;
  }
  single(): this {
    this.mode = 'single';
    return this;
  }
  maybeSingle(): this {
    this.mode = 'maybe';
    return this;
  }
  throwOnError(): this {
    this.lempar = true;
    return this;
  }
  returns(): this { return this; }
  abortSignal(): this { return this; }

  /** Catatan rantai pemanggilan sebagai data biasa (bisa dikirim lewat JSON). */
  ambilSpec(): SpecQuery {
    return {
      tabel: this.tabel, op: this.op, pilihan: this.pilihan, opsiHitung: this.opsiHitung, kond: this.kond,
      urutan: this.urutan, batas: this.batas, mulai: this.mulai, mode: this.mode, payload: this.payload,
      onConflict: this.onConflict, abaikanDuplikat: this.abaikanDuplikat, kembalikan: this.kembalikan, lempar: this.lempar,
    };
  }

  /** Kebalikan ambilSpec (di server; spec berasal dari browser, jadi TIDAK dipercaya: validasi dilakukan saat dieksekusi). */
  terapkanSpec(sp: SpecQuery): this {
    this.op = sp.op; this.pilihan = sp.pilihan; this.opsiHitung = sp.opsiHitung ?? {}; this.kond = sp.kond ?? [];
    this.urutan = sp.urutan ?? []; this.batas = sp.batas ?? null; this.mulai = sp.mulai ?? 0; this.mode = sp.mode ?? 'banyak';
    this.payload = sp.payload ?? []; this.onConflict = sp.onConflict ?? null; this.abaikanDuplikat = !!sp.abaikanDuplikat;
    this.kembalikan = !!sp.kembalikan; this.lempar = false;
    return this;
  }
}
