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

export async function PATCH(req: NextRequest) {
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'petugas') {
    return NextResponse.json({ error: 'Tidak diizinkan mengedit jenis kegiatan.' }, { status: 403 });
  }

  const { id, nama } = await req.json();
  const namaBersih = String(nama ?? '').trim();
  if (!id || !namaBersih) {
    return NextResponse.json({ error: 'id dan nama wajib diisi.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jenis_kegiatan_foto')
    .update({ nama: namaBersih })
    .eq('id', id)
    .select('id, nama');

  if (error) {
    return NextResponse.json({ error: `Gagal update jenis kegiatan: ${error.message}` }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Tidak ada jenis kegiatan yang diupdate.' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: data[0] });
}