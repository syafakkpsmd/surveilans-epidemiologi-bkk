import { NextResponse } from 'next/server';
import { getMetaBandara, getPengambilData } from '@/lib/bandara-live/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kodeBandara = searchParams.get('bandara') ?? 'pranoto';

  const meta = getMetaBandara(kodeBandara);
  const ambilData = getPengambilData(meta.kode);

  if (!meta.tersedia || !ambilData) {
    return NextResponse.json({
      kedatangan: [],
      keberangkatan: [],
      tersedia: false,
    });
  }

  try {
    const { kedatangan, keberangkatan, sumberData } = await ambilData();
    // Hanya benar-benar "tidak tersedia" kalau adapter secara eksplisit
    // bilang begitu (kedua sumber -- resmi & fallback OpenSky -- gagal semua).
    // Adapter lama (sepinggan) yang belum mengisi sumberData dianggap
    // 'resmi' seperti perilaku sebelumnya (tidak ada perubahan untuk itu).
    const tersediaSekarang = sumberData !== 'tidak_tersedia';
    return NextResponse.json({
      kedatangan,
      keberangkatan,
      tersedia: tersediaSekarang,
      sumberData: sumberData ?? 'resmi',
    });
  } catch (error) {
    console.error(`Gagal memuat jadwal live (${meta.kode}):`, error);
    return NextResponse.json(
      { kedatangan: [], keberangkatan: [], tersedia: false },
      { status: 200 }
    );
  }
}