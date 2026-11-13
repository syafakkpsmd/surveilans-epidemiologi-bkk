// app/api/dokumen-sign/route.ts
// Tanda tangan unggah Cloudinary KHUSUS dokumen pemeriksaan.
// Beda dari /api/cloudinary-sign: wajib login Petugas/Admin dan folder ditentukan server (tidak bisa diubah klien).
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { FOLDER_DASAR, adalahJenis } from '@/lib/dokumen-pemeriksaan/konfigurasi';

export async function POST(req: Request) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    return NextResponse.json({ error: 'Tidak berwenang' }, { status: 403 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Env Cloudinary belum terbaca di server' }, { status: 500 });
  }

    let jenis: string | undefined;
  try {
    const body = (await req.json()) as { jenis?: string };
    jenis = body.jenis;
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 });
  }
  if (!jenis || !adalahJenis(jenis)) {
    return NextResponse.json({ error: 'Jenis dokumen tidak dikenal' }, { status: 400 });
  }

  const folder = `${FOLDER_DASAR}/${jenis}`;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder });
}