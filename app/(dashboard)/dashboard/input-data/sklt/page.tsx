import { redirect } from 'next/navigation';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

// `turunan` adalah fungsi: tidak boleh dikirim ke komponen klien (server memakainya saat validasi).
const untukKlien = (m: ModulInput): ModulInput => ({ ...m, kolom: m.kolom.map((k) => ({ ...k, turunan: undefined })) });

export default async function Page() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');
  const modul = dapatkanModul('sklt');
  if (!modul) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <InputDataClient wilayah={await getDaftarWilker()} modul={[untukKlien(modul)]} role={role} awal="sklt" judul="SKLT (Sertifikat Laik Terbang)" />
    </div>
  );
}