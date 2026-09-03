import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function getStandarHariVaksin(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('pengaturan_klinik')
    .select('standar_hari_vaksin')
    .eq('id', 1)
    .single();
  return data?.standar_hari_vaksin ?? 14; // fallback aman kalau tabel kosong
}