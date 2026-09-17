import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { getStokDenganFilter } from '@/lib/klinik/stok-queries';
import { ambilTerbit, ambilRusak, JENIS_STOK_LABEL } from '@/lib/klinik/agregasiStok';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mulai = searchParams.get('mulai');
  const akhir = searchParams.get('akhir');
  const klinikIds = searchParams.get('klinik')?.split(',').filter(Boolean);

  if (!mulai || !akhir) {
    return NextResponse.json(
      { error: 'Parameter mulai dan akhir wajib diisi (format yyyy-MM-dd)' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  let query = supabase.from('klinik_binaan').select('id, nama_klinik, kategori, spreadsheet_id');
  if (klinikIds?.length) query = query.in('id', klinikIds);
  const { data: daftarKlinik } = await query;

  const idsValid = (daftarKlinik ?? []).map((k) => k.spreadsheet_id).filter(Boolean) as string[];
  const baris = await getStokDenganFilter(idsValid, mulai, akhir);

  const jenisUnik = Array.from(new Set(baris.map((b) => b.jenisStok)));
  const data = jenisUnik.map((jenis) => {
    const barisJenis = baris.filter((b) => b.jenisStok === jenis);
    return {
      jenis,
      label: JENIS_STOK_LABEL[jenis] ?? jenis,
      Terbit: barisJenis.reduce((a, b) => a + ambilTerbit(b.data), 0),
      Rusak: barisJenis.reduce((a, b) => a + ambilRusak(b.data), 0),
    };
  });

  return NextResponse.json({ success: true, data });
}