import { ambilDaftarWilayahIspa } from '@/lib/supabase/queries-karhutla-server';
import FormIspaHarianPublikClient from './FormIspaHarianPublikClient';

export const dynamic = 'force-dynamic';

export default async function HalamanFormIspaHarian() {
  const daftarWilayah = await ambilDaftarWilayahIspa();
  return <FormIspaHarianPublikClient daftarWilayah={daftarWilayah} />;
}