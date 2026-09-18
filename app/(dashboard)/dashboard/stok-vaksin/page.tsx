import { getDatasetStokVaksin } from '@/lib/klinik/dataset-stok';
import StokDashboardClient from './StokDashboardClient';
import { createClient } from '@/lib/supabase/server';

export default async function StokVaksinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };

  const { ringkasan, gagalDimuat } = await getDatasetStokVaksin();

  // BARU: daftar klinik+BKK untuk opsi filter di grafik Pemakaian vs Kerusakan
  const { data: daftarKlinikOpsi } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik, kategori, spreadsheet_id')
    .order('nama_klinik');

  return (
    <StokDashboardClient
      ringkasan={ringkasan}
      gagalDimuat={gagalDimuat}
      role={profile?.role ?? 'publik'}
      daftarKlinikOpsi={daftarKlinikOpsi ?? []}
    />
  );
}