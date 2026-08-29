// ================================================================
// app/(dashboard)/dashboard/master-tabel/page.tsx
//
// Hub "Master Tabel": rekap gabungan Sanitasi (TTU/PAB/TPP/Rat Guard)
// & Vektor (Tikus-Pes/DBD Perimeter-Buffer/Larvasida/Pengasapan/
// Diare Lalat-Kecoa) per wilayah kerja x bulan, dalam satu halaman.
//
// Semua fetch dijalankan paralel & masing-masing dibungkus fallback
// array kosong -- supaya satu dataset yang gagal/kosong tidak
// menjatuhkan seluruh halaman.
// ================================================================

import {
  getRingkasanTtuBulanan,
  getRingkasanPabBulanan,
  getRingkasanTppBulanan,
  getRingkasanRatGuardBulanan,
  getRingkasanVektorTikusBulanan,
  getWilkerRef,
} from "@/lib/supabase/queries";
import {
  getMasterVektorDbdAktivitasBulanan,
  getMasterVektorDiareBulananPerWilker,
} from "@/lib/supabase/queriesMasterTabel";
import MasterTabelClient from "@/components/master-tabel/MasterTabelClient";

type PageProps = {
  searchParams: Promise<{ tahun?: string | string[] }>;
};

export default async function MasterTabelPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const tahunParam = Array.isArray(resolved.tahun) ? resolved.tahun[0] : resolved.tahun;
  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const aman = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch((err) => {
    console.error("Master Tabel — gagal ambil salah satu dataset:", err);
    return [] as T[];
  });

  const [
    daftarWilker,
    ttu,
    pab,
    tpp,
    ratGuard,
    tikus,
    dbdAktivitas,
    diareLalat,
    diareKecoa,
  ] = await Promise.all([
    getWilkerRef().catch(() => []),
    aman(getRingkasanTtuBulanan(tahun)),
    aman(getRingkasanPabBulanan(tahun)),
    aman(getRingkasanTppBulanan(tahun)),
    aman(getRingkasanRatGuardBulanan(tahun)),
    aman(getRingkasanVektorTikusBulanan(tahun)),
    aman(getMasterVektorDbdAktivitasBulanan(tahun)),
    aman(getMasterVektorDiareBulananPerWilker(tahun, "lalat")),
    aman(getMasterVektorDiareBulananPerWilker(tahun, "kecoa")),
  ]);

  return (
    <div className="mx-auto max-w-350 space-y-5 px-4 py-6 md:px-6 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-navy">Master Tabel — Sanitasi &amp; Vektor</h1>
        <p className="text-sm text-muted">
          Rekap bulanan seluruh kegiatan sanitasi dan pengendalian vektor per wilayah kerja dalam satu tampilan.
        </p>
      </div>

      <MasterTabelClient
        tahun={tahun}
        daftarWilker={(daftarWilker ?? []).map((w: any) => ({
          kode: w.kode ?? w.kode_wilker ?? "",
          nama: w.nama ?? w.nama_wilker ?? w.kode ?? "",
        }))}
        ttu={ttu}
        pab={pab}
        tpp={tpp}
        ratGuard={ratGuard}
        tikus={tikus}
        dbdAktivitas={dbdAktivitas}
        diareLalat={diareLalat}
        diareKecoa={diareKecoa}
      />
    </div>
  );
}
