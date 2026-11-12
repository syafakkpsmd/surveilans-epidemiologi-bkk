// app/(dashboard)/dashboard/media-tanah/page.tsx
// DASHBOARD saja: terbuka untuk tamu. Form input, unggah Excel, dan riwayat ada di ./input (wajib login).
import TanahClient from '@/components/media-tanah/TanahClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { requireStaf } from '@/lib/media-tanah/auth';

export const dynamic = 'force-dynamic';

export default async function HalamanMediaTanah({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const isStaf = !!(await requireStaf()); // hanya untuk menampilkan tautan "Input data"; keamanan ada di halaman input dan API

  const sp = await searchParams;
  const sekarang = new Date().getFullYear();
  const t = Number(sp.tahun);
  const tahun = Number.isInteger(t) && t >= 2000 && t <= sekarang + 2 ? t : sekarang;

  return <TanahClient wilayah={await getDaftarWilker()} tahun={tahun} isStaf={isStaf} />;
}
