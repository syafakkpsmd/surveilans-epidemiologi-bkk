// app/(dashboard)/dashboard/media-tanah/page.tsx
import { redirect } from 'next/navigation';
import { requireStaf } from '@/lib/media-tanah/auth';
import TanahClient from '@/components/media-tanah/TanahClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';

export const dynamic = 'force-dynamic';

export default async function HalamanMediaTanah({
  searchParams,
}: {
  // Next 15: searchParams berupa Promise. Di Next 14, pakai { tahun?: string } tanpa Promise & tanpa await.
  searchParams: Promise<{ tahun?: string }>;
}) {
  const user = await requireStaf();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const sekarang = new Date().getFullYear();
  const t = Number(sp.tahun);
  const tahun = Number.isInteger(t) && t >= 2000 && t <= sekarang + 1 ? t : sekarang;

  return <TanahClient wilayah={await getDaftarWilker()} tahun={tahun} />;
}