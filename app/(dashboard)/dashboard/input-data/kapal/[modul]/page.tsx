// COP (kedatangan) dan PHQC (keberangkatan) kapal: unggah, form, daftar berfilter, isian petugas, dan Master Negara Kedatangan.
// Satu rute per modul (/kapal/{modul}); pemilih modul di dalam halaman tetap bisa berpindah. HANYA Petugas/Admin.
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import InputDataClient from '../../InputDataClient';

export const dynamic = 'force-dynamic';

const URUTAN = ['cop', 'phqc'];

export default async function Page({ params }: { params: Promise<{ modul: string }> }) {
  const { modul: awal } = await params;
  if (!URUTAN.includes(awal)) notFound();

  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  const modul = URUTAN.map(dapatkanModul).filter((m): m is ModulInput => !!m);
  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">&larr; Kembali ke Input Data</Link>
      </div>
      <InputDataClient modul={modul} role={role} awal={awal} judul="COP dan PHQC (Kapal)" />
    </div>
  );
}
