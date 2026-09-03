// app/api/klinik/tren/route.ts
import { NextResponse } from 'next/server';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { trenDistribusiGender, trenLayananPerKlinik, trenPenerbitanIcv, trenPenerbitanPerVaksin } from '@/lib/klinik/agregasiTren';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const granularitas = (searchParams.get('granularitas') ?? 'bulanan') as 'mingguan' | 'bulanan';
  const mulai = searchParams.get('mulai');   // ISO date, awal rentang yg dipilih user
  const akhir = searchParams.get('akhir');   // ISO date, akhir rentang
  const klinikIds = searchParams.get('klinik')?.split(',').filter(Boolean);

  let dataset = await getDatasetKlinik();
  if (klinikIds?.length) dataset = dataset.filter((d) => klinikIds.includes(d.klinik.id));
  if (mulai && akhir) {
    const [m, a] = [new Date(mulai), new Date(akhir)];
    dataset = dataset.map((d) => ({
      ...d,
      icv: d.icv.filter((r) => { const t = new Date(r['Tanggal Terbit']); return t >= m && t <= a; }),
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