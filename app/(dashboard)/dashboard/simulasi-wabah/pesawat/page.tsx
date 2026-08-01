import { createClient } from "@/lib/supabase/server";
import { SimulasiPesawatClient } from "@/components/simulasi-wabah/SimulasiPesawatClient";

export default async function HalamanSimulasiPesawat() {
  const supabase = await createClient();

  const [
    { data: { user } },
    { data: daftarPenyakit },
    { data: daftarWilker },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("referensi_parameter_penyakit").select("*").order("kategori"),
    supabase.from("wilker_ref").select("kode, nama").eq("jenis", "Bandara").order("nama"),
  ]);

  let role: string | null = null;
  if (user) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profil?.role ?? null;
  }

  const { data: riwayatSimulasi } = await supabase
    .from("simulasi_wabah_pesawat")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <SimulasiPesawatClient
      sudahLogin={!!user}
      role={role}
      daftarPenyakit={daftarPenyakit ?? []}
      daftarWilker={daftarWilker ?? []}
      riwayatSimulasi={riwayatSimulasi ?? []}
    />
  );
}