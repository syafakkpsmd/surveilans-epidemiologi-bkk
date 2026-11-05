// app/api/vektor/anopheles/lokasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { KODE_WILAYAH } from '@/lib/vektor/umum';
import { bacaZona } from '@/lib/vektor/anopheles/config';
import { bersihNama, daftarLokasi, hapusLokasi, tambahLokasi, ubahLokasi } from '@/lib/vektor/anopheles/lokasi';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });
const wilayahValid = (v: unknown): v is string => typeof v === 'string' && KODE_WILAYAH.includes(v);
const namaValid = (n: string) => n.length >= 1 && n.length <= 120;

// /api/vektor/anopheles/lokasi?wilayah=WK03&zona=Buffer
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const wilayah = sp.get('wilayah');
  const zona = bacaZona(sp.get('zona'));
  if (!wilayahValid(wilayah) || !zona) return salah('Wilayah kerja dan zona wajib dipilih');
  return NextResponse.json({ data: await daftarLokasi(wilayah, zona) });
}

// body: { wilayah, zona, nama }
export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const zona = bacaZona(body?.zona);
  const nama = bersihNama(body?.nama);
  if (!body || !wilayahValid(body.wilayah) || !zona) return salah('Wilayah kerja dan zona wajib dipilih');
  if (!namaValid(nama)) return salah('Nama lokasi wajib diisi (maks 120 karakter)');

  if ((await tambahLokasi(body.wilayah, zona, nama)) === 'duplikat') return salah('Lokasi itu sudah ada di daftar', 409);
  return NextResponse.json({ ok: true, nama });
}

// body: { id, nama } - ikut mengganti nama di semua survei yang memakainya
export async function PATCH(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const nama = bersihNama(body?.nama);
  if (!body || !Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!namaValid(nama)) return salah('Nama lokasi wajib diisi (maks 120 karakter)');

  const r = await ubahLokasi(id, nama);
  if (r.status === 'duplikat') return salah('Nama lokasi itu sudah ada di daftar', 409);
  if (r.status === 'tidak_ada') return salah('Lokasi tidak ditemukan', 404);
  return NextResponse.json({ ok: true, nama, diubah: r.diubah });
}

// /api/vektor/anopheles/lokasi?id=5
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!(await hapusLokasi(id))) return salah('Lokasi tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}