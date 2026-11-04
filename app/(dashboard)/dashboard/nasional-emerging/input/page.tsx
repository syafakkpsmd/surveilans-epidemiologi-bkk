import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getDaftarPenyakit, getDaftarPropinsi } from '@/lib/db/modul/nasionalEmerging';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import FormInputEmerging from './FormInputEmerging';

export const dynamic = 'force-dynamic';

export default async function InputNasionalEmergingPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) {
    redirect('/dashboard/nasional-emerging');
  }

  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());
  const [daftarPropinsi, daftarPenyakit] = await Promise.all([
    getDaftarPropinsi(),
    getDaftarPenyakit(),
  ]);

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/dashboard/nasional-emerging" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke Penyakit Infeksi Emerging Nasional
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Input Data Emerging Nasional</h1>
        </div>
        <FormInputEmerging
          daftarPenyakit={daftarPenyakit}
          daftarPropinsi={daftarPropinsi}
          tahunAwal={tahunEpid}
          mingguAwal={Math.max(1, mingguEpid - 1)}
        />
      </div>
    </div>
  );
}