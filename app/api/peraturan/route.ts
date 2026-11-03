// app/api/klinik/pengaturan/route.ts
import { NextResponse } from 'next/server';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';
import { getStandarHariVaksin } from '@/lib/klinik/pengaturan';

export async function GET() {
  return NextResponse.json({ success: true, standar_hari_vaksin: await getStandarHariVaksin() });
}

export async function POST(req: Request) {
  const user = await getPengguna();
  if (!user) return NextResponse.json({ success: false, error: 'Belum login' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Hanya admin yang bisa mengubah pengaturan ini' }, { status: 403 });
  }

  const body = await req.json();
  const standarHariBaru = Number(body.standar_hari_vaksin);
  if (!Number.isInteger(standarHariBaru) || standarHariBaru <= 0) {
    return NextResponse.json({ success: false, error: 'Nilai harus bilangan bulat positif' }, { status: 400 });
  }

  try {
    // UPSERT: baris id=1 dibuat bila belum ada (update Supabase lama diam-diam tidak berbuat apa-apa)
    await getDbClient().execute({
      sql: `INSERT INTO pengaturan_klinik (id, standar_hari_vaksin, updated_by) VALUES (1, ?, ?)
            ON CONFLICT (id) DO UPDATE SET standar_hari_vaksin = EXCLUDED.standar_hari_vaksin,
                                    updated_by = EXCLUDED.updated_by, updated_at = now()`,
      args: [standarHariBaru, user.id],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'Gagal menyimpan' }, { status: 500 });
  }
  return NextResponse.json({ success: true, standar_hari_vaksin: standarHariBaru });
}