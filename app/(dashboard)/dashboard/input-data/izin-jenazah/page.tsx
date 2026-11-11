// Surat izin angkut jenazah (Sinkarkes): unggah ekspor "Rekap Surat Izin Jenazah" apa adanya (berbagai model tanggal),
// input satu per satu, dan daftar tabel berfilter (tahun, bulan, wilayah kerja). HANYA Petugas/Admin.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function IzinJenazahPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  const modul = ['izin_jenazah'].map(dapatkanModul).filter((m): m is ModulInput => !!m);
  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke Input Data</Link>
      </div>
      <InputDataClient wilayah={await getDaftarWilker()} modul={modul} role={role} awal="izin_jenazah" judul="Izin Jenazah (Sinkarkes)" />
    </div>
  );
}
