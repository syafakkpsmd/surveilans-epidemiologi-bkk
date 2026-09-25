// app/(dashboard)/dashboard/klinik/tabel/page.tsx

import { redirect } from "next/navigation";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getWilayahKerjaHiv } from "@/lib/turso/queriesHivVct";
import { getWilayahKerjaTb } from "@/lib/turso/queriesTb";
import TabelKlinikTabs from "./TabelKlinikTabs";

export const dynamic = "force-dynamic";

export default async function TabelKlinikPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    redirect("/");
  }

  const tahunSekarang = new Date().getFullYear();
  const [daftarWilkerHiv, daftarWilkerTb] = await Promise.all([
    getWilayahKerjaHiv(),
    getWilayahKerjaTb(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#0F2A38] mb-1">Tabel Klinik</h1>
        <p className="text-sm text-gray-500">Data individu program klinik — pilih tabel di bawah.</p>
      </div>

      <TabelKlinikTabs
        daftarWilkerHiv={daftarWilkerHiv}
        daftarWilkerTb={daftarWilkerTb}
        tahunSekarang={tahunSekarang}
      />
    </div>
  );
}