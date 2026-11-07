// app/api/vektor/anopheles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';
import { requireVektor } from '@/lib/vektor/auth';
import type { Tipe } from '@/lib/vektor/anopheles/config';
import { validasiDewasa, validasiLarva } from '@/lib/vektor/anopheles/validasi';
import {
  daftarSurvei, filterDariQuery, hapusSurvei, simpanDewasa, simpanLarva, ubahDewasa, ubahLarva,
} from '@/lib/vektor/anopheles/server';

export const runtime = 'nodejs';

const tolak = () => NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
const salah = (error: string, status = 400) => NextResponse.json({ error }, { status });
const tipeValid = (v: unknown): v is Tipe => v === 'larva' || v === 'dewasa';

// /api/vektor/anopheles?tipe=larva&dari=2026-01-01&wilayah=WK03&zona=Buffer&limit=100&offset=0
export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const f = filterDariQuery(sp, await getKamusWilker());
  if (!f) return salah('Jenis survei harus larva atau dewasa');
  const data = await daftarSurvei(f, Number(sp.get('limit')) || 100, Number(sp.get('offset')) || 0);
  return NextResponse.json({ data });
}

// body: { tipe, tanggal, wilayah, zona, sub_lokasi, fase_bulan, suhu, kelembapan, cuaca, ...isian larva/dewasa }
export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  if (!body || !tipeValid(body.tipe)) return salah('Jenis survei harus larva atau dewasa');

  if (body.tipe === 'larva') {
    const h = validasiLarva(body, { wk: await getKamusWilker() });
    if (!h.ok) return salah(h.error);
    const r = await simpanLarva([h.data]);
    if (r.masuk === 0) return salah('Survei larva yang sama persis sudah ada', 409);
  } else {
    const h = validasiDewasa(body, { wk: await getKamusWilker() });
    if (!h.ok) return salah(h.error);
    const r = await simpanDewasa([h.data]);
    if (r.masuk === 0) return salah('Survei nyamuk dewasa yang sama persis sudah ada', 409);
  }
  return NextResponse.json({ ok: true });
}

// body sama seperti POST, ditambah id
export async function PATCH(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id) || !tipeValid(body.tipe)) return salah('Data tidak lengkap');

  let r: 'ok' | 'duplikat' | 'tidak_ada';
  if (body.tipe === 'larva') {
    const h = validasiLarva(body, { wk: await getKamusWilker() });
    if (!h.ok) return salah(h.error);
    r = await ubahLarva(id, h.data);
  } else {
    const h = validasiDewasa(body, { wk: await getKamusWilker() });
    if (!h.ok) return salah(h.error);
    r = await ubahDewasa(id, h.data);
  }
  if (r === 'duplikat') return salah('Sudah ada survei lain yang sama persis', 409);
  if (r === 'tidak_ada') return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}

// /api/vektor/anopheles?id=12&tipe=larva
export async function DELETE(req: NextRequest) {
  if (!(await requireVektor())) return tolak();
  const sp = req.nextUrl.searchParams;
  const id = Number(sp.get('id'));
  const tipe = sp.get('tipe');
  if (!Number.isInteger(id) || !tipeValid(tipe)) return salah('Data tidak lengkap');
  if (!(await hapusSurvei(id, tipe))) return salah('Data tidak ditemukan', 404);
  return NextResponse.json({ ok: true });
}