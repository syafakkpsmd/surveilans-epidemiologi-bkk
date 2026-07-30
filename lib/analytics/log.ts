'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeoInfo } from './geo';

// Helper function untuk cek apakah IP berasal dari localhost
function isLocalIP(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.includes('127.0.0.1') ||
    ip.includes('localhost')
  );
}

export async function catatPageLoad(role: 'tamu' | 'petugas' | 'admin' = 'tamu') {
  // 🛑 PROTEKSI 1: Jika sedang dijalankan di mode 'npm run dev', abaikan!
  if (process.env.NODE_ENV === 'development') {
    console.log('[catatPageLoad] Skipped: Running on Development mode (Localhost)');
    return;
  }

  try {
    const geo = await getGeoInfo();

    // 🛑 PROTEKSI 2: Jika IP terdeteksi IP Localhost/Loopback, abaikan!
    if (isLocalIP(geo.ip)) {
      console.log('[catatPageLoad] Skipped: Localhost IP detected (', geo.ip, ')');
      return;
    }

    const supabase = await createClient();
    const { error } = await supabase.from('statistik_kunjungan').insert({
      tipe: 'pageload',
      role,
      ip_address: geo.ip,
      kota: geo.kota,
      wilayah: geo.wilayah,
      negara: geo.negara,
    });

    if (error) {
      console.error('[catatPageLoad] GAGAL INSERT:', JSON.stringify(error, null, 2));
    } else {
      console.log('[catatPageLoad] BERHASIL insert, role:', role);
    }
  } catch (e) {
    console.error('[catatPageLoad] EXCEPTION:', e);
  }
}

export async function catatLogin(role: string, userId: string) {
  // 🛑 PROTEKSI 1: Jika sedang dijalankan di mode 'npm run dev', abaikan!
  if (process.env.NODE_ENV === 'development') {
    console.log('[catatLogin] Skipped: Running on Development mode (Localhost)');
    return;
  }

  try {
    const geo = await getGeoInfo();

    // 🛑 PROTEKSI 2: Jika IP terdeteksi IP Localhost/Loopback, abaikan!
    if (isLocalIP(geo.ip)) {
      console.log('[catatLogin] Skipped: Localhost IP detected (', geo.ip, ')');
      return;
    }

    const roleClean = (role || 'petugas').toLowerCase().trim();
    const supabase = await createClient();

    const { error } = await supabase.from('statistik_kunjungan').insert({
      tipe: 'login',
      role: roleClean,
      user_id: userId,
      ip_address: geo.ip,
      kota: geo.kota,
      wilayah: geo.wilayah,
      negara: geo.negara,
    });

    if (error) {
      console.error('[catatLogin] GAGAL INSERT:', JSON.stringify(error, null, 2));
    } else {
      console.log('[catatLogin] BERHASIL insert, role:', roleClean);
    }
  } catch (e) {
    console.error('[catatLogin] EXCEPTION:', e);
  }
}