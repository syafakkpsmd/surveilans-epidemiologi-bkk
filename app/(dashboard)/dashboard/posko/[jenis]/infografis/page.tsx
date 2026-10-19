// app/(dashboard)/dashboard/posko/[jenis]/infografis/page.tsx
import { notFound } from 'next/navigation';
import { SLUG_KE_JENIS } from '@/lib/posko/konstanta';
import { ambilDataPosko } from '@/lib/posko/queries';
import PoskoInfografisClient from '@/components/posko/PoskoInfografisClient';

export const dynamic = 'force-dynamic';

export default async function PoskoInfografisPage({
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

  const data = await ambilDataPosko(posko, tahun && /^\d{4}$/.test(tahun) ? Number(tahun) : undefined);
  return <PoskoInfografisClient slug={jenis} data={data} />;
}
