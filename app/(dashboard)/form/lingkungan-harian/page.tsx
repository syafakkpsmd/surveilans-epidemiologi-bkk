import { ambilDaftarLokasiUdara } from '@/lib/supabase/queries-karhutla-server';
import FormLingkunganHarianPublikClient from './FormLingkunganHarianPublikClient';

export const dynamic = 'force-dynamic';

export default async function HalamanFormLingkunganHarian() {
  const daftarLokasi = await ambilDaftarLokasiUdara();
  return <FormLingkunganHarianPublikClient daftarLokasi={daftarLokasi} />;
}