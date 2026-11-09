// Surveilans penyakit (HIV/VCT, TB, Migrasi Malaria): input lewat form, unggah Excel dengan berbagai model tanggal,
// dan daftar tabel berfilter (tahun, bulan, wilayah kerja). HANYA Petugas/Admin.
// ?modul=hiv|tb|migrasi_malaria memilih modul yang dibuka lebih dulu.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import InputDataClient from '@/components/input-data/InputDataClient';

export const dynamic = 'force-dynamic';

const URUTAN = ['hiv', 'tb', 'migrasi_malaria'];

export default async function PenyakitPage({ searchParams }: { searchParams: Promise<{ modul?: string | string[] }> }) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  const sp = await searchParams;
  const awal = Array.isArray(sp.modul) ? sp.modul[0] : sp.modul;
  const modul = URUTAN.map(dapatkanModul).filter((m): m is ModulInput => !!m);

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke Input Data</Link>
      </div>
      <InputDataClient wilayah={await getDaftarWilker()} modul={modul} role={role} awal={awal} judul="HIV, TB, dan Migrasi Malaria" />
    </div>
  );
}
