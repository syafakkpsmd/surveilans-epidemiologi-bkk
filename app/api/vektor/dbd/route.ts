// app/api/vektor/dbd/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { validasiSurvei } from '@/lib/vektor/dbd/validasi';
import { daftarSurvei, filterDariQuery, hapusSurvei, simpanSurvei, ubahSurvei } from '@/lib/vektor/dbd/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });

// /api/vektor/dbd?dari=2026-01-01&wilayah=WK07&zona=Buffer&belum_pengendalian=1&limit=100&offset=0
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const wk = await getKamusWilker();
  const data = await daftarSurvei(filterDariQuery(sp, wk), Number(sp.get('limit')) || 100, Number(sp.get('offset')) || 0);
  return NextResponse.json({ data });
}

// body: { tanggal, wilayah, zona, sub_lokasi, rumah, rumah_positif, container, container_positif, hujan }
export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  if (!body) return salah('Data tidak terbaca');

  const wk = await getKamusWilker();
  const h = validasiSurvei(body, { wk });
  if (!h.ok) return salah(h.error);

  const r = await simpanSurvei([h.data]);
  if (r.masuk === 0) return salah('Survei zona ini pada tanggal, wilayah, dan sub lokasi yang sama sudah ada', 409);
  const { abj, hi, ci, bi } = h.data;
  return NextResponse.json({ ok: true, abj, hi, ci, bi });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id)) return salah('Data tidak lengkap');

  const wk = await getKamusWilker();
  const h = validasiSurvei(body, { wk });
  if (!h.ok) return salah(h.error);

  const r = await ubahSurvei(id, h.data);
  if (r === 'duplikat') return salah('Sudah ada survei lain dengan tanggal, wilayah, zona, dan sub lokasi yang sama', 409);
  if (r === 'tidak_ada') return salah('Data tidak ditemukan', 404);
  const { abj, hi, ci, bi } = h.data;
  return NextResponse.json({ ok: true, abj, hi, ci, bi });
}

// /api/vektor/dbd?id=12  (pengendalian pada baris itu ikut terhapus)
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!(await hapusSurvei(id))) return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}