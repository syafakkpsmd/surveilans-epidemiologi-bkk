import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTursoClient } from '@/lib/turso/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const turso = getTursoClient();

  const ada = await turso.execute({
    sql: 'SELECT token FROM pengawasan_klinik_link_perbaikan WHERE pengawasan_id = ?',
    args: [id],
  });
  let token = ada.rows[0]?.token as string | undefined;
  if (!token) {
    token = randomBytes(24).toString('base64url');
    await turso.execute({
      sql: 'INSERT INTO pengawasan_klinik_link_perbaikan (pengawasan_id, token) VALUES (?, ?)',
      args: [id, token],
    });
  }
  return NextResponse.json({ url: `${req.nextUrl.origin}/perbaikan/${token}` });
}