// app/api/klinik/tren/route.ts
import { NextResponse } from 'next/server';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { parseTanggalSheet } from '@/lib/klinik/tanggal';
import { trenDistribusiGender, trenLayananPerKlinik, trenPenerbitanIcv, trenPenerbitanPerVaksin } from '@/lib/klinik/agregasiTren';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const granularitas = (searchParams.get('granularitas') ?? 'bulanan') as 'mingguan' | 'bulanan';
  const mulai = searchParams.get('mulai');
  const akhir = searchParams.get('akhir');
  const klinikIds = searchParams.get('klinik')?.split(',').filter(Boolean);

  let dataset = await getDatasetKlinik();
  if (klinikIds?.length) dataset = dataset.filter((d) => klinikIds.includes(String(d.klinik.id)));

  if (mulai && akhir) {
    const m = new Date(mulai); // ini aman - format ISO (yyyy-MM-dd) dari <input type="date">
    const a = new Date(akhir);
    dataset = dataset.map((d) => ({
      ...d,
      icv: d.icv.filter((r) => {
        const t = parseTanggalSheet(r['Tanggal Terbit']);
        return t !== null && t >= m && t <= a;
      }),
    }));
  }

  const semuaIcv = dataset.flatMap((d) => d.icv);

  return NextResponse.json({
    success: true,
    distribusiGender: trenDistribusiGender(semuaIcv, granularitas),
    layananPerKlinik: trenLayananPerKlinik(dataset, granularitas),
    penerbitanIcv: trenPenerbitanIcv(semuaIcv, granularitas),
    penerbitanPerVaksin: trenPenerbitanPerVaksin(dataset, granularitas),
  });
}