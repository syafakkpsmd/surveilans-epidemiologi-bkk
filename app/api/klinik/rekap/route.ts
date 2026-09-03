// app/api/klinik/rekap/route.ts
import { NextResponse } from 'next/server';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { ringkasanKartuIcv, donutJenisKelamin, donutUmur, donutJenisDokumenIcv, donutWus } from '@/lib/klinik/agregasiIcv';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const klinikFilter = searchParams.get('klinik'); // opsional, nama klinik

  const dataset = await getDatasetKlinik();
  const relevan = klinikFilter ? dataset.filter((d) => d.klinik.nama_klinik === klinikFilter) : dataset;
  const semuaIcv = relevan.flatMap((d) => d.icv);

  return NextResponse.json({
    success: true,
    kartu: ringkasanKartuIcv(semuaIcv),
    donutJenisKelamin: donutJenisKelamin(semuaIcv),
    donutUmur: donutUmur(semuaIcv),
    donutJenisDokumenIcv: donutJenisDokumenIcv(semuaIcv),
    donutWus: donutWus(semuaIcv),
  });
}