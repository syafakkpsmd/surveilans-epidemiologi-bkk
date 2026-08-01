"use server";

import { createClient } from "@/lib/supabase/server";

export async function ambilPrefillPopulasiKapal(wilayahKerja: string) {
  if (!wilayahKerja) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("referensi_populasi_wilker")
    .select("*")
    .eq("jenis_wilker", "Pelabuhan")
    .eq("wilayah_kerja", wilayahKerja)
    .maybeSingle();
  return data;
}

export async function ambilPrefillPopulasiPesawat(kodeWilker: string) {
  if (!kodeWilker) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("referensi_populasi_wilker")
    .select("*")
    .eq("jenis_wilker", "Bandara")
    .eq("kode_wilker", kodeWilker)
    .maybeSingle();
  return data;
}