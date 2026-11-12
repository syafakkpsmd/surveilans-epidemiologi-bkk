// app/(dashboard)/dashboard/karhutla/input-ispa/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getWilkerModul } from '@/lib/wilayah-kerja/server';
import { MODUL } from '@/lib/input-data/modul';
import { untukKlien } from '@/lib/input-data/untuk-klien';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

export default async function HalamanInputIspa() {
  const role = await getUserRole();
  if (!role) redirect('/login');
  const modul = MODUL.ispa;
  if (role !== 'admin' && !(modul.peranBoleh as string[]).includes(role)) redirect('/dashboard/karhutla');
  const wilayah = await getWilkerModul('ispa');

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/karhutla" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard Karhutla</Link>
        <p className="mt-2 text-xs text-gray-600">
          Satu baris = satu tanggal pada satu wilayah kerja (dan zona, bila ada). Kosongkan Zona untuk wilayah yang tidak dibagi per zona.
          Zona "Klinik Pelabuhan Samarinda" otomatis diambil dari modul Kunjungan Poliklinik; isi manual hanya untuk tanggal tanpa kunjungan.
        </p>
      </div>
      <InputDataClient modul={[untukKlien(modul)]} wilayah={wilayah} role={role} judul="Input Data Kasus ISPA" />
    </div>
  );
}