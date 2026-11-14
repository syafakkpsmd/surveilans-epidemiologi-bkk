import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db/client';
import { lengkapiCuacaVektor } from '@/lib/vektor/cuaca-otomatis';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/cuaca-vektor
 * Melengkapi suhu, kelembapan, cuaca, fase bulan, dan curah hujan yang masih kosong pada modul Vektor
 * (Anopheles, Aedes/DBD, Diare) dari Open-Meteo. Pengganti pengisian otomatis Google Apps Script.
 * Kolom yang sudah terisi tidak ditimpa. Aman dipanggil berulang (idempoten).
 * Contoh cron cPanel (tiap 30 menit):
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/cuaca-vektor
 * Wajib header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await lengkapiCuacaVektor(getDbClient()));
  } catch (err) {
    console.error('[cron/cuaca-vektor]', err);
    return NextResponse.json({ error: 'Gagal melengkapi data cuaca vektor.' }, { status: 500 });
  }
}
