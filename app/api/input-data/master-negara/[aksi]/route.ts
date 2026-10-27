// app/api/input-data/master-negara/[aksi]/route.ts
// Master pelabuhan -> negara (satu untuk semua wilayah kerja).
//   GET    .../daftar?cari&halaman   GET .../belum   (pelabuhan di data COP yang belum ada di master)
//   POST   .../simpan  JSON {nama, negara}     POST .../terapkan  (isi negara COP yang masih kosong)
//   POST   .../unggah  multipart file, mode=pratinjau|simpan
//   DELETE .../hapus?id=  (admin)
// Akses: admin dan petugas; hapus khusus admin. Rute memakai MariaDB langsung (tanpa RLS).
import { NextRequest, NextResponse } from 'next/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getAuthUser } from '@/lib/auth/getAuthUser';
import { MAKS_BYTE } from '@/lib/input-data/parse-excel';
import { belumTerdaftar, daftarMaster, hapusMaster, simpanMaster, terapkanMasterKeData, unggahMaster } from '@/lib/input-data/master';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ aksi: string }> };
const galat = (pesan: string, status: number) => NextResponse.json({ error: pesan }, { status });

async function peran(): Promise<string | NextResponse> {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !role) return galat('Harus login', 401);
  if (role !== 'admin' && role !== 'petugas') return galat('Tidak diizinkan', 403);
  return role;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const p = await peran();
  if (typeof p !== 'string') return p;
  const { aksi } = await ctx.params;
  try {
    if (aksi === 'daftar') {
      const sp = req.nextUrl.searchParams;
      return NextResponse.json(await daftarMaster((sp.get('cari') ?? '').slice(0, 100), Number(sp.get('halaman')) || 1));
    }
    if (aksi === 'belum') return NextResponse.json({ belum: await belumTerdaftar() });
  } catch (e) {
    console.error('[master-negara] GET', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const p = await peran();
  if (typeof p !== 'string') return p;
  const { aksi } = await ctx.params;
  const { user } = await getAuthUser();
  const pengguna = user?.email ?? 'tidak diketahui';
  try {
    if (aksi === 'simpan') {
      const b = (await req.json().catch(() => null)) as { nama?: string; negara?: string } | null;
      if (!b || typeof b.nama !== 'string' || typeof b.negara !== 'string') return galat('Isian tidak valid', 400);
      const r = await simpanMaster(b.nama, b.negara, pengguna);
      return r === 'ok' ? NextResponse.json({ ok: true }) : galat('Nama pelabuhan dan negara harus terisi', 400);
    }
    if (aksi === 'terapkan') return NextResponse.json({ terisi: await terapkanMasterKeData() });
    if (aksi === 'unggah') {
      const form = await req.formData();
      const berkas = form.get('file');
      if (!(berkas instanceof File)) return galat('Berkas belum dipilih', 400);
      if (berkas.size > MAKS_BYTE) return galat(`Berkas lebih dari ${MAKS_BYTE / 1024 / 1024} MB`, 413);
      const r = await unggahMaster(Buffer.from(await berkas.arrayBuffer()), pengguna, form.get('mode') === 'simpan');
      if (r.fatal) return galat(r.fatal, 400);
      return NextResponse.json(r);
    }
  } catch (e) {
    console.error('[master-negara] POST', aksi, (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
  return galat('Aksi tidak dikenal', 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const p = await peran();
  if (typeof p !== 'string') return p;
  if (p !== 'admin') return galat('Hanya admin yang boleh menghapus', 403);
  const { aksi } = await ctx.params;
  if (aksi !== 'hapus') return galat('Aksi tidak dikenal', 404);
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return galat('id tidak valid', 400);
  try {
    return NextResponse.json({ dihapus: await hapusMaster(id) });
  } catch (e) {
    console.error('[master-negara] DELETE', (e as Error).message);
    return galat('Terjadi kesalahan pada server', 500);
  }
}
