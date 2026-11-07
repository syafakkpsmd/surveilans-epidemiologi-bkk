// app/api/vektor/diare/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getKamusWilker } from '@/lib/wilayah-kerja/server';
import * as XLSX from 'xlsx';
import { requireVektor } from '@/lib/vektor/auth';
import { JENIS, type Jenis } from '@/lib/vektor/diare/config';
import {
  kanonikBaris, validasiBarisGabungan, validasiSurvei, validasiTindakanBerKunci,
  type DataSurvei,
} from '@/lib/vektor/diare/validasi';
import { simpanSurvei, terapkanTindakanBanyak, type ItemTindakan } from '@/lib/vektor/diare/server';
import { tentukanUrutanKolom } from '@/lib/tanggal/parse-tanggal';

export const runtime = 'nodejs';

const MAKS_BARIS = 5000;
const MAKS_BYTE = 5 * 1024 * 1024;
const MODE = ['survei', 'tindakan', 'gabungan'];

export async function POST(req: NextRequest) {
  const user = await requireVektor();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get('file');
  const jenis = String(fd.get('jenis') ?? '');
  const mode = String(fd.get('mode') ?? '');

  if (!(file instanceof File)) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'File lebih dari 5 MB' }, { status: 400 });
  if (!JENIS.includes(jenis as Jenis)) return NextResponse.json({ error: 'Jenis harus lalat atau kecoa' }, { status: 400 });
  if (!MODE.includes(mode)) return NextResponse.json({ error: 'Pilih jenis unggahan' }, { status: 400 });

  let mentah: Record<string, unknown>[];
  try {
    // Tanpa cellDates: sel tanggal datang sebagai angka serial (bebas zona waktu), dibaca parseTanggal.
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
    mentah = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { raw: true, defval: '' });
  } catch {
    return NextResponse.json({ error: 'File Excel tidak bisa dibaca' }, { status: 400 });
  }
  if (mentah.length > MAKS_BARIS)
    return NextResponse.json({ error: `Maksimal ${MAKS_BARIS} baris per unggahan` }, { status: 400 });

  const baris = mentah
    .map((m, i) => ({ n: i + 2, b: kanonikBaris(m) })) // +2: judul kolom + indeks 0
    .filter(({ b }) => !Object.values(b).every((v) => v === '' || v == null));

  // Urutan hari/bulan disimpulkan dari seluruh kolom tanggal
  const urutan = tentukanUrutanKolom(baris.map(({ b }) => b.tanggal));
  if (urutan.bertentangan) {
    return NextResponse.json(
      { error: 'Kolom tanggal bercampur dua gaya (mis. 25/01/2026 dan 01/25/2026). Seragamkan dulu.' },
      { status: 400 }
    );
  }
  const wk = await getKamusWilker();
  const o = { wk, jenis: jenis as Jenis, urutanAmbigu: urutan.urutan ?? ('dmy' as const) };

  const galat: { baris: number; pesan: string }[] = [];
  let gagal = 0;
  let ambigu = 0;
  const gagalkan = (n: number, pesan: string) => {
    gagal++;
    if (galat.length < 20) galat.push({ baris: n, pesan });
  };

  const survei: DataSurvei[] = [];
  const tindakan: ItemTindakan[] = [];

  for (const { n, b } of baris) {
    if (mode === 'tindakan') {
      const h = validasiTindakanBerKunci(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      tindakan.push({ baris: n, kunci: h.data.kunci, tindakan: h.data.tindakan });
    } else if (mode === 'gabungan') {
      const h = validasiBarisGabungan(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      survei.push(h.data.survei);
      if (h.data.tindakan) tindakan.push({ baris: n, kunci: h.data.survei, tindakan: h.data.tindakan });
    } else {
      const h = validasiSurvei(b, o);
      if (!h.ok) { gagalkan(n, h.error); continue; }
      if (h.ambigu) ambigu++;
      survei.push(h.data);
    }
  }

  let masuk = 0;
  let duplikat = 0;
  let tindakanDiterapkan = 0;

  if (survei.length) {
    const r = await simpanSurvei(survei, user.nama);
    masuk = r.masuk;
    duplikat = r.duplikat;
  }
  if (tindakan.length) {
    const r = await terapkanTindakanBanyak(tindakan);
    tindakanDiterapkan = r.diterapkan;
    for (const n of r.tidakDitemukan) {
      gagalkan(n, 'Survei dengan tanggal, wilayah, jenis, dan lokasi ini tidak ditemukan');
    }
  }

  return NextResponse.json({
    total: baris.length,
    masuk,
    duplikat,
    gagal,
    ambigu,
    tindakanDiterapkan,
    contohGalat: galat,
  });
}