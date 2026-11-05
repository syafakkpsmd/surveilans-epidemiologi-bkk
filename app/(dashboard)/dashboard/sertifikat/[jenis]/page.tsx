import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getBarisSertifikat } from '@/lib/db/modul/sertifikatData';
import { META_SERTIFIKAT, type JenisSertifikat } from '@/lib/sertifikat/meta';
import SertifikatClient from './SertifikatClient';

export const dynamic = 'force-dynamic';

const PERAN_BOLEH = ['admin', 'petugas', 'petugas_klinik'];

export default async function HalamanSertifikat({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const role = await getUserRole();
  if (role === 'tamu') redirect('/login');
  if (!PERAN_BOLEH.includes(role)) redirect('/dashboard');

  const { jenis } = await params;
  if (!(jenis in META_SERTIFIKAT)) notFound();
  const meta = META_SERTIFIKAT[jenis as JenisSertifikat];

  const { tahun: t } = await searchParams;
  const tahunIni = new Date().getFullYear();
  const parsed = t ? parseInt(t, 10) : tahunIni;
  const tahun = Number.isInteger(parsed) && parsed >= 2020 && parsed <= tahunIni + 1 ? parsed : tahunIni;

  const rows = await getBarisSertifikat(jenis as JenisSertifikat, tahun);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <Link href="/dashboard/sertifikat" className="text-sm text-teal-800 underline">
        &larr; Sertifikat dan Dokumen Kapal
      </Link>
      <SertifikatClient
        jenis={jenis as JenisSertifikat}
        meta={meta}
        tahun={tahun}
        tahunPilihan={[tahunIni, tahunIni - 1, tahunIni - 2]}
        rows={rows}
      />
    </div>
  );
}