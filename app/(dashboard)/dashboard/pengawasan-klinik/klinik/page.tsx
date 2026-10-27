// app/(dashboard)/dashboard/pengawasan-klinik/klinik/page.tsx
import { createDbClient } from '@/lib/db/server';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { redirect } from 'next/navigation';
import KelolaKlinikClient from './KelolaKlinikClient';

export default async function KelolaKlinikPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || role !== 'admin') redirect('/login');

  const supabase = await createDbClient();
  const { data: daftarKlinik } = await supabase
  .from('klinik_binaan')
  .select('*')
  .order('kabupaten_kota')
  .order('nama_klinik');

  return <KelolaKlinikClient daftarKlinik={daftarKlinik ?? []} />;
}