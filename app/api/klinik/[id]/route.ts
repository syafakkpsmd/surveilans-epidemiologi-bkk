// app/api/klinik/[id]/route.ts — baca data 1 klinik
import { NextResponse } from 'next/server';
import { readKlinikWorkbook } from '@/lib/klinik/sheets';
import { createClient } from '@/lib/supabase/server'; // sesuaikan dgn setup Supabase kamu

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient(); // <-- tambah await di sini
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
    const data = await readKlinikWorkbook(klinik.spreadsheet_id);
    return NextResponse.json({ success: true, klinik, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}