// SIAOS (Izin Angkut Orang Sakit): unggah ekspor Sinkarkes, form satu per satu, dan daftar berfilter. HANYA Petugas/Admin.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

// Fungsi (turunan, siapkanBaris) tidak boleh dikirim ke komponen klien; server memakainya saat validasi di API.
const untukKlien = (m: ModulInput): ModulInput => ({
  ...m,
  siapkanBaris: undefined,
  kolom: m.kolom.map((k) => ({ ...k, turunan: undefined })),
});

export default async function Page() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  const modul = ['siaos'].map(dapatkanModul).filter((m): m is ModulInput => !!m).map(untukKlien);
  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke Input Data</Link>
      </div>
      <InputDataClient wilayah={await getDaftarWilker()} modul={modul} role={role} awal="siaos" judul="SIAOS (Izin Angkut Orang Sakit)" />
    </div>
  );
}