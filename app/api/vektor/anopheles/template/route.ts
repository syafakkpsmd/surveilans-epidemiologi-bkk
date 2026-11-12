// app/api/vektor/anopheles/template/route.ts  (FILE BARU)
// Template Excel unggahan Anopheles: /api/vektor/anopheles/template?tipe=larva|dewasa
// Lembar "Data" (hanya judul kolom, tanpa baris contoh agar tidak ikut tersimpan) dan lembar "Petunjuk".
// Judul kolom sama dengan yang dikenali lib/vektor/anopheles/validasi.ts (HEADER).
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireVektor } from '@/lib/vektor/auth';
import { FASE_BULAN, ZONA } from '@/lib/vektor/anopheles/config';

export const runtime = 'nodejs';

type Kol = { kolom: string; arti: string; isian: string };

const UMUM: Kol[] = [
  { kolom: 'Tanggal Survei', arti: 'Tanggal survei dilakukan', isian: 'Wajib. dd/mm/yyyy, yyyy-mm-dd, atau tanggal Excel. Tidak boleh di masa depan.' },
  { kolom: 'Wilayah Kerja', arti: 'Wilayah kerja BKK', isian: 'Wajib. Kode (mis. WK05) atau nama wilayah seperti di aplikasi.' },
  { kolom: 'Zona', arti: 'Zona survei', isian: `Wajib. ${ZONA.join(' atau ')}.` },
  { kolom: 'Sub Lokasi', arti: 'Lokasi survei di dalam zona', isian: 'Opsional. Teks bebas (maks. 120 karakter).' },
  { kolom: 'Fase Bulan', arti: 'Fase bulan saat survei', isian: `Opsional. Salah satu: ${FASE_BULAN.join(', ')}.` },
  { kolom: 'Cuaca', arti: 'Kondisi cuaca', isian: 'Opsional. Mis. Cerah, Berawan, Gerimis, Hujan Ringan.' },
  { kolom: 'Suhu', arti: 'Suhu (°C)', isian: 'Opsional. Angka -5 sampai 60. Koma desimal boleh (26,5).' },
  { kolom: 'Kelembapan', arti: 'Kelembapan (%)', isian: 'Opsional. Angka 0 sampai 100.' },
];

const LARVA: Kol[] = [
  { kolom: 'Jumlah Cidukan', arti: 'Banyak cidukan yang dilakukan', isian: 'Wajib. Bilangan bulat minimal 1.' },
  { kolom: 'Jumlah Larva', arti: 'Total larva yang ditemukan', isian: 'Wajib. Bilangan bulat, boleh 0.' },
  { kolom: 'Jumlah Jenis Larva', arti: 'Banyaknya jenis larva', isian: 'Opsional. Tidak boleh melebihi Jumlah Larva.' },
  { kolom: 'Spesies Larva', arti: 'Nama spesies larva', isian: 'Opsional. Diabaikan bila Jumlah Larva 0.' },
  { kolom: 'Macam Tempat Perindukan', arti: 'Jenis tempat perindukan', isian: 'Wajib. Mis. Kubangan, Sungai Kecil, Lagoon, Muara Payau, Danau, Rawa-rawa.' },
  { kolom: 'Keadaan Tempat Perindukan', arti: 'Kondisi tempat perindukan', isian: 'Wajib. Mis. Jernih, Keruh, Terdapat tanaman.' },
];

const DEWASA: Kol[] = [
  { kolom: 'Metode Tangkap', arti: 'Cara penangkapan', isian: 'Wajib. Mis. Umpan Badan.' },
  { kolom: 'Jumlah Nyamuk', arti: 'Total nyamuk tertangkap (Σ nyamuk)', isian: 'Wajib. Bilangan bulat, boleh 0.' },
  { kolom: 'Jumlah Petugas', arti: 'Banyak petugas penangkap (Σ petugas)', isian: 'Wajib (untuk menghitung MBR dan MHD otomatis). Bilangan bulat minimal 1.' },
  { kolom: 'Jumlah Jam Tangkap', arti: 'Lama penangkapan (Σ jam)', isian: 'Wajib. Angka lebih dari 0 sampai 48.' },
  { kolom: 'Spesies', arti: 'Spesies nyamuk', isian: 'Opsional.' },
];

export async function GET(req: NextRequest) {
  if (!(await requireVektor())) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  const tipe = req.nextUrl.searchParams.get('tipe');
  if (tipe !== 'larva' && tipe !== 'dewasa') return NextResponse.json({ error: 'Jenis harus larva atau dewasa' }, { status: 400 });

  const kolom = [...UMUM.slice(0, 3), ...(tipe === 'larva' ? LARVA : DEWASA), ...UMUM.slice(3)];
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([kolom.map((k) => k.kolom)]);
  data['!cols'] = kolom.map((k) => ({ wch: Math.max(14, k.kolom.length + 2) }));
  XLSX.utils.book_append_sheet(wb, data, 'Data');
  const petunjuk = XLSX.utils.aoa_to_sheet([
    ['Kolom', 'Arti', 'Isian'],
    ...kolom.map((k) => [k.kolom, k.arti, k.isian]),
    [],
    ['Catatan', 'Isi pada lembar "Data", mulai baris 2. Jangan mengubah judul kolom.', 'Baris yang sama persis dengan data yang sudah ada dilewati otomatis.'],
  ]);
  petunjuk['!cols'] = [{ wch: 28 }, { wch: 48 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, petunjuk, 'Petunjuk');

  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="template_anopheles_${tipe}.xlsx"`,
    },
  });
}
