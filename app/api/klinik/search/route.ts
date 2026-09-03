// app/api/klinik/search/route.ts
import { NextResponse } from 'next/server';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { parseTanggalSheet } from '@/lib/klinik/tanggal';

function formatTanggal(nilai: any): string {
  const tgl = parseTanggalSheet(nilai);
  return tgl ? tgl.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim().toLowerCase();

  if (!q || q.length < 3) {
    return NextResponse.json({ success: false, error: 'Kata kunci minimal 3 karakter' }, { status: 400 });
  }

  const dataset = await getDatasetKlinik();
  const hasil = dataset.flatMap((d) =>
    d.icv
      .filter((row: Record<string, any>) => {
        const nama = String(row['Nama'] ?? '').toLowerCase();
        const nik = String(row['NIK'] ?? '').toLowerCase();
        const paspor = String(row['No Paspor'] ?? '').toLowerCase();
        return nama.includes(q) || nik.includes(q) || paspor.includes(q);
      })
      .map((row: Record<string, any>) => ({
        ...row,
        nama_klinik: d.klinik.nama_klinik,
        'Tanggal Terbit': formatTanggal(row['Tanggal Terbit']),
        'Tanggal Berangkat': formatTanggal(row['Tanggal Berangkat']),
        'Tanggal Lahir': formatTanggal(row['Tanggal Lahir']),
      }))
  );

  return NextResponse.json({ success: true, total: hasil.length, hasil: hasil.slice(0, 100) });
}