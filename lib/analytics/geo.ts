import { headers } from 'next/headers';

export interface GeoInfo {
  ip: string;
  kota: string;
  wilayah: string;
  negara: string;
}

/**
 * Membaca header geolokasi bawaan Vercel Edge Network.
 * Kalau bukan di-deploy di Vercel (mis. dev lokal), semua field
 * akan fallback ke '-' -- tidak error, cuma kosong.
 */
export async function getGeoInfo(): Promise<GeoInfo> {
  const h = await headers();

  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '-',
    kota: h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : '-',
    wilayah: h.get('x-vercel-ip-country-region') || '-',
    negara: h.get('x-vercel-ip-country') || '-',
  };
}