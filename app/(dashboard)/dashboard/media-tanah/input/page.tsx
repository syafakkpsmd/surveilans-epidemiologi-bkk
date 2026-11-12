// app/(dashboard)/dashboard/media-tanah/input/page.tsx  (FILE BARU)
// Input pemeriksaan, unggah Excel, dan riwayat. WAJIB login sebagai staf (admin/petugas).
import { redirect } from 'next/navigation';
import TanahInputClient from '@/components/media-tanah/TanahInputClient';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { requireStaf } from '@/lib/media-tanah/auth';

export const dynamic = 'force-dynamic';

export default async function HalamanInputMediaTanah() {
  const { sudahLogin } = await getStatusAkses();
  if (!sudahLogin) redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu.'));
  if (!(await requireStaf())) redirect('/dashboard/media-tanah');

  return <TanahInputClient wilayah={await getDaftarWilker()} />;
}
