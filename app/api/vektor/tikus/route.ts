// app/api/vektor/tikus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { validasiSurveiTikus } from '@/lib/vektor/tikus/validasi';
import {
  daftarSurveiTikus, filterDariQuery, hapusSurveiTikus, simpanSurveiTikus, ubahSurveiTikus,
} from '@/lib/vektor/tikus/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });

// /api/vektor/tikus?dari=2026-01-01&sampai=2026-03-31&wilayah=WK01&limit=100&offset=0
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const data = await daftarSurveiTikus(filterDariQuery(sp), Number(sp.get('limit')) || 100, Number(sp.get('offset')) || 0);
  return NextResponse.json({ data });
}

// body: { tanggal, wilayah, dipasang, rt, rn, mm, lainnya, pinjal, keterangan }
export async function POST(req: NextRequest) {
  const user = await requireVektor();
  if (!user) return tolak();
  const body = await req.json().catch(() => null);
  if (!body) return salah('Data tidak terbaca');

  const h = validasiSurveiTikus(body);
  if (!h.ok) return salah(h.error);

  const r = await simpanSurveiTikus([h.data], user.nama);
  if (r.masuk === 0) return salah('Survei dengan tanggal, wilayah, dan angka yang sama persis sudah ada', 409);
  return NextResponse.json({ ok: true, tertangkap: h.data.jml_trap_tertangkap, tsi: h.data.tsi });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id)) return salah('Data tidak lengkap');

  const h = validasiSurveiTikus(body);
  if (!h.ok) return salah(h.error);

  const r = await ubahSurveiTikus(id, h.data);
  if (r === 'duplikat') return salah('Sudah ada survei lain dengan tanggal, wilayah, dan angka yang sama persis', 409);
  if (r === 'tidak_ada') return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true, tertangkap: h.data.jml_trap_tertangkap, tsi: h.data.tsi });
}

// /api/vektor/tikus?id=12
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!(await hapusSurveiTikus(id))) return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}