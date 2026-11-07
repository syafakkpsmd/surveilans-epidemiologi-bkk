// app/api/media-tanah/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaf } from '@/lib/media-tanah/auth';
import { validasiPemeriksaan } from '@/lib/media-tanah/validasi';
import { simpanPemeriksaan, daftarPemeriksaan, filterDariQuery } from '@/lib/media-tanah/server';

export const runtime = 'nodejs';

// Simpan satu formulir dari halaman input
export async function POST(req: NextRequest) {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Data tidak terbaca' }, { status: 400 });

  const h = validasiPemeriksaan(body, { wilayah: String(body.wilayah ?? '') });
  if (!h.ok) return NextResponse.json({ error: h.error }, { status: 400 });

  const id = await simpanPemeriksaan(h.data, user.nama, 'input');
  if (id == null)
    return NextResponse.json(
      { error: 'Pemeriksaan untuk tanggal, pelabuhan, area, dan titik yang sama sudah ada' },
      { status: 409 }
    );
  return NextResponse.json({ ok: true, id });
}

// Daftar: /api/media-tanah?wilayah=WK01&dari=2026-01-01&sampai=2026-03-31&kesimpulan=tidak_memenuhi&q=pelabuhan
export async function GET(req: NextRequest) {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get('limit')) || 50, 200);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  const data = await daftarPemeriksaan(filterDariQuery(sp), limit, offset);
  return NextResponse.json({ data });
}