// app/api/klinik/pengaturan/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function GET() {
  const service = createServiceRoleClient();
  const { data } = await service.from('pengaturan_klinik').select('standar_hari_vaksin').eq('id', 1).single();
  return NextResponse.json({ success: true, standar_hari_vaksin: data?.standar_hari_vaksin ?? 14 });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Belum login' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Hanya admin yang bisa mengubah pengaturan ini' }, { status: 403 });
  }

  const body = await req.json();
  const standarHariBaru = Number(body.standar_hari_vaksin);
  if (!Number.isInteger(standarHariBaru) || standarHariBaru <= 0) {
    return NextResponse.json({ success: false, error: 'Nilai harus bilangan bulat positif' }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { error } = await service.from('pengaturan_klinik').update({
    standar_hari_vaksin: standarHariBaru,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }).eq('id', 1);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, standar_hari_vaksin: standarHariBaru });
}