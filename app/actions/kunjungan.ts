'use server';

/**
 * Dipanggil dari SERVER COMPONENT halaman dashboard...
 */

import { getDbClient } from '@/lib/db/client';

export async function catatKunjungan(halaman: string): Promise<void> {
  try {
    await getDbClient().execute({
      sql: 'INSERT INTO kunjungan_tamu (halaman) VALUES (?)',
      args: [halaman],
    });
  } catch (err) {
    // Sengaja ditelan agar kegagalan database/koneksi lokal 
    // tidak membuat halaman dashboard ikut crash / gagal tampil.
    console.error('Gagal mencatat kunjungan tamu (diabaikan):', err);
  }
}