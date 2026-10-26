import { getDatasetStokVaksin } from '@/lib/klinik/dataset-stok';
import StokDashboardClient from './StokDashboardClient';
import { getPengguna } from '@/lib/auth/session';
import { getDbClient } from '@/lib/db/client';

type OpsiKlinik = { id: string; nama_klinik: string; kategori: string | null; spreadsheet_id: string | null };

export default async function StokVaksinPage() {
  const user = await getPengguna();

  const { ringkasan, gagalDimuat } = await getDatasetStokVaksin();

  // BARU: daftar klinik+BKK untuk opsi filter di grafik Pemakaian vs Kerusakan
  const { rows: daftarKlinikOpsi } = await getDbClient().execute(
    'SELECT id, nama_klinik, kategori, spreadsheet_id FROM klinik_binaan ORDER BY nama_klinik'
  );

  return (
    <StokDashboardClient
      ringkasan={ringkasan}
      gagalDimuat={gagalDimuat}
      role={user?.role ?? 'publik'}
      daftarKlinikOpsi={daftarKlinikOpsi as OpsiKlinik[]}
    />
  );
}