import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createClient } from '@/lib/supabase/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  const role = await getUserRole();
  if (role === 'tamu') {
    return NextResponse.json({ error: 'Harus login untuk upload foto.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const judul = formData.get('judul') as string | null;
  const deskripsi = formData.get('deskripsi') as string | null;

  if (!file || !judul) {
    return NextResponse.json({ error: 'File dan judul wajib diisi.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const hasilUpload = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'foto-kegiatan-bkk' }, (error, result) => {
        if (error || !result) reject(error);
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      })
      .end(buffer);
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: errorInsert } = await supabase.from('foto_kegiatan').insert({
    judul,
    deskripsi: deskripsi || null,
    url_gambar: hasilUpload.secure_url,
    public_id: hasilUpload.public_id,
    diupload_oleh: user?.id ?? null,
  });

  if (errorInsert) {
    return NextResponse.json({ error: `Gagal simpan metadata: ${errorInsert.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const role = await getUserRole();
  if (role === 'tamu') {
    return NextResponse.json({ error: 'Harus login untuk hapus foto.' }, { status: 403 });
  }

  const { id, publicId } = await req.json();
  if (!id || !publicId) {
    return NextResponse.json({ error: 'id dan publicId wajib diisi.' }, { status: 400 });
  }

  await cloudinary.uploader.destroy(publicId);

  const supabase = await createClient();
  const { error } = await supabase.from('foto_kegiatan').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: `Gagal hapus data: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}