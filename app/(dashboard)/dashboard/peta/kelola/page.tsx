import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KelolaFasilitasClient from "@/components/peta/KelolaFasilitasClient";

export default async function KelolaPelabuhanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard/peta");
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Pelabuhan & Bandara</h1>
        <p className="text-sm text-gray-500">
          Tambah, edit, atau hapus data fasilitas per wilayah kerja.
        </p>
      </div>
      <KelolaFasilitasClient />
    </div>
  );
}