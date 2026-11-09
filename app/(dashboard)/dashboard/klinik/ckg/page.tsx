// app/(dashboard)/dashboard/klinik/ckg/page.tsx
import { redirect } from 'next/navigation';
import { requireCkg } from '@/lib/klinik/ckg/auth';
import CkgClient from '@/components/klinik/ckg/CkgClient';
import { opsiWilayahCkg } from '@/lib/klinik/ckg/config';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { bacaTahun } from '@/lib/tahun';

export default async function HalamanCkg({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const user = await requireCkg();
  if (!user) redirect('/login');

  const { tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? bacaTahun(tahunParam, 0) : new Date().getFullYear();

  return <CkgClient opsiWilayah={opsiWilayahCkg(await getDaftarWilker())} tahun={tahun} />;
}

export const dynamic = 'force-dynamic';
