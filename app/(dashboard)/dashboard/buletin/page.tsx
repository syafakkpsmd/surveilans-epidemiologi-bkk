import Link from "next/link";
import { getBuletin } from "@/lib/db/queries/umum";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import BuletinInteraktif, { type BuletinItem } from "@/components/dashboard/BuletinInteraktif";

export const dynamic = "force-dynamic";

export default async function BuletinPage() {
  let isPetugasAtauAdmin = false;
  try {
    const statusAkses = await getStatusAkses();
    isPetugasAtauAdmin = Boolean(statusAkses?.sudahLogin);
  } catch (err) {
    isPetugasAtauAdmin = false;
  }

  let dataBuletin: BuletinItem[] = [];

  try {
    const res = await getBuletin();
    dataBuletin = (res as BuletinItem[]) || [];
  } catch (err) {
    console.error("Gagal mengambil data buletin:", err);
    dataBuletin = [];
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buletin Surveilans</h1>
          <p className="mt-1 text-slate-500">
            Kumpulan laporan mingguan dan bulanan tim kerja, lengkap dengan ringkasan eksekutif.
          </p>
        </div>

        <nav>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#005C2E] px-5 py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#004a25]"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <BuletinInteraktif data={dataBuletin} isPetugasAtauAdmin={isPetugasAtauAdmin} />
    </div>
  );
}