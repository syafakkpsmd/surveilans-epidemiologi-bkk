import { NextRequest, NextResponse } from 'next/server';
import { ambilTrenIspaPm25 } from '@/lib/supabase/queries-karhutla-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wilayahKey = searchParams.get('wilayah') ?? 'Semua';

    const data = await ambilTrenIspaPm25({ wilayahKey, hariTerakhir: 30 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[tren-ispa][GET]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data tren ISPA.', detail: (err as Error).message },
      { status: 500 }
    );
  }
}