// app/api/ckg/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCkg } from '@/lib/klinik/ckg/auth';
import { validasiBaris } from '@/lib/klinik/ckg/validasi';
import { simpanBanyak, daftarPemeriksaan, filterDariQuery } from '@/lib/klinik/ckg/server';

export const runtime = 'nodejs';

// Input satu orang dari form
export async function POST(req: NextRequest) {
  const user = await requireCkg();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Data tidak terbaca' }, { status: 400 });

  const h = validasiBaris(body, { wilayah: String(body.wilayah ?? '') });
  if (!h.ok) return NextResponse.json({ error: h.error }, { status: 400 });

  const r = await simpanBanyak([h.data], user.nama, 'input');
  if (r.masuk === 0)
    return NextResponse.json(
      { error: 'Data dengan nama, tanggal, dan wilayah yang sama sudah ada' },
      { status: 409 }
    );
  return NextResponse.json({ ok: true, imt: h.data.imt });
}

// Query daftar: /api/ckg?wilayah=...&dari=2026-01-01&sampai=2026-03-31&umur_min=40&umur_max=59
export async function GET(req: NextRequest) {
  const user = await requireCkg();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get('limit')) || 100, 500);
  const offset = Number(sp.get('offset')) || 0;
  const data = await daftarPemeriksaan(filterDariQuery(sp), limit, offset);
  return NextResponse.json({ data });
}