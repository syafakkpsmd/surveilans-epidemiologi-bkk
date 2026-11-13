// app/(dashboard)/dashboard/input-data/dokumen/[jenis]/page.tsx
// Unggah dokumen hasil pemeriksaan (PDF/foto) pada hari pemeriksaan. Satu rute per jenis: cop | sscec | phqc.
// HANYA Petugas/Admin; bagi pengunjung lain tidak ada query yang dijalankan.
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { DAFTAR_JENIS, KONFIG, adalahJenis } from '@/lib/dokumen-pemeriksaan/konfigurasi';
import { daftarDokumen, sinkronkanDokumen } from '@/lib/dokumen-pemeriksaan/server';
import DokumenClient from './DokumenClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ jenis: string }> }) {
  const { jenis } = await params;
  if (!adalahJenis(jenis)) notFound();

  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard');

  // Catat dokumen yang kuncinya sudah masuk ke data besar sejak kunjungan terakhir.
  await sinkronkanDokumen(jenis);

  const [daftar, wilker] = await Promise.all([daftarDokumen(jenis), getDaftarWilker()]);
  const opsiWilayah = wilker.filter((w) => w.aktif).map((w) => w.namaPendek);

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
        <Link href="/dashboard/input-data" className="text-sm text-[#0F4C5C] underline">
          &larr; Kembali ke Input Data
        </Link>

        <div className="flex flex-wrap gap-2">
          {DAFTAR_JENIS.map((j) => (
            <Link
              key={j}
              href={`/dashboard/input-data/dokumen/${j}`}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                j === jenis ? 'bg-[#0F4C5C] text-white' : 'border border-gray-300 bg-white text-[#0F2A38] hover:bg-gray-50'
              }`}
            >
              {KONFIG[j].label}
            </Link>
          ))}
        </div>

        <DokumenClient jenis={jenis} daftar={daftar} wilayah={opsiWilayah} role={role} />
      </div>
    </div>
  );
}