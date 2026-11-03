// GET /api/input-data/pesawat/template : unduh template Excel pengisian data pesawat (Petugas/Admin).
import { NextResponse } from 'next/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { buatTemplatePesawat } from '@/lib/db/modul/excelPesawat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  }
  const berkas = await buatTemplatePesawat();
  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-data-pesawat.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
