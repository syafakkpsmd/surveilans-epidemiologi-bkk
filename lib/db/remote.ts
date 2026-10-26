// lib/db/remote.ts  (SERVER)
// Menjalankan query yang dikirim dari browser (lib/db/browser-client.ts) lewat /api/db.
// Isi permintaan TIDAK dipercaya: bentuk divalidasi ketat, lalu dijalankan lewat query builder yang sama dengan
// server, dengan penjaga RLS (lib/db/rls.ts). Nama tabel/kolom divalidasi lagi di query-builder (id()).
import { dbFrom, dbRpc } from './query-builder';
import type { Penjaga } from './rls';
import type { DbResponse, Kond, SpecQuery } from './spec';

export class SpecTidakValid extends Error {}

const RE_ID = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const OP_FILTER = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in']);
const OP_TULIS = new Set(['select', 'insert', 'update', 'upsert', 'delete']);
export const RPC_DIIZINKAN = new Set(['status_lapor_mingguan', 'status_lapor_bulanan']);
const MAKS_BARIS_TULIS = 5000;
const MAKS_BATAS = 100_000;

const tak = (m: string): never => {
  throw new SpecTidakValid(m);
};
const skalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

function cekKond(k: unknown, kedalaman = 0): Kond {
  if (kedalaman > 6 || typeof k !== 'object' || k === null) return tak('kondisi tidak valid');
  const o = k as Record<string, unknown>;
  if (o.t === 'cmp') {
    if (typeof o.kol !== 'string' || !RE_ID.test(o.kol)) return tak('nama kolom filter tidak valid');
    if (typeof o.op !== 'string' || !OP_FILTER.has(o.op)) return tak('operator filter tidak diizinkan');
    const v = o.val;
    if (!(skalar(v) || (Array.isArray(v) && v.length <= 1000 && v.every(skalar)))) return tak('nilai filter tidak valid');
    return { t: 'cmp', kol: o.kol, op: o.op, val: v };
  }
  if (o.t === 'and' || o.t === 'or') {
    if (!Array.isArray(o.items) || o.items.length > 50) return tak('daftar kondisi tidak valid');
    return { t: o.t, items: o.items.map((x) => cekKond(x, kedalaman + 1)) };
  }
  if (o.t === 'not') return { t: 'not', item: cekKond(o.item, kedalaman + 1) };
  return tak('jenis kondisi tidak dikenal');
}

/** Validasi + bentuk ulang spec dari browser menjadi SpecQuery yang aman. */
export function periksaSpec(mentah: unknown): SpecQuery {
  if (typeof mentah !== 'object' || mentah === null) return tak('spec kosong');
  const s = mentah as Record<string, unknown>;
  if (typeof s.tabel !== 'string' || !RE_ID.test(s.tabel)) return tak('nama tabel tidak valid');
  if (typeof s.op !== 'string' || !OP_TULIS.has(s.op)) return tak('operasi tidak dikenal');
  if (s.pilihan !== undefined && (typeof s.pilihan !== 'string' || s.pilihan.length > 2000)) return tak('daftar kolom tidak valid');
  const urutan = Array.isArray(s.urutan) ? s.urutan : [];
  if (urutan.length > 10) return tak('terlalu banyak order');
  const batas = s.batas === null || s.batas === undefined ? null : Number(s.batas);
  if (batas !== null && !(Number.isFinite(batas) && batas >= 0 && batas <= MAKS_BATAS)) return tak('limit tidak valid');
  const mulai = Number(s.mulai ?? 0);
  if (!(Number.isFinite(mulai) && mulai >= 0 && mulai <= 10_000_000)) return tak('offset tidak valid');
  const payload = Array.isArray(s.payload) ? s.payload : [];
  if (payload.length > MAKS_BARIS_TULIS) return tak('terlalu banyak baris');
  for (const r of payload) {
    if (typeof r !== 'object' || r === null || Array.isArray(r)) return tak('baris tulis tidak valid');
    for (const kol of Object.keys(r)) if (!RE_ID.test(kol)) return tak('nama kolom tulis tidak valid');
  }
  const oc = s.onConflict;
  if (oc !== null && oc !== undefined && !(Array.isArray(oc) && oc.every((x) => typeof x === 'string' && RE_ID.test(x)))) return tak('onConflict tidak valid');
  const oh = (s.opsiHitung ?? {}) as Record<string, unknown>;
  return {
    tabel: s.tabel,
    op: s.op as SpecQuery['op'],
    pilihan: s.pilihan as string | undefined,
    opsiHitung: { count: oh.count === 'exact' || oh.count === 'planned' || oh.count === 'estimated' ? oh.count : undefined, head: oh.head === true },
    kond: (Array.isArray(s.kond) ? s.kond : []).map((x) => cekKond(x)),
    urutan: urutan.map((o) => {
      const x = o as Record<string, unknown>;
      if (typeof x?.kol !== 'string' || !RE_ID.test(x.kol)) return tak('kolom order tidak valid');
      return { kol: x.kol, asc: x.asc !== false, nullsFirst: x.nullsFirst === true };
    }),
    batas,
    mulai,
    mode: s.mode === 'single' || s.mode === 'maybe' ? s.mode : 'banyak',
    payload: payload as SpecQuery['payload'],
    onConflict: (oc as string[] | null | undefined) ?? null,
    abaikanDuplikat: s.abaikanDuplikat === true,
    kembalikan: s.kembalikan === true,
    lempar: false,
  };
}

export type PermintaanRemote =
  | { jenis: 'query'; spec: unknown }
  | { jenis: 'rpc'; nama: string; args?: Record<string, unknown> };

export async function jalankanRemote(minta: PermintaanRemote, penjaga: Penjaga): Promise<DbResponse> {
  if (minta.jenis === 'rpc') {
    if (!RPC_DIIZINKAN.has(minta.nama)) return tak('prosedur tidak diizinkan dari browser');
    return dbRpc(minta.nama, (minta.args ?? {}) as Record<string, never>) as PromiseLike<DbResponse> as Promise<DbResponse>;
  }
  const spec = periksaSpec(minta.spec);
  return dbFrom(spec.tabel, penjaga).terapkanSpec(spec) as unknown as Promise<DbResponse>;
}
