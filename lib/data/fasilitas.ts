import { createClient } from "@/lib/supabase/client";

export interface Fasilitas {
  id: string;
  kode_wilker: string;
  nama: string;
  tipe: "pelabuhan" | "bandara";
  lat: number;
  lng: number;
  deskripsi: string | null;
}

export interface FasilitasFoto {
  id: string;
  fasilitas_id: string;
  kategori: "pelabuhan" | "kegiatan";
  url: string;
  caption: string | null;
}

export async function getFasilitas(): Promise<Fasilitas[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("fasilitas_pelabuhan").select("*").order("nama");
  if (error) {
    console.error("Gagal memuat fasilitas:", JSON.stringify(error, null, 2));
    throw error;
  }
  return (data ?? []) as Fasilitas[];  // 👈 tambahkan `as Fasilitas[]`
}

export async function getFotoByFasilitas(fasilitasId: string): Promise<FasilitasFoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fasilitas_foto")
    .select("*")
    .eq("fasilitas_id", fasilitasId);
  if (error) throw error;
  return (data ?? []) as FasilitasFoto[];  // 👈 tambahkan `as FasilitasFoto[]`
}
export async function hapusFasilitas(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fasilitas_pelabuhan").delete().eq("id", id);
  if (error) throw error;
}