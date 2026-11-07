// app/api/vektor/dbd/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVektor } from '@/lib/vektor/auth';
import { tentukanUrutanKolom } from '@/lib/tanggal/parse-tanggal';
import { bacaTabel } from '@/lib/vektor/tikus/sheet';
import {
  adaIsianPengendalian, kanonik, kosong, validasiGabungan, validasiPengendalianBerKunci, validasiSurvei,
  type DataSurvei,
} from '@/lib/vektor/dbd/validasi';
import { simpanSurvei, terapkanPengendalianBanyak, type ItemPengendalian } from '@/lib/vektor/dbd/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';

export const runtime = 'nodejs';

const MAKS_BARIS = 5000;
const MAKS_BYTE = 5 * 1024 * 1024;
const MODE = ['survei', 'pengendalian', 'gabungan'];

export async function POST(req: NextRequest) {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const mode = String(fd.get('mode') ?? '');
  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  if (!MODE.includes(mode)) return NextResponse.json({ error: 'Pilih jenis unggahan' }, { status: 400 });

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
  // Kamus wilayah kerja dari database, dipakai validator untuk memetakan teks wilayah ke kode baku.
  const wk = await getKamusWilker();
  const o = { wk, urutanAmbigu: urutan.urutan ?? ('dmy' as const) };

  const galat: { baris: number; pesan: string }[] = [];
  let gagal = 0;
  let ambigu = 0;
  let dilewati = 0;
  const gagalkan = (n: number, pesan: string) => {
    gagal++;
    if (galat.length < 20) galat.push({ baris: n, pesan });
  };

  const survei: DataSurvei[] = [];
  const pengendalian: ItemPengendalian[] = [];

  for (const { n, b } of baris) {
    if (mode === 'pengendalian') {
      if (!adaIsianPengendalian(b)) { dilewati++; continue; }
      const h = validasiPengendalianBerKunci(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      pengendalian.push({ baris: n, kunci: h.data.kunci, pengendalian: h.data.pengendalian });
    } else if (mode === 'gabungan') {
      const h = validasiGabungan(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      survei.push(h.data.survei);
      if (h.data.pengendalian) pengendalian.push({ baris: n, kunci: h.data.survei, pengendalian: h.data.pengendalian });
    } else {
      const h = validasiSurvei(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      survei.push(h.data);
    }
  }

  let masuk = 0;
  let duplikat = 0;
  let pengendalianDiterapkan = 0;

  if (survei.length) {
    const r = await simpanSurvei(survei);
    masuk = r.masuk;
    duplikat = r.duplikat;
  }
  if (pengendalian.length) {
    const r = await terapkanPengendalianBanyak(pengendalian);
    pengendalianDiterapkan = r.diterapkan;
    for (const n of r.tidakDitemukan) {
      gagalkan(n, 'Survei dengan tanggal, wilayah, zona, dan sub lokasi ini tidak ditemukan');
    }
  }

  return NextResponse.json({
    total: baris.length, masuk, duplikat, gagal, ambigu, dilewati, pengendalianDiterapkan, contohGalat: galat,
  });
}