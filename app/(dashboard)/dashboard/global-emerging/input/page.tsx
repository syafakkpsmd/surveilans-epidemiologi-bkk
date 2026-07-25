// app/(dashboard)/global-emerging/input/page.tsx
// Halaman input manual & upload CSV -- HANYA untuk Petugas/Admin.
// Tamu yang mengakses URL ini langsung di-redirect ke /global-emerging
// (bukan 500 error), sesuai pola proteksi halaman admin lain di project.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import FormInputManual from '@/components/global-emerging/FormInputManual';
import UploadCsvGlobalEmerging from '@/components/global-emerging/UploadCsvGlobalEmerging';

export default async function GlobalEmergingInputPage() {
  const { sudahLogin, role } = await getStatusAkses();

  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    redirect('/dashboard/global-emerging');
  }

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/dashboard/global-emerging" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke Dashboard Global Emerging
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">
            Input Data Penyakit Infeksi Emerging
          </h1>
          <p className="text-sm text-gray-500">
            Untuk penyakit yang belum ada sumber otomatis, atau koreksi data.
          </p>
        </div>

        <FormInputManual />
        <UploadCsvGlobalEmerging />
      </div>
    </div>
  );
}
