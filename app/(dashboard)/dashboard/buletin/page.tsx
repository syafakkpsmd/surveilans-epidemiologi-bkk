import Link from "next/link";
import { getBuletin } from "@/lib/supabase/queries";
import { getStatusAkses } from "@/lib/auth/getStatusAkses"; // ⚠️ sesuaikan kalau nama file aslinya beda
import { BuletinSection } from "@/components/dashboard/BuletinSection";

export default async function BuletinPage() {
  const [dataBuletin, statusAkses] = await Promise.all([
    getBuletin(),
    getStatusAkses(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Container utama yang menyatukan Judul dan Navigasi */}
      <header className="flex items-center justify-between border-b pb-6 mb-8">
        
        {/* KIRI: Judul */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buletin Surveilans</h1>
          <p className="text-slate-500">Kumpulan laporan mingguan dan bulanan tim kerja.</p>
        </div>

        {/* KANAN: Tombol Navigasi (Sejajar dengan Judul) */}
        <nav>
            <Link 
                href="/dashboard" 
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#005C2E] text-white font-semibold shadow-md hover:bg-[#004a25] transition-all duration-200"
            >
                Dashboard
            </Link>
        </nav>
      </header>

      <BuletinSection data={dataBuletin} isPetugasAtauAdmin={statusAkses.sudahLogin} />
    </div>
  );
}