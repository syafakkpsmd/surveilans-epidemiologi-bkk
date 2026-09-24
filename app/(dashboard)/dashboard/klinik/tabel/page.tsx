// app/(dashboard)/dashboard/klinik/tabel/page.tsx
//
// GANTI halaman lama (yang sebelumnya isinya HIV saja) dengan file ini.
// Sub-komponen HIV & TB tetap dipisah filenya (TabelHivDownloadClient.tsx,
// TabelTbDownloadClient.tsx) supaya masing-masing gampang dikelola, tapi
// dirender bertumpuk di 1 halaman ini -- bukan di URL/page terpisah lagi.

import { redirect } from "next/navigation";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getWilayahKerjaHiv } from "@/lib/turso/queriesHivVct";
import { getKabupatenKotaTb } from "@/lib/turso/queriesTb";
import TabelHivDownloadClient from "./TabelHivDownloadClient";
import TabelTbDownloadClient from "./TabelTbDownloadClient";

export const dynamic = "force-dynamic";

export default async function TabelKlinikPage() {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    redirect("/");
  }

  const tahunSekarang = new Date().getFullYear();
  const [daftarWilkerHiv, daftarKabKotaTb] = await Promise.all([
    getWilayahKerjaHiv(),
    getKabupatenKotaTb(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-[#0F2A38] mb-1">Tabel Klinik</h1>
        <p className="text-sm text-gray-500">Data individu program klinik — HIV, TBC, dan modul lain menyusul.</p>
      </div>

      <section>
        <h2 className="text-lg font-bold text-[#0F2A38] mb-3">Data Individu Mobile VCT PP HIV</h2>
        <TabelHivDownloadClient daftarWilker={daftarWilkerHiv} tahunSekarang={tahunSekarang} />
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#0F2A38] mb-3">Laporan Individu Hasil Skrining TBC</h2>
        <TabelTbDownloadClient daftarKabupatenKota={daftarKabKotaTb} tahunSekarang={tahunSekarang} />
      </section>

      {/* Modul berikutnya (mis. Poliklinik) tinggal tambah <section> baru di sini,
          dengan query/route/client-nya sendiri seperti pola HIV & TB di atas. */}
    </div>
  );
}