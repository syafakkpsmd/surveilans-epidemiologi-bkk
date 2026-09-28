// app/api/kier/tren/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getRingkasanKier,
  getTrenMingguanKier,
  getTrenBulananKier,
  getTrenMingguanPerWilkerKier,
  getTrenBulananPerWilkerKier,
  getDaftarWilkerAktif,
} from '@/lib/turso/kier';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tahun = Number(params.get('tahun')) || new Date().getFullYear();
  const wilayahKerja = params.get('wilker') || undefined; // kosong/absen = Semua Wilayah Kerja
  const mingguAwal = Number(params.get('mingguAwal')) || 1;
  const mingguAkhir = Number(params.get('mingguAkhir')) || 52;
  const bulanAwal = Number(params.get('bulanAwal')) || 1;
  const bulanAkhir = Number(params.get('bulanAkhir')) || 12;

  try {
    // Ambil dulu daftar wilker yang BENAR-BENAR ada di data tahun ini,
    // supaya kolom breakdown di bawah cocok persis dengan ejaan aslinya.
    const daftarWilkerAktif = await getDaftarWilkerAktif(tahun);

    const [ringkasan, trenMingguan, trenBulanan, trenMingguanWilker, trenBulananWilker] = await Promise.all([
      getRingkasanKier(tahun, wilayahKerja),
      getTrenMingguanKier(tahun, mingguAwal, mingguAkhir, wilayahKerja),
      getTrenBulananKier(tahun, bulanAwal, bulanAkhir, wilayahKerja),
      // breakdown per wilker SELALU dari semua wilker (parameter wilker tidak dipakai di sini)
      getTrenMingguanPerWilkerKier(tahun, mingguAwal, mingguAkhir, daftarWilkerAktif),
      getTrenBulananPerWilkerKier(tahun, bulanAwal, bulanAkhir, daftarWilkerAktif),
    ]);

    return NextResponse.json({
      ringkasan, trenMingguan, trenBulanan, trenMingguanWilker, trenBulananWilker,
      daftarWilkerAktif,
    });
  } catch (error) {
    console.error('Gagal ambil data KIER Kesehatan:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}