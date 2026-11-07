// app/api/media-tanah/template/route.ts
// Unduh template Excel: lembar "Data" (judul kolom) dan lembar "Petunjuk" (arti tiap kolom).
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireStaf } from '@/lib/media-tanah/auth';
import { daftarKolom } from '@/lib/media-tanah/kolom';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireStaf();
  if (!user) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const kolom = daftarKolom();
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([kolom.map((k) => k.kolom)]);
  data['!cols'] = kolom.map((k) => ({ wch: Math.max(14, k.kolom.length + 2) }));
  XLSX.utils.book_append_sheet(wb, data, 'Data');
  const petunjuk = XLSX.utils.aoa_to_sheet([['Kolom', 'Arti', 'Isian'], ...kolom.map((k) => [k.kolom, k.arti, k.isian])]);
  petunjuk['!cols'] = [{ wch: 26 }, { wch: 70 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, petunjuk, 'Petunjuk');

  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_media_tanah.xlsx"',
    },
  });
}