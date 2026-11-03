import { NextRequest, NextResponse } from 'next/server';
import { getPengguna } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const user = await getPengguna();

  // Hanya admin/petugas yang boleh trigger sync manual
  if (!user || (user.role !== 'admin' && user.role !== 'petugas')) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  }

  const { spreadsheetId } = await req.json(); // undefined/null => sync SEMUA klinik

  const url = new URL(process.env.GAS_SYNC_WEBAPP_URL!);
  url.searchParams.set('secret', process.env.GAS_SYNC_WEBAPP_SECRET!);
  if (spreadsheetId) {
    url.searchParams.set('mode', 'satu');
    url.searchParams.set('spreadsheetId', spreadsheetId);
  } else {
    url.searchParams.set('mode', 'semua');
  }

  try {
    const resp = await fetch(url.toString());
    const teks = await resp.text();
    return NextResponse.json({ pesan: teks });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghubungi GAS: ' + String(err) }, { status: 502 });
  }
}