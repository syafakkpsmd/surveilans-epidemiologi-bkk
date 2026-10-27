import { NextRequest, NextResponse } from 'next/server';
import { naikkanRencanaKeFinal } from '@/lib/db/modul/inputPesawat';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/pesawat-rencana
 * Menaikkan data pesawat berstatus 'rencana' menjadi 'final' bila tanggalnya sudah tiba
 * (pengganti job malam Google Sheets). Panggil sekali sehari setelah pergantian hari (WITA),
 * mis. dari cron cPanel:  curl -s -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/pesawat-rencana
 * Wajib header Authorization: Bearer <CRON_SECRET>. Aman dipanggil berulang (idempoten).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    const dinaikkan = await naikkanRencanaKeFinal(hariIni);
    return NextResponse.json({ hariIni, dinaikkan });
  } catch (err) {
    console.error('[cron/pesawat-rencana]', err);
    return NextResponse.json({ error: 'Gagal memperbarui status data pesawat.' }, { status: 500 });
  }
}
