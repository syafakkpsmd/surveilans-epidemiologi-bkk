import Link from "next/link";
import { getUserRole } from "@/lib/auth/get-user-role";
import { hariIniWita, periodeBawaan } from "@/lib/laporan-bulanan/periode";
import LaporanBulananClient from "./LaporanBulananClient";

export const dynamic = "force-dynamic";

export default async function LaporanBulananPage() {
  const role = await getUserRole();
  const bolehAkses = role === "admin" || role === "petugas";

  if (!bolehAkses) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Laporan Bulanan</h1>
        <p className="mt-3 text-slate-600">Halaman ini hanya tersedia untuk pengguna yang sudah masuk.</p>
        <Link href="/login" className="mt-4 inline-block rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Masuk
        </Link>
      </main>
    );
  }

  const hariIni = hariIniWita();
  const [tahunSekarang, bulanSekarang] = hariIni.split("-").map(Number);
  const awal = periodeBawaan(hariIni);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <LaporanBulananClient
        tahunAwal={awal.tahun}
        bulanAwal={awal.bulanAkhir}
        tahunSekarang={tahunSekarang}
        bulanSekarang={bulanSekarang}
      />
    </main>
  );
}
