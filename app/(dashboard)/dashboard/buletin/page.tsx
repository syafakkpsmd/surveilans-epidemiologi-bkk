import Link from "next/link";
import { getBuletin } from "@/lib/supabase/queries";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { BuletinSection } from "@/components/dashboard/BuletinSection";

export const dynamic = "force-dynamic";

// 1. Tentukan tipe data BuletinItem agar TypeScript mengerti
type BuletinItem = {
  id: string;
  tahun: number;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
  minggu_ke?: number;
};

export default async function BuletinPage() {
  let isPetugasAtauAdmin = false;
  try {
    const statusAkses = await getStatusAkses();
    isPetugasAtauAdmin = Boolean(statusAkses?.sudahLogin);
  } catch (err) {
    isPetugasAtauAdmin = false;
  }

  // 2. BERIKAN TIPE DATA DI SINI: BuletinItem[]
  let dataBuletin: BuletinItem[] = []; 

  try {
    const res = await getBuletin();
    dataBuletin = res || [];
  } catch (err) {
    console.error("Gagal mengambil data buletin:", err);
    dataBuletin = [];
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buletin Surveilans</h1>
          <p className="mt-1 text-slate-500">
            Kumpulan laporan mingguan dan bulanan tim kerja.
          </p>
        </div>

        <nav>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#005C2E] text-white font-semibold shadow-md hover:bg-[#004a25] transition-all duration-200"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <BuletinSection 
        data={dataBuletin} 
        isPetugasAtauAdmin={isPetugasAtauAdmin} 
      />
    </div>
  );
}