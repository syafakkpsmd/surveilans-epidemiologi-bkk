// app/api/vektor/diare/tindakan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { JENIS, type Jenis } from '@/lib/vektor/diare/config';
import { validasiTindakan } from '@/lib/vektor/diare/validasi';
import { hapusTindakan, terapkanTindakan } from '@/lib/vektor/diare/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });
const jenisValid = (v: unknown): v is Jenis => JENIS.includes(v as Jenis);

// Simpan atau ubah tindakan pada survei yang dipilih: body { id, jenis, tindakan, insektisida, luas }
async function simpan(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id) || !jenisValid(body.jenis)) return salah('Data tidak lengkap');

  const h = validasiTindakan(body);
  if (!h.ok) return salah(h.error);

  if (!(await terapkanTindakan(id, body.jenis, h.data))) return salah('Survei tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}
export { simpan as POST, simpan as PATCH };

// Kosongkan tindakan: /api/vektor/diare/tindakan?id=12&jenis=lalat
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const id = Number(sp.get('id'));
  const jenis = sp.get('jenis');
  if (!Number.isInteger(id) || !jenisValid(jenis)) return salah('Data tidak lengkap');
  if (!(await hapusTindakan(id, jenis))) return salah('Survei tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}