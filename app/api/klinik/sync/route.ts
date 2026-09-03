// app/api/klinik/sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listFilesInFolder } from '@/lib/klinik/sheets'; // fungsi Drive files.list yg sudah ada

export async function GET() {
  const supabase = await createClient();
  const filesDiDrive = await listFilesInFolder();
  const { data: existing } = await supabase.from('klinik_binaan').select('id, nama_klinik, spreadsheet_id');

  const idSudahTerpakai = new Set((existing ?? []).map((k) => k.spreadsheet_id).filter(Boolean));
  const belumTerdaftar = filesDiDrive.filter(
    (f: any) => f.name !== 'Template Klinik' && !idSudahTerpakai.has(f.id)
  );

  return NextResponse.json({
    success: true,
    belumTerdaftar: belumTerdaftar.map((f: any) => ({ spreadsheet_id: f.id, nama_file: f.name })),
    klinikTanpaSpreadsheet: (existing ?? []).filter((k) => !k.spreadsheet_id), // mis. Medica Sendawar
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  // body: { tautkan: [{ klinik_id, spreadsheet_id }], baru: [{ nama_klinik, spreadsheet_id, alamat_klinik?, kabupaten_kota?, telepon? }] }

  const hasil = { ditautkan: 0, ditambahkan: 0, error: [] as string[] };

  for (const item of body.tautkan ?? []) {
    const { error } = await supabase
      .from('klinik_binaan')
      .update({ spreadsheet_id: item.spreadsheet_id })
      .eq('id', item.klinik_id);
    if (error) hasil.error.push(`Gagal tautkan ${item.klinik_id}: ${error.message}`);
    else hasil.ditautkan++;
  }

  for (const item of body.baru ?? []) {
    const { error } = await supabase.from('klinik_binaan').insert({
      nama_klinik: item.nama_klinik,
      spreadsheet_id: item.spreadsheet_id,
      alamat_klinik: item.alamat_klinik ?? null,
      jenis_fasilitas: item.jenis_fasilitas ?? 'Klinik',
      kabupaten_kota: item.kabupaten_kota ?? null,
      telepon: item.telepon ?? null,
    });
    if (error) hasil.error.push(`Gagal tambah ${item.nama_klinik}: ${error.message}`);
    else hasil.ditambahkan++;
  }

  return NextResponse.json({ success: hasil.error.length === 0, ...hasil });
}