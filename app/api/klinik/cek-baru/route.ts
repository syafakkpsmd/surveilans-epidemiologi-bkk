import { NextResponse } from 'next/server';
import { getPengguna } from '@/lib/auth/session';
import { cekKlinikBaru } from '@/lib/klinik/deteksi-klinik-baru';

export async function GET() {
  const user = await getPengguna();

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  }

  const daftar = await cekKlinikBaru();
  return NextResponse.json({ success: true, daftar });
}