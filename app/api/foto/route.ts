import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';
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
  const jenisKegiatanIdRaw = formData.get('jenisKegiatanId') as string | null;
  const jenisKegiatanId = jenisKegiatanIdRaw ? Number(jenisKegiatanIdRaw) : null;

  if (!file || !judul || !jenisKegiatanId) {
    return NextResponse.json(
      { error: 'File, judul, dan jenis kegiatan wajib diisi.' },
      { status: 400 }
    );
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

  const user = await getPengguna();

  try {
    await getDbClient().execute({
      sql: `INSERT INTO foto_kegiatan (judul, deskripsi, url_gambar, public_id, diupload_oleh, jenis_kegiatan_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        judul,
        deskripsi || null,
        hasilUpload.secure_url,
        hasilUpload.public_id,
        user?.id ?? null,
        jenisKegiatanId,
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Gagal simpan metadata: ${err?.message ?? err}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'petugas') {
    return NextResponse.json({ error: 'Tidak diizinkan mengedit foto.' }, { status: 403 });
  }

  const { id, judul, deskripsi, jenisKegiatanId } = await req.json();
  const judulBersih = String(judul ?? '').trim();

  if (!id || !judulBersih) {
    return NextResponse.json({ error: 'id dan judul wajib diisi.' }, { status: 400 });
  }

  const db = getDbClient();
  try {
    await db.execute({
      sql: 'UPDATE foto_kegiatan SET judul = ?, deskripsi = ?, jenis_kegiatan_id = ? WHERE id = ?',
      args: [
        judulBersih,
        deskripsi ? String(deskripsi).trim() || null : null,
        jenisKegiatanId ?? null,
        id,
      ],
    });

    const { rows } = await db.execute({
      sql: 'SELECT id, judul, deskripsi, jenis_kegiatan_id FROM foto_kegiatan WHERE id = ?',
      args: [id],
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada foto yang diupdate.' }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: `Gagal update foto: ${err?.message ?? err}` }, { status: 500 });
  }
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

  try {
    await getDbClient().execute({ sql: 'DELETE FROM foto_kegiatan WHERE id = ?', args: [id] });
  } catch (err: any) {
    return NextResponse.json({ error: `Gagal hapus data: ${err?.message ?? err}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}