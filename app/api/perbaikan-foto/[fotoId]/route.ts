import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fotoId: string }> }) {
  const { fotoId } = await params;
  const r = await getDbClient().execute({
    sql: 'SELECT isi_foto FROM pengawasan_klinik_perbaikan_foto WHERE id = ?',
    args: [fotoId],
  });
  if (r.rows.length === 0) return new NextResponse('Tidak ditemukan', { status: 404 });
  return new NextResponse(r.rows[0].isi_foto as ArrayBuffer, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' },
  });
}