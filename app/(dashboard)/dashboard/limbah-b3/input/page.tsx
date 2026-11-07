// app/(dashboard)/dashboard/limbah-b3/input/page.tsx  (FILE BARU)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { MODUL } from '@/lib/input-data/modul';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function HalamanInputLimbahB3() {
  const role = await getUserRole();
  if (!role) redirect('/login');
  const modul = MODUL.limbah_b3;
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) redirect('/dashboard/limbah-b3');
  const wilayah = await getWilkerModul('limbah_b3');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/limbah-b3" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard Limbah B3</Link>
      </div>
      <InputDataClient modul={[modul]} wilayah={wilayah} role={role} judul="Input Data Pemeriksaan Limbah B3 Klinik" />
    </div>
  );
}
