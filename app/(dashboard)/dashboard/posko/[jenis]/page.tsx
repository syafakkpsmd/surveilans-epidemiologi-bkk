// app/(dashboard)/dashboard/posko/[jenis]/page.tsx
// /dashboard/posko/nataru  dan  /dashboard/posko/idul-fitri   (opsional: ?tahun=2027 untuk periode lain)
import { notFound } from 'next/navigation';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { bolehKelolaPosko } from '@/lib/auth/aksesPosko';
import { SLUG_KE_JENIS } from '@/lib/posko/konstanta';
import { ambilDataPosko } from '@/lib/posko/queries';
import PoskoDashboardClient from '@/components/posko/PoskoDashboardClient';

export const dynamic = 'force-dynamic';

export default async function PoskoPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { jenis } = await params;
  const { tahun } = await searchParams;
  const posko = SLUG_KE_JENIS[jenis];
  if (!posko) notFound();

  const [data, { role }] = await Promise.all([
    ambilDataPosko(posko, tahun && /^\d{4}$/.test(tahun) ? Number(tahun) : undefined),
    getStatusAkses(),
  ]);
  return <PoskoDashboardClient key={data.periode?.tahun ?? 'kosong'} slug={jenis} data={data} bolehKelola={bolehKelolaPosko(role)} />;
}
