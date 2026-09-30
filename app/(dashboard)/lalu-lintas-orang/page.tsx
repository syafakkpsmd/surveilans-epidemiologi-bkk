// app/(dashboard)/lalu-lintas-orang/page.tsx
//
// PUBLIK -- sengaja TIDAK ada redirect/guard login, sesuai permintaan
// (siapa saja boleh lihat, unduh dikunci role lewat route export).
// Kalau ternyata butuh tetap di dalam layout dashboard yang mensyaratkan
// login di level layout induknya, pindahkan file ini ke luar grup
// (dashboard) supaya benar-benar publik.

import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehUnduhLaluLintas } from "@/lib/auth/aksesLaluLintas";
import { getWilayahKerjaPenumpangKapal } from "@/lib/turso/queriesPenumpangKapal";
import { getWilayahKerjaAbkKapal } from "@/lib/supabase/queriesAbkKapal";
import LaluLintasOrangClient from "./LaluLintasOrangClient";

export const dynamic = "force-dynamic";

export default async function LaluLintasOrangPage() {
  // getStatusAkses() dipanggil HANYA untuk tahu boleh-tidaknya tombol unduh
  // ditampilkan -- bukan untuk mem-blokir akses halaman ini.
  const { role } = await getStatusAkses();
  const bisaUnduh = bolehUnduhLaluLintas(role);

  const [wilkerPenumpangKapal, wilkerCop, wilkerPhqc] = await Promise.all([
    getWilayahKerjaPenumpangKapal(),
    getWilayahKerjaAbkKapal("kedatangan-luar-negeri"),
    getWilayahKerjaAbkKapal("keberangkatan-luar-negeri"), // sumbernya kegiatan_phqc, sama utk semua tab PHQC
  ]);

  const daftarWilkerPerTab = {
    "penumpang-kapal": wilkerPenumpangKapal,
    "kedatangan-luar-negeri": wilkerCop,
    "kedatangan-dalam-negeri": wilkerPhqc,
    "keberangkatan-luar-negeri": wilkerPhqc,
    "keberangkatan-dalam-negeri": wilkerPhqc,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#0F2A38] mb-1">Lalu Lintas Orang</h1>
        <p className="text-sm text-gray-500">Data Penumpang Kapal dan ABK Kapal — Kedatangan &amp; Keberangkatan, Luar dan Dalam Negeri.</p>
      </div>

      <LaluLintasOrangClient
        bisaUnduh={bisaUnduh}
        tahunSekarang={new Date().getFullYear()}
        daftarWilkerPerTab={daftarWilkerPerTab}
      />
    </div>
  );
}