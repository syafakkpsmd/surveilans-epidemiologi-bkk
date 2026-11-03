// POST /api/input-data/pesawat/periksa : baca file Excel yang diunggah dan kembalikan PRATINJAU per baris
// (siap / duplikat / galat). Tidak menulis apa pun ke database; penyimpanan lewat server action.
import { NextResponse } from 'next/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { bacaExcelPesawat, MAKS_BYTE_EXCEL } from '@/lib/db/modul/excelPesawat';
import { WILKER_BANDARA, periksaBanyak } from '@/lib/db/modul/inputPesawat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const galat = (pesan: string, status: number) => NextResponse.json({ error: pesan }, { status });

export async function POST(req: Request) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) return galat('Tidak diizinkan', 403);

  // Cegah permintaan lintas situs: Origin (bila ada) harus sama dengan host permintaan.
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return galat('Asal permintaan tidak diizinkan.', 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return galat('Permintaan tidak valid.', 400);
  }
  const berkas = form.get('file');
  if (!(berkas instanceof File)) return galat('Pilih file Excel (.xlsx) terlebih dahulu.', 400);
  if (!berkas.name.toLowerCase().endsWith('.xlsx')) return galat('Hanya file .xlsx yang diterima.', 400);
  if (berkas.size > MAKS_BYTE_EXCEL) return galat(`Ukuran file maksimum ${MAKS_BYTE_EXCEL / 1024 / 1024} MB.`, 413);

  const baca = await bacaExcelPesawat(Buffer.from(await berkas.arrayBuffer()));
  if (!baca.ok) return galat(baca.galatFile, 422);

  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
  const hasil = await periksaBanyak(baca.baris, hariIni, WILKER_BANDARA[0].kode);

  return NextResponse.json({
    peringatan: baca.peringatan,
    ringkasan: {
      total: hasil.length,
      siap: hasil.filter((h) => h.status === 'siap').length,
      duplikat: hasil.filter((h) => h.status === 'duplikat').length,
      galat: hasil.filter((h) => h.status === 'galat').length,
      rencana: hasil.filter((h) => h.status === 'siap' && h.data?.status_data === 'rencana').length,
    },
    baris: hasil,
  });
}
