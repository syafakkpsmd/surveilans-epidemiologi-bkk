import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso/client';

export const runtime = 'nodejs';
const MAKS_BYTE = 4 * 1024 * 1024; // batas body Vercel ±4,5 MB

// Upload / ganti
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) return NextResponse.json({ error: 'File tidak ada' }, { status: 400 });
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Hanya PDF' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'Maksimal 4 MB' }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  // cek magic number %PDF
  if (String.fromCharCode(...buf.slice(0, 4)) !== '%PDF')
    return NextResponse.json({ error: 'Bukan file PDF valid' }, { status: 400 });

  const turso = await getTursoClient();
  await turso.execute({
    sql: `INSERT INTO pengawasan_klinik_rekomendasi (pengawasan_id, nama_file, ukuran_byte, isi_pdf)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(pengawasan_id) DO UPDATE SET
            nama_file = excluded.nama_file,
            ukuran_byte = excluded.ukuran_byte,
            isi_pdf = excluded.isi_pdf,
            diunggah_pada = datetime('now')`,
    args: [id, file.name, file.size, buf],
  });

  return NextResponse.json({ ok: true, nama_file: file.name });
}

// Lihat / unduh
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unduh = req.nextUrl.searchParams.get('download') === '1';
  const turso = getTursoClient();

  const r = await turso.execute({
    sql: 'SELECT nama_file, isi_pdf FROM pengawasan_klinik_rekomendasi WHERE pengawasan_id = ?',
    args: [id],
  });
  if (r.rows.length === 0) return new NextResponse('Tidak ditemukan', { status: 404 });

  const row = r.rows[0];
  const nama = String(row.nama_file);
  return new NextResponse(row.isi_pdf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${unduh ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(nama)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}