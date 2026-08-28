import { NextRequest, NextResponse } from 'next/server';
import { ambilTrenHarianRentang, type ParameterUdara } from '@/lib/supabase/queries-karhutla-server';

const PARAMETER_VALID: ParameterUdara[] = ['pm25', 'pm10', 'suhu', 'hcho', 'tvoc', 'kelembapan'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tanggalAwal = searchParams.get('awal');
    const tanggalAkhir = searchParams.get('akhir');
    const wilayahKey = searchParams.get('wilayah') ?? 'Semua';
    const parameterMentah = searchParams.get('parameter') ?? 'pm25';

    if (!tanggalAwal || !tanggalAkhir) {
      return NextResponse.json({ error: 'Parameter awal dan akhir (tanggal) wajib diisi.' }, { status: 400 });
    }
    if (tanggalAwal > tanggalAkhir) {
      return NextResponse.json({ error: 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.' }, { status: 400 });
    }

    const parameterUdara: ParameterUdara = PARAMETER_VALID.includes(parameterMentah as ParameterUdara)
      ? (parameterMentah as ParameterUdara)
      : 'pm25';

    const data = await ambilTrenHarianRentang({ tanggalAwal, tanggalAkhir, wilayahKey, parameterUdara });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[karhutla-tren-harian][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data tren harian.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}