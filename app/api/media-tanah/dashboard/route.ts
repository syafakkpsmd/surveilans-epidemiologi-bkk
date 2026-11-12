// app/api/media-tanah/dashboard/route.ts
// PUBLIK (tamu boleh): hanya angka agregat (jumlah per kesimpulan, temuan, minggu, bulan). Tidak ada nama petugas,
// alamat titik, atau data per pemeriksaan. Rute tulis dan rincian (/api/media-tanah, /upload, /template, /[id]) tetap requireStaf.
import { NextRequest, NextResponse } from 'next/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';
import { ambilDashboard, filterDariQuery } from '@/lib/media-tanah/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const data = await ambilDashboard(filterDariQuery(req.nextUrl.searchParams, await getKamusWilker()));
  return NextResponse.json(data);
}
