'use server';

/**
 * Dipanggil dari SERVER COMPONENT halaman dashboard (mis. di dalam
 * app/dashboard/page.tsx), SEKALI per render:
 *
 *   import { catatKunjungan } from '@/app/actions/kunjungan';
 *   export default async function DashboardPage() {
 *     await catatKunjungan('/dashboard');
 *     // ...render dashboard seperti biasa
 *   }
 *
 * SENGAJA sebagai Server Action yang dipanggil langsung dari Server
 * Component (bukan dari useEffect di Client Component), supaya:
 *   1. Tidak dobel-catat saat re-render di sisi client / re-hydrate.
 *   2. Tetap tercatat meski JavaScript di browser gagal/lambat load.
 *
 * Kegagalan INSERT TIDAK BOLEH membuat dashboard gagal tampil --
 * karena itu errornya ditelan (catch) dan hanya di-log ke console.
 */

import { createClient } from '@/lib/supabase/server';

export async function catatKunjungan(halaman: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('kunjungan_tamu').insert({ halaman });

    if (error) {
      console.error('Gagal mencatat kunjungan tamu:', error.message);
    }
  } catch (err) {
    console.error('Gagal mencatat kunjungan tamu:', err);
  }
}