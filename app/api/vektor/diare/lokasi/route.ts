// app/api/vektor/diare/lokasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { JENIS, type Jenis } from '@/lib/vektor/diare/config';
import { bersihNama, daftarLokasi, hapusLokasi, tambahLokasi, ubahLokasi } from '@/lib/vektor/diare/lokasi';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });
const jenisValid = (v: unknown): v is Jenis => JENIS.includes(v as Jenis);
const wilayahValid = (v: unknown): v is string => typeof v === 'string' && wk.isKode(v);
const namaValid = (n: string) => n.length >= 1 && n.length <= 120;

// /api/vektor/diare/lokasi?jenis=lalat&wilayah=WK01
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const jenis = sp.get('jenis');
  const wilayah = sp.get('wilayah');
  if (!jenisValid(jenis) || !wilayahValid(wilayah)) return salah('Jenis dan wilayah kerja wajib dipilih');
  return NextResponse.json({ data: await daftarLokasi(jenis, wilayah) });
}

// body: { jenis, wilayah, nama }
export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const nama = bersihNama(body?.nama);
  if (!body || !jenisValid(body.jenis) || !wilayahValid(body.wilayah)) return salah('Jenis dan wilayah kerja wajib dipilih');
  if (!namaValid(nama)) return salah('Nama lokasi wajib diisi (maks 120 karakter)');

  if ((await tambahLokasi(body.jenis, body.wilayah, nama)) === 'duplikat') return salah('Lokasi itu sudah ada di daftar', 409);
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

// /api/vektor/diare/lokasi?id=5
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!(await hapusLokasi(id))) return salah('Lokasi tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}