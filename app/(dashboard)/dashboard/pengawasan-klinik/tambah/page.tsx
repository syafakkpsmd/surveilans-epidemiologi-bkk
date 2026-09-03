// app/(dashboard)/dashboard/pengawasan-klinik/tambah/page.tsx
import { createClient } from '@/lib/supabase/server';
import PengawasanKlinikFormClient from './PengawasanKlinikFormClient';

export default async function TambahPengawasanKlinikPage() {
  const supabase = await createClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik')
    .order('nama_klinik');

  return <PengawasanKlinikFormClient daftarKlinik={daftarKlinik ?? []} />;
}