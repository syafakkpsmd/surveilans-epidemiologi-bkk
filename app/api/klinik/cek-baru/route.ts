import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cekKlinikBaru } from '@/lib/klinik/deteksi-klinik-baru';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  }

  const daftar = await cekKlinikBaru();
  return NextResponse.json({ success: true, daftar });
}