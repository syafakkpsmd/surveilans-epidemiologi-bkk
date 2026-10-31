import { getDatasetStokVaksin } from '@/lib/klinik/dataset-stok';
import StokDashboardClient from './StokDashboardClient';
import Link from 'next/link';
import { getAksesKlinik, opsiDariAkses } from '@/lib/klinik/akses';
import { getDbClient } from '@/lib/db/client';

type OpsiKlinik = { id: string; nama_klinik: string; kategori: string | null; spreadsheet_id: string | null };

export default async function StokVaksinPage() {
  const akses = await getAksesKlinik();
  const user = akses.pengguna;

  // petugas_klinik: hanya stok klinik yang ditautkan ke akunnya
  const { ringkasan, gagalDimuat } = await getDatasetStokVaksin(opsiDariAkses(akses));

  // BARU: daftar klinik+BKK untuk opsi filter di grafik Pemakaian vs Kerusakan
  const { rows: daftarKlinikOpsi } = await getDbClient().execute(
    'SELECT id, nama_klinik, kategori, spreadsheet_id FROM klinik_binaan ORDER BY nama_klinik'
  );

  const opsiKlinik = (daftarKlinikOpsi as OpsiKlinik[]).filter((k) => akses.semua || akses.klinikIds.includes(k.id));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/dashboard/klinik" className="rounded-lg border border-[#0F4C5C] px-3 py-2 text-xs font-medium text-[#0F4C5C] hover:bg-gray-50">
          &larr; Dashboard Klinik Binaan
        </Link>
        {(user?.role === 'admin' || user?.role === 'petugas' || user?.role === 'petugas_klinik') && (
          <Link href="/dashboard/klinik/input?bagian=stok" className="rounded-lg bg-[#0F4C5C] px-3 py-2 text-xs font-medium text-white hover:bg-[#0c3d4a]">
            + Input Data
          </Link>
        )}
      </div>
      <StokDashboardClient
        ringkasan={ringkasan}
        gagalDimuat={gagalDimuat}
        role={user?.role ?? 'publik'}
        daftarKlinikOpsi={opsiKlinik}
      />
    </>
  );
}