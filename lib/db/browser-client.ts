// lib/db/browser-client.ts  (BROWSER)
// Klien data untuk Client Component.
// Tidak pernah menghubungi database: rantai pemanggilan dicatat lalu dikirim ke POST /api/db, yang memeriksa
// sesi + aturan RLS (lib/db/rls.ts) dan menjalankannya di server. Aman diimpor dari 'use client'.
import { PencatatQuery } from './spec';
import type { DbResponse, Row } from './spec';
import type { DbKlien } from './tipe';

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

/** Klien data untuk Client Component: .from()/.rpc() lewat POST /api/db (RLS dan eksekusi di server). */
export function createDbBrowserClient(): DbKlien {
  return { from: (tabel: string) => new QueryBrowser(tabel), rpc: dbRpcBrowser } as unknown as DbKlien;
}
