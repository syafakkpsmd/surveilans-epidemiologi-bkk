// app/api/vektor/dbd/pengendalian/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { validasiPengendalian } from '@/lib/vektor/dbd/validasi';
import { kosongkanPengendalian, terapkanPengendalian } from '@/lib/vektor/dbd/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });

// body: { id, larvasida, luas, insektisida }  (insektisida dalam liter)
async function simpan(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id)) return salah('Data tidak lengkap');

  const h = validasiPengendalian(body);
  if (!h.ok) return salah(h.error);

  if (!(await terapkanPengendalian(id, h.data))) return salah('Survei tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}
export { simpan as POST, simpan as PATCH };

// /api/vektor/dbd/pengendalian?id=12
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return salah('Data tidak lengkap');
  if (!(await kosongkanPengendalian(id))) return salah('Survei tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}