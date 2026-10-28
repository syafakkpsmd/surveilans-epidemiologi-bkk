// Sertifikat dan dokumen kapal (SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan): unggah, form, dan daftar berfilter.
// Satu rute per modul (/sertifikat/{modul}); pemilih modul di dalam halaman tetap bisa berpindah. HANYA Petugas/Admin.
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import InputDataClient from '../../InputDataClient';

export const dynamic = 'force-dynamic';

const URUTAN = ['sscec', 'p3k', 'air', 'buku_kesehatan'];

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
      <InputDataClient modul={modul} role={role} awal={awal} judul="Sertifikat dan Dokumen Kapal" />
    </div>
  );
}
