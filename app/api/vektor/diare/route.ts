// app/api/vektor/diare/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { JENIS, type Jenis } from '@/lib/vektor/diare/config';
import { validasiSurvei } from '@/lib/vektor/diare/validasi';
import { daftarDiare, filterDariQuery, hapusSurvei, simpanSurvei, ubahSurvei } from '@/lib/vektor/diare/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });
const jenisValid = (v: unknown): v is Jenis => JENIS.includes(v as Jenis);

// Daftar: /api/vektor/diare?jenis=lalat&dari=2026-01-01&hasil=tms&tanpa_tindakan=1&limit=100&offset=0
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const f = filterDariQuery(sp);
  if (!f) return salah('Jenis harus lalat atau kecoa');
  const data = await daftarDiare(f, Number(sp.get('limit')) || 100, Number(sp.get('offset')) || 0);
  return NextResponse.json({ data });
}

// Tambah satu survei dari form
export async function POST(req: NextRequest) {
  const user = await requireVektor();
  if (!user) return tolak();
  const body = await req.json().catch(() => null);
  if (!body || !jenisValid(body.jenis)) return salah('Jenis harus lalat atau kecoa');

  const h = validasiSurvei(body, { jenis: body.jenis });
  if (!h.ok) return salah(h.error);

  const r = await simpanSurvei([h.data], user.nama);
  if (r.masuk === 0) return salah('Survei di lokasi, tanggal, dan wilayah yang sama sudah ada', 409);
  return NextResponse.json({ ok: true, hasil: h.data.hasil_pengamatan });
}

// Ubah survei: body berisi id + jenis + isian survei
export async function PATCH(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id) || !jenisValid(body.jenis)) return salah('Data tidak lengkap');

  const h = validasiSurvei(body, { jenis: body.jenis });
  if (!h.ok) return salah(h.error);

  const r = await ubahSurvei(id, h.data);
  if (r === 'duplikat') return salah('Sudah ada survei lain dengan lokasi, tanggal, dan wilayah yang sama', 409);
  if (r === 'tidak_ada') return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true, hasil: h.data.hasil_pengamatan });
}

// Hapus survei (beserta tindakannya): /api/vektor/diare?id=12&jenis=lalat
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const id = Number(sp.get('id'));
  const jenis = sp.get('jenis');
  if (!Number.isInteger(id) || !jenisValid(jenis)) return salah('Data tidak lengkap');
  if (!(await hapusSurvei(id, jenis))) return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}