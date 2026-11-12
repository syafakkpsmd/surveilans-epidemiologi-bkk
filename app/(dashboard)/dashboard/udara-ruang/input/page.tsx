// app/(dashboard)/dashboard/udara-ruang/input/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { MODUL } from '@/lib/input-data/modul';
import { untukKlien } from '@/lib/input-data/untuk-klien';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function HalamanInputUdaraRuang() {
  const role = await getUserRole();
  if (!role) redirect('/login');
  const modul = MODUL.udara_ruang;
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) redirect('/dashboard/udara-ruang');
  const wilayah = await getWilkerModul('udara_ruang');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/udara-ruang" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard Udara Dalam Ruang</Link>
        <p className="mt-2 text-xs text-gray-600">Data yang disimpan di sini langsung tersimpan di tabel kualitas udara Karhutla (satu kali entri).</p>
      </div>
      <InputDataClient modul={[untukKlien(modul)]} wilayah={wilayah} role={role} judul="Input Data Pemeriksaan Udara Dalam Ruang" />
    </div>
  );
}