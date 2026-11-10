import { redirect } from 'next/navigation';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul } from '@/lib/input-data/modul';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');
  const modul = dapatkanModul('kier');
  if (!modul) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <InputDataClient wilayah={await getDaftarWilker()} modul={[modul]} role={role} awal="kier" judul="KIER Kesehatan (Sertifikat Pengujian Kesehatan)" />
    </div>
  );
}