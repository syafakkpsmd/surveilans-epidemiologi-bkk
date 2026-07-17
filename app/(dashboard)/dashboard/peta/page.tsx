import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PetaWilkerClient from "@/components/peta/PetaWilkerClient";

export default async function PetaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Peta Wilayah Kerja</h1>
          <p className="text-sm text-gray-500">
            Klik salah satu titik untuk melihat detail lokasi wilker.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/peta/kelola"
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50"
          >
            ⚙️ Kelola Pelabuhan
          </Link>
        )}
      </div>
      <PetaWilkerClient isAdmin={isAdmin} />
    </div>
  );
}