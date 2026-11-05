// app/api/vektor/anopheles/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { tentukanUrutanKolom } from '@/lib/tanggal/parse-tanggal';
import { bacaTabel } from '@/lib/vektor/tikus/sheet';
import {
  adaDataDewasa, adaDataLarva, kanonik, validasiDewasa, validasiLarva, type DataDewasa, type DataLarva,
} from '@/lib/vektor/anopheles/validasi';
import { simpanDewasa, simpanLarva } from '@/lib/vektor/anopheles/server';

export const runtime = 'nodejs';

const MAKS_BARIS = 5000;
const MAKS_BYTE = 5 * 1024 * 1024;
const kosong = (v: unknown) => v === '' || v === null || v === undefined;

export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const mode = String(fd.get('mode') ?? '');
  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  if (mode !== 'larva' && mode !== 'dewasa') return NextResponse.json({ error: 'Pilih jenis unggahan' }, { status: 400 });

  let tabel;
  try {
    // Tanpa cellDates: tanggal Excel datang sebagai angka serial (bebas zona waktu).
    tabel = bacaTabel(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: 'File Excel tidak bisa dibaca' }, { status: 400 });
  }
  if (tabel.length > MAKS_BARIS)
    return NextResponse.json({ error: `Maksimal ${MAKS_BARIS} baris per unggahan` }, { status: 400 });

  const baris = tabel
    .map(({ n, b }) => ({ n, b: kanonik(b) }))
    .filter(({ b }) => !Object.values(b).every(kosong));

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
  let dilewati = 0;
  const larva: DataLarva[] = [];
  const dewasa: DataDewasa[] = [];

  for (const { n, b } of baris) {
    if (mode === 'larva' ? !adaDataLarva(b) : !adaDataDewasa(b)) {
      dilewati++; // baris ini tidak memuat data untuk jenis yang diunggah
      continue;
    }
    const h = mode === 'larva' ? validasiLarva(b, o) : validasiDewasa(b, o);
    if (!h.ok) {
      gagal++;
      if (galat.length < 20) galat.push({ baris: n, pesan: h.error });
      continue;
    }
    if (h.ambigu) ambigu++;
    if (mode === 'larva') larva.push(h.data as DataLarva);
    else dewasa.push(h.data as DataDewasa);
  }

  const r = mode === 'larva' ? await simpanLarva(larva) : await simpanDewasa(dewasa);

  return NextResponse.json({
    total: baris.length,
    masuk: r.masuk,
    duplikat: r.duplikat,
    gagal,
    ambigu,
    dilewati,
    contohGalat: galat,
  });
}