// app/(dashboard)/dashboard/media-tanah/page.tsx
import TanahClient from '@/components/media-tanah/TanahClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';

export const dynamic = 'force-dynamic';

export default async function HalamanMediaTanah({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  // Cek status akses secara soft (tidak langsung redirect)
  const { sudahLogin, role } = await getStatusAkses();
  const isStaf = sudahLogin && (role === 'petugas' || role === 'admin');

  const sp = await searchParams;
  const sekarang = new Date().getFullYear();
  const t = Number(sp.tahun);
  const tahun = Number.isInteger(t) && t >= 2000 && t <= sekarang + 1 ? t : sekarang;

  return (
    <TanahClient 
      wilayah={await getDaftarWilker()} 
      tahun={tahun} 
      isStaf={isStaf} 
    />
  );
}