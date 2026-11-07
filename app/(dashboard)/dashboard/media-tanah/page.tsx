// app/(dashboard)/dashboard/media-tanah/page.tsx
import { redirect } from 'next/navigation';
import { requireStaf } from '@/lib/media-tanah/auth';
import TanahClient from '@/components/media-tanah/TanahClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';

export const dynamic = 'force-dynamic';

export default async function HalamanMediaTanah() {
  const user = await requireStaf();
  if (!user) redirect('/login');
  return <TanahClient wilayah={await getDaftarWilker()} />;
}