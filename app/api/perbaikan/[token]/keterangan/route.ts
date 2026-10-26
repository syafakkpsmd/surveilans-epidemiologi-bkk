import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso/client';
import { pengawasanIdDariToken, itemTidakSesuai } from '@/lib/pengawasan-klinik/perbaikan';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pid = await pengawasanIdDariToken(token);
  if (!pid) return NextResponse.json({ error: 'Link tidak valid' }, { status: 404 });

  const body = await req.json();
  const itemKey = String(body.item_key ?? '');
  const keterangan = String(body.keterangan ?? '').slice(0, 1000);
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_perbaikan ?? '') ? body.tanggal_perbaikan : null;

  const info = await itemTidakSesuai(pid);
  if (!info || !info.items.some((i) => i.key === itemKey))
    return NextResponse.json({ error: 'Item tidak valid' }, { status: 400 });

  await getTursoClient().execute({
    sql: `INSERT INTO pengawasan_klinik_perbaikan (id, pengawasan_id, item_key, keterangan, tanggal_perbaikan)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            keterangan = VALUES(keterangan),
            tanggal_perbaikan = VALUES(tanggal_perbaikan),
            diisi_pada = UTC_TIMESTAMP()`,
    args: [crypto.randomUUID(), pid, itemKey, keterangan, tanggal],
  });
  return NextResponse.json({ ok: true });
}