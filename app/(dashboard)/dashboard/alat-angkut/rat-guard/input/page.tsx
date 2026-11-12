// app/(dashboard)/dashboard/alat-angkut/rat-guard/input/page.tsx  (FILE BARU)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { MODUL, type ModulInput } from '@/lib/input-data/modul';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';
// `turunan` adalah fungsi: tidak boleh dikirim ke komponen klien.
const untukKlien = (m: ModulInput): ModulInput => ({
  ...m,
  kolom: m.kolom.map((k) => ({ ...k, turunan: undefined })),
});

export default async function HalamanInputRatGuard() {
  const role = await getUserRole();
  if (!role) redirect('/login');
  const modul = MODUL.rat_guard;
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) redirect('/dashboard/alat-angkut/rat-guard');
  const wilayah = await getWilkerModul('rat_guard');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/alat-angkut/rat-guard" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard Rat Guard</Link>
        <p className="mt-2 text-xs text-gray-600">Satu baris = satu wilayah kerja pada satu tanggal. Jumlah kapal dihitung otomatis dari terpasang + tidak terpasang.</p>
      </div>
      <InputDataClient modul={[untukKlien(modul)]} wilayah={wilayah} role={role} judul="Input Data Rat Guard" />
    </div>
  );
}
