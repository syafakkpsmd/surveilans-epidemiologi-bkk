// app/(dashboard)/dashboard/pengawasan-klinik/tambah/page.tsx
import { createClient } from '@/lib/supabase/server';
import PengawasanKlinikFormClient from './PengawasanKlinikFormClient';
import RegistrasiOffline from '@/components/pengawasan-klinik/RegistrasiOffline';
import BannerAntrianOffline from '@/components/pengawasan-klinik/BannerAntrianOffline';

export default async function TambahPengawasanKlinikPage() {
  const supabase = await createClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik')
    .order('nama_klinik');

  return (
    <>
      <RegistrasiOffline />
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <BannerAntrianOffline />
      </div>
      <PengawasanKlinikFormClient daftarKlinik={daftarKlinik ?? []} />
    </>
  );
}