// app/api/klinik/[id]/route.ts — baca data 1 klinik
import { NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso/client';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: klinik, error } = await supabase
    .from('klinik_binaan')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !klinik) {
    return NextResponse.json({ success: false, error: 'Klinik tidak ditemukan' }, { status: 404 });
  }
  if (!klinik.spreadsheet_id) {
    return NextResponse.json({ success: false, error: 'Klinik ini belum punya sheet' }, { status: 400 });
  }

  try {
    const client = getTursoClient();

    const [hasilIcv, hasilStok] = await Promise.all([
      client.execute({
        sql: 'SELECT raw_json FROM data_icv WHERE spreadsheet_id = ? ORDER BY no_baris ASC',
        args: [klinik.spreadsheet_id],
      }),
      client.execute({
        sql: 'SELECT jenis_stok, raw_json FROM stok_vaksin WHERE spreadsheet_id = ? ORDER BY jenis_stok, no_baris ASC',
        args: [klinik.spreadsheet_id],
      }),
    ]);

    const icv = hasilIcv.rows.map((row) => JSON.parse(row.raw_json as string));

    const stok: Record<string, unknown[]> = {};
    for (const row of hasilStok.rows) {
      const jenis = row.jenis_stok as string;
      (stok[jenis] ??= []).push(JSON.parse(row.raw_json as string));
    }

    return NextResponse.json({ success: true, klinik, data: { icv, stok } });
  } catch (e: unknown) {
    const pesan = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: pesan }, { status: 500 });
  }
}