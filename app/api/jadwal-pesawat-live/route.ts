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
    const { kedatangan, keberangkatan } = await ambilData();
    return NextResponse.json({ kedatangan, keberangkatan, tersedia: true });
  } catch (error) {
    console.error(`Gagal memuat jadwal live (${meta.kode}):`, error);
    return NextResponse.json(
      { kedatangan: [], keberangkatan: [], tersedia: false },
      { status: 200 }
    );
  }
}