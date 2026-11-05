// app/api/vektor/tikus/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { tentukanUrutanKolom } from '@/lib/tanggal/parse-tanggal';
import { bacaTabel } from '@/lib/vektor/tikus/sheet';
import {
  kanonikLab, kanonikSurvei, validasiLab, validasiSurveiTikus, type DataLab, type DataSurveiTikus,
} from '@/lib/vektor/tikus/validasi';
import { simpanLab, simpanSurveiTikus } from '@/lib/vektor/tikus/server';

export const runtime = 'nodejs';

const MAKS_BARIS = 5000;
const MAKS_BYTE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await requireVektor();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const mode = String(fd.get('mode') ?? '');
  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  if (mode !== 'survei' && mode !== 'lab') return NextResponse.json({ error: 'Pilih jenis unggahan' }, { status: 400 });

  let tabel;
  try {
    // Tanpa cellDates: tanggal Excel datang sebagai angka serial (bebas zona waktu).
    tabel = bacaTabel(Buffer.from(await file.arrayBuffer()), mode === 'survei' ? ['rt', 'rn', 'mm'] : []);
  } catch {
    return NextResponse.json({ error: 'File Excel tidak bisa dibaca' }, { status: 400 });
  }
  if (tabel.length > MAKS_BARIS)
    return NextResponse.json({ error: `Maksimal ${MAKS_BARIS} baris per unggahan` }, { status: 400 });

  const kanonik = mode === 'survei' ? kanonikSurvei : kanonikLab;
  const baris = tabel
    .map(({ n, b }) => ({ n, b: kanonik(b) }))
    .filter(({ b }) => !Object.values(b).every((v) => v === '' || v == null));

  const urutan = tentukanUrutanKolom(baris.map(({ b }) => b.tanggal));
  if (urutan.bertentangan) {
    return NextResponse.json(
      { error: 'Kolom tanggal bercampur dua gaya (mis. 25/01/2026 dan 01/25/2026). Seragamkan dulu.' },
      { status: 400 }
    );
  }
  const o = { urutanAmbigu: urutan.urutan ?? ('dmy' as const) };

  const galat: { baris: number; pesan: string }[] = [];
  let gagal = 0;
  let ambigu = 0;
  const survei: DataSurveiTikus[] = [];
  const lab: DataLab[] = [];

  for (const { n, b } of baris) {
    const h = mode === 'survei' ? validasiSurveiTikus(b, o) : validasiLab(b, o);
    if (!h.ok) {
      gagal++;
      if (galat.length < 20) galat.push({ baris: n, pesan: h.error });
      continue;
    }
    if (h.ambigu) ambigu++;
    if (mode === 'survei') survei.push(h.data as DataSurveiTikus);
    else lab.push(h.data as DataLab);
  }

  const r = mode === 'survei' ? await simpanSurveiTikus(survei, user.nama) : await simpanLab(lab, user.nama, true);

  return NextResponse.json({
    total: baris.length,
    masuk: r.masuk,
    duplikat: r.duplikat,
    gagal,
    ambigu,
    contohGalat: galat,
  });
}