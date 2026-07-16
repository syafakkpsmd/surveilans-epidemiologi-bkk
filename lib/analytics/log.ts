'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeoInfo } from './geo';

export async function catatPageLoad(role: 'tamu' | 'petugas' | 'admin' = 'tamu') {
  try {
    const geo = await getGeoInfo();
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

export async function catatLogin(role: 'petugas' | 'admin', userId: string) {
  try {
    const geo = await getGeoInfo();
    const supabase = await createClient();
    const { error } = await supabase.from('statistik_kunjungan').insert({
      tipe: 'login',
      role,
      user_id: userId,
      ip_address: geo.ip,
      kota: geo.kota,
      wilayah: geo.wilayah,
      negara: geo.negara,
    });
    if (error) {
      console.error('[catatLogin] GAGAL INSERT:', JSON.stringify(error, null, 2));
    } else {
      console.log('[catatLogin] BERHASIL insert, role:', role);
    }
  } catch (e) {
    console.error('[catatLogin] EXCEPTION:', e);
  }
}