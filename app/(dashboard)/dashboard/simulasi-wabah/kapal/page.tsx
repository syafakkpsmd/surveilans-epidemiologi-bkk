import { createClient } from "@/lib/supabase/server";
import { SimulasiKapalClient } from "@/components/simulasi-wabah/SimulasiKapalClient";
import { PeranUser } from "@/types/database.types";

const WILAYAH_KAPAL = [
  { value: "Samarinda", label: "Pelabuhan Samarinda" },
  { value: "TanjungSantan", label: "Pelabuhan Tanjung Santan" },
  { value: "TanjungLaut", label: "Pelabuhan Tanjung Laut" },
  { value: "Lhoktuan", label: "Pelabuhan Lhoktuan" },
  { value: "Sangatta", label: "Pelabuhan Sangatta" },
  { value: "Sangkulirang", label: "Pelabuhan Sangkulirang" },
] as const;

export default async function HalamanSimulasiKapal() {
  const supabase = await createClient();

  const [
    { data: { user } },
    { data: daftarPenyakit },
    { data: daftarWilayah },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("referensi_parameter_penyakit").select("*").order("kategori"),
    supabase.from("wilker_ref").select("kode, nama").order("nama"),
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
    .from("simulasi_wabah_kapal")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <SimulasiKapalClient
      sudahLogin={!!user}
      role={role as PeranUser | null}
      daftarPenyakit={daftarPenyakit ?? []}
      daftarWilayah={WILAYAH_KAPAL as unknown as { value: string; label: string }[]}
      riwayatSimulasi={riwayatSimulasi ?? []}
    />
  );
}