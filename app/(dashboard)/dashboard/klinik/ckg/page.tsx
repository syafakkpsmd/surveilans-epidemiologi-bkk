// app/(dashboard)/dashboard/klinik/ckg/page.tsx
import { redirect } from 'next/navigation';
import { requireCkg } from '@/lib/klinik/ckg/auth';
import CkgClient from '@/components/klinik/ckg/CkgClient';
import { opsiWilayahCkg } from '@/lib/klinik/ckg/config';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';

export const dynamic = 'force-dynamic';

export default async function HalamanCkg() {
  const user = await requireCkg();
  if (!user) redirect('/login');
  return <CkgClient opsiWilayah={opsiWilayahCkg(await getDaftarWilker())} />;
}