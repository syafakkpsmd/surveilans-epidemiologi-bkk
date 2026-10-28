<<<<<<< ours
// Sertifikat dan dokumen kapal (SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan): unggah Excel/ekspor Sinkarkes,
// input lewat form, dan daftar tabel berfilter (tahun, bulan, wilayah kerja). HANYA Petugas/Admin.
// ?modul=sscec|p3k|air|buku_kesehatan memilih modul yang dibuka lebih dulu.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { dapatkanModul, type ModulInput } from '@/lib/input-data/modul';
import InputDataClient from '../InputDataClient';

export const dynamic = 'force-dynamic';

const URUTAN = ['sscec', 'p3k', 'air', 'buku_kesehatan'];

export default async function SertifikatPage({ searchParams }: { searchParams: Promise<{ modul?: string | string[] }> }) {
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
      <InputDataClient modul={modul} role={role} awal={awal} judul="Sertifikat dan Dokumen Kapal" />
    </div>
  );
=======
// Sertifikat dan dokumen kapal (SSCEC, P3K Kapal, Sertifikat Air, Buku Kesehatan): unggah, form, dan daftar berfilter. Dialihkan ke modul pertama.
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/input-data/sertifikat/sscec');
>>>>>>> theirs
}
