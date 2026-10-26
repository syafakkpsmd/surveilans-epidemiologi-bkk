// lib/db/browser-client.ts  (BROWSER)
// Pengganti .from()/.rpc() Supabase di Client Component ketika DATA_BACKEND=mariadb.
// Tidak pernah menghubungi database: rantai pemanggilan dicatat lalu dikirim ke POST /api/db, yang memeriksa
// sesi + aturan RLS (lib/db/rls.ts) dan menjalankannya di server. Aman diimpor dari 'use client'.
import { PencatatQuery } from './spec';
import type { DbResponse, Row } from './spec';

async function kirim(badan: unknown): Promise<DbResponse> {
  try {
    const r = await fetch('/api/db', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badan),
    });
    const j = (await r.json()) as DbResponse;
    return j;
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : 'Gagal menghubungi server', code: 'FETCH_ERROR', details: null, hint: null },
      count: null,
      status: 0,
      statusText: 'Network Error',
    };
  }
}

class QueryBrowser extends PencatatQuery implements PromiseLike<DbResponse> {
  then<A = DbResponse, B = never>(
    ok?: ((v: DbResponse) => A | PromiseLike<A>) | null,
    gagal?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    const lempar = this.lempar;
    return kirim({ jenis: 'query', spec: this.ambilSpec() })
      .then((h) => {
        if (lempar && h.error) throw Object.assign(new Error(h.error.message), { code: h.error.code });
        return h;
      })
      .then(ok, gagal);
  }
}

export function dbRpcBrowser(nama: string, args: Row = {}): PromiseLike<DbResponse> {
  const p = kirim({ jenis: 'rpc', nama, args });
  return { then: (ok, gagal) => p.then(ok, gagal) };
}

export function dataDiMariaDbBrowser(): boolean {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === 'mariadb';
}

/** Bungkus klien Supabase browser: .from()/.rpc() lewat /api/db; .auth tetap Supabase. */
export function pakaiMariaDbDiBrowser<T extends object>(klien: T): T {
  if (!dataDiMariaDbBrowser()) return klien;
  return new Proxy(klien, {
    get(target, prop, receiver) {
      if (prop === 'from') return (tabel: string) => new QueryBrowser(tabel);
      if (prop === 'rpc') return dbRpcBrowser;
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
