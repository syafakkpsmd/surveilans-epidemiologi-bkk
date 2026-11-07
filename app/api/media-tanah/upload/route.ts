// app/api/media-tanah/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireStaf } from '@/lib/media-tanah/auth';
import { KODE_WILAYAH } from '@/lib/media-tanah/config';
import { validasiPemeriksaan } from '@/lib/media-tanah/validasi';
import { barisKePayload, kunciKolom } from '@/lib/media-tanah/kolom';
import { simpanPemeriksaan } from '@/lib/media-tanah/server';

export const runtime = 'nodejs';

const MAKS_BARIS = 300;
const MAKS_BYTE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const wilayah = String(fd.get('wilayah') ?? '');

  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  if (!KODE_WILAYAH.includes(wilayah)) return NextResponse.json({ error: 'Pilih wilayah kerja' }, { status: 400 });

  let baris: Record<string, any>[];
  try {
    // Tanpa cellDates: sel tanggal Excel datang sebagai angka serial (tidak bergantung zona waktu),
    // lalu dibaca parseTanggalSheet lewat parseTanggalCkg.
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    baris = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: true, defval: '' });
  } catch {
    return NextResponse.json({ error: 'File Excel tidak bisa dibaca' }, { status: 400 });
  }
  if (!baris.length) return NextResponse.json({ error: 'File tidak berisi data' }, { status: 400 });
  if (baris.length > MAKS_BARIS)
    return NextResponse.json({ error: `Maksimal ${MAKS_BARIS} baris per unggahan` }, { status: 400 });

  const kolomAda = Object.keys(baris[0]).map(kunciKolom);
  if (!kolomAda.includes('tanggal') || !kolomAda.includes('nama_pelabuhan'))
    return NextResponse.json(
      { error: 'Judul kolom tidak dikenali. Unduh template lalu isi pada lembar "Data".' },
      { status: 400 }
    );

  let masuk = 0;
  let duplikat = 0;
  let gagal = 0;
  const galat: { baris: number; pesan: string }[] = [];

  for (let i = 0; i < baris.length; i++) {
    const norm: Record<string, any> = {};
    for (const [k, v] of Object.entries(baris[i])) norm[kunciKolom(k)] = v;
    if (Object.values(norm).every((v) => v === '' || v == null)) continue; // baris kosong

    const h = validasiPemeriksaan(barisKePayload(norm), { wilayah });
    if (!h.ok) {
      gagal++;
      if (galat.length < 20) galat.push({ baris: i + 2, pesan: h.error }); // +2: judul kolom + indeks 0
      continue;
    }
    const id = await simpanPemeriksaan(h.data, user.nama, 'upload');
    if (id == null) duplikat++;
    else masuk++;
  }

  return NextResponse.json({ total: masuk + duplikat + gagal, masuk, duplikat, gagal, contohGalat: galat });
}