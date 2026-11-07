// app/(dashboard)/dashboard/pab/input/page.tsx  (FILE BARU)
// Input manual + unggah Excel PAB. Seluruh logika ada di kerangka input-data (modul MODUL.pab).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { MODUL } from '@/lib/input-data/modul';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function HalamanInputPAB() {
  const role = await getUserRole();
  if (!role) redirect('/login');
  const modul = MODUL.pab;
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) redirect('/dashboard/pab');

  // Wilayah yang dicentang admin untuk modul ini (Pengaturan Wilayah Kerja). BKK lain cukup mengubah centangnya.
  const wilayah = await getWilkerModul('pab');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/pab" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard PAB</Link>
      </div>
      <InputDataClient modul={[modul]} wilayah={wilayah} role={role} judul="Input Data PAB" />
    </div>
  );
}
