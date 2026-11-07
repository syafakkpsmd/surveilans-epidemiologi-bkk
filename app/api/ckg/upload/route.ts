// app/api/ckg/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireCkg } from '@/lib/klinik/ckg/auth';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';
import { validasiBaris, type BarisCkg } from '@/lib/klinik/ckg/validasi';
import { simpanBanyak } from '@/lib/klinik/ckg/server';

export const runtime = 'nodejs';

const MAKS_BARIS = 5000;
const MAKS_BYTE = 5 * 1024 * 1024;

// nama kolom di Excel (huruf kecil, tanpa spasi/simbol) -> field internal
const ALIAS: Record<string, string> = {
  tanggal: 'tanggal', tgl: 'tanggal', tanggalperiksa: 'tanggal', tanggalpemeriksaan: 'tanggal',
  nama: 'nama',
  jeniskelamin: 'jenis_kelamin', jk: 'jenis_kelamin', kelamin: 'jenis_kelamin',
  umur: 'umur', usia: 'umur',
  bb: 'bb', beratbadan: 'bb',
  tb: 'tb', tinggibadan: 'tb',
  sistolik: 'sistolik', diastolik: 'diastolik',
  td: 'tekanan_darah', tekanandarah: 'tekanan_darah',
  guladarah: 'gula_darah', gds: 'gula_darah', gula: 'gula_darah',
  merokok: 'merokok',
};

const kunci = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(req: NextRequest) {
  const user = await requireCkg();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const wilayah = String(fd.get('wilayah') ?? '');

  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  const kamus = await getKamusWilker();
  if (!kamus.daftarKodeAktif.includes(wilayah)) return NextResponse.json({ error: 'Pilih wilayah kerja' }, { status: 400 });

  let baris: Record<string, any>[];
  try {
    // Tanpa cellDates: sel tanggal Excel datang sebagai angka serial yang tidak
    // bergantung zona waktu, lalu dibaca parseTanggalSheet lewat parseTanggalCkg.
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    baris = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: true, defval: '' });
  } catch {
    return NextResponse.json({ error: 'File Excel tidak bisa dibaca' }, { status: 400 });
  }
  if (baris.length > MAKS_BARIS)
    return NextResponse.json({ error: `Maksimal ${MAKS_BARIS} baris per unggahan` }, { status: 400 });

  const valid: BarisCkg[] = [];
  const galat: { baris: number; pesan: string }[] = [];
  let gagal = 0;

  baris.forEach((mentah, i) => {
    const raw: Record<string, any> = {};
    for (const [k, v] of Object.entries(mentah)) {
      const f = ALIAS[kunci(k)];
      if (f) raw[f] = v;
    }
    if (Object.values(raw).every((v) => v === '' || v == null)) return; // baris kosong
    const h = validasiBaris(raw, { wilayah, kodeValid: kamus.daftarKodeAktif });
    if (h.ok) valid.push(h.data);
    else {
      gagal++;
      if (galat.length < 20) galat.push({ baris: i + 2, pesan: h.error }); // +2: judul kolom + indeks 0
    }
  });

  const { masuk, duplikat } = await simpanBanyak(valid, user.nama, 'upload');
  return NextResponse.json({
    total: valid.length + gagal,
    masuk,
    duplikat,
    gagal,
    contohGalat: galat,
  });
}