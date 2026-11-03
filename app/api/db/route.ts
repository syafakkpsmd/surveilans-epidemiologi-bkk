// POST /api/db : jalur data untuk Client Component (lihat lib/db/browser-client.ts).
// Tidak ada akses langsung browser -> database. Setiap permintaan: (1) cek asal, (2) validasi bentuk,
// (3) identitas dari sesi MariaDB (cookie epic_sesi), (4) aturan RLS tiruan, (5) baru dieksekusi.
import { NextResponse } from 'next/server';
import { buatPenjagaDariSesi } from '@/lib/db/penjaga-sesi';
import { jalankanRemote, SpecTidakValid } from '@/lib/db/remote';
import type { PermintaanRemote } from '@/lib/db/remote';

export const dynamic = 'force-dynamic';
const MAKS_BYTE = 5 * 1024 * 1024;

const galat = (pesan: string, status: number, code = 'PGRST100') =>
  NextResponse.json({ data: null, error: { message: pesan, code, details: null, hint: null }, count: null, status, statusText: '' }, { status });

export async function POST(req: Request) {
  // Cegah permintaan lintas situs: Origin (bila ada) harus sama dengan host permintaan.
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return galat('Asal permintaan tidak diizinkan.', 403, '42501');
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return galat('Content-Type harus application/json.', 415);
  if (Number(req.headers.get('content-length') ?? 0) > MAKS_BYTE) return galat('Permintaan terlalu besar.', 413);

  let badan: PermintaanRemote;
  try {
    badan = (await req.json()) as PermintaanRemote;
  } catch {
    return galat('JSON tidak valid.', 400);
  }
  try {
    const hasil = await jalankanRemote(badan, buatPenjagaDariSesi());
    return NextResponse.json(hasil);
  } catch (e) {
    if (e instanceof SpecTidakValid) return galat(e.message, 400);
    return galat('Terjadi kesalahan pada server.', 500, 'XX000');
  }
}
