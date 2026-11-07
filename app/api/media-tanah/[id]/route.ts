// app/api/media-tanah/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaf } from '@/lib/media-tanah/auth';
import { ambilDetail } from '@/lib/media-tanah/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  const data = await ambilDetail(id);
  if (!data) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
  return NextResponse.json(data);
}