import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'petugas') {
    return NextResponse.json({ error: 'Tidak diizinkan menambah jenis kegiatan.' }, { status: 403 });
  }

  const { nama } = await req.json();
  const namaBersih = String(nama ?? '').trim();
  if (!namaBersih) {
    return NextResponse.json({ error: 'Nama jenis kegiatan wajib diisi.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jenis_kegiatan_foto')
    .insert({ nama: namaBersih })
    .select('id, nama')
    .single();

  if (error) {
    return NextResponse.json({ error: `Gagal tambah jenis kegiatan: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}