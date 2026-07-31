import Link from "next/link";
import { catatKunjungan } from "@/app/actions/kunjungan";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { DonutRba } from "@/components/cop/DonutRba";
import { PieBreakdown } from "@/components/cop/PieBreakdown";
import { getRingkasanMingguan, getKategoriBreakdown } from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { periodeMingguanSebelumnya } from "@/lib/ai/periode";
import type {
  RingkasanMingguanCop,
  RingkasanMingguanPhqc,
  KategoriBreakdownMingguanCop,
} from "@/types/database.types";

// Palette warna-warni yang konsisten per wilayah
const PALET_WARNA_WILAYAH: Record<string, string> = {
  Samarinda: "bg-[#D97706]",
  TanjungSantan: "bg-amber-500",
  TanjungLaut: "bg-blue-500",
  Lhoktuan: "bg-rose-500",
  Sangatta: "bg-[#6b21a8]",
  Sangkulirang: "bg-emerald-500",
};

const WILAYAH_URUTAN = [
  "Samarinda",
  "TanjungSantan",
  "TanjungLaut",
  "Lhoktuan",
  "Sangatta",
  "Sangkulirang",
];

function cocokWilayah(wilayahDb: string | undefined | null, targetWilayah: string): boolean {
  if (!wilayahDb) return false;

  const bersihDb = wilayahDb.toLowerCase().replace(/\s+/g, "");
  const bersihTarget = targetWilayah.toLowerCase().replace(/\s+/g, "");

  if (bersihDb === bersihTarget) return true;

  if (targetWilayah === "TanjungSantan" && bersihDb.includes("tanjungsantan")) return true;
  if (targetWilayah === "TanjungLaut" && bersihDb.includes("tanjunglaut")) return true;
  if (targetWilayah === "Lhoktuan" && bersihDb.includes("lhoktuan")) return true;
  if (targetWilayah === "Sangatta" && bersihDb.includes("sangatta")) return true;
  if (targetWilayah === "Sangkulirang" && bersihDb.includes("sangkulirang")) return true;
  if (targetWilayah === "Samarinda" && bersihDb.includes("samarinda")) return true;

  return false;
}

export default async function DashboardPage() {
  // Catat kunjungan non-blocking
  catatKunjungan("/dashboard/alat-angkut").catch((err) => {
    console.error("Gagal mencatat kunjungan:", err);
  });

  const { sudahLogin, role } = await getStatusAkses();

  const JUMLAH_MINGGU_MUNDUR = 1;

  const { tahunEpid: tahunBerjalan, mingguEpid: mingguBerjalan } = hitungMingguEpidemiologi(
    new Date()
  );

  let periodeTertunda = { tahun: tahunBerjalan, minggu: mingguBerjalan };
  for (let i = 0; i < JUMLAH_MINGGU_MUNDUR; i++) {
    periodeTertunda = periodeMingguanSebelumnya({
      jenis: "mingguan",
      tahun: periodeTertunda.tahun,
      minggu: periodeTertunda.minggu,
    });
  }

  const tahunEpid = periodeTertunda.tahun;
  const mingguEpid = periodeTertunda.minggu;

  let ringkasanCopTahun: RingkasanMingguanCop[] = [];
  let ringkasanPhqcTahun: RingkasanMingguanPhqc[] = [];
  let kategoriRbaCop: KategoriBreakdownMingguanCop[] = [];
  let kategoriRbaPhqc: KategoriBreakdownMingguanCop[] = [];
  let kategoriDaerahTerjangkit: KategoriBreakdownMingguanCop[] = [];
  let kategoriRatGuardMinggu: KategoriBreakdownMingguanCop[] = [];
  let errorMuat: string | null = null;

  try {
    // Parallel Fetching tanpa duplikasi query
    const hasil = await Promise.all([
      getRingkasanMingguan("cop", tahunEpid),
      getRingkasanMingguan("phqc", tahunEpid),
      // 1. RBA COP (Kedatangan Luar Negeri)
      getKategoriBreakdown("cop", "mingguan", {
        tahun_epid: tahunEpid,
        minggu_epid: mingguEpid,
        kategori: "rba",
      }),
      // 2. RBA PHQC (Keberangkatan Kapal) - DISETIAPKAN KE PHQC
      getKategoriBreakdown("phqc", "mingguan", {
        tahun_epid: tahunEpid,
        minggu_epid: mingguEpid,
        kategori: "rba",
      }),
      getKategoriBreakdown("cop", "mingguan", {
        tahun_epid: tahunEpid,
        minggu_epid: mingguEpid,
        kategori: "daerah_terjangkit",
      }),
      (getKategoriBreakdown as any)("cop", "mingguan", {
        tahun_epid: tahunEpid,
        minggu_epid: mingguEpid,
        kategori: "rat_guard",
      }),
    ]);

    ringkasanCopTahun = hasil[0] as RingkasanMingguanCop[];
    ringkasanPhqcTahun = hasil[1] as RingkasanMingguanPhqc[];
    kategoriRbaCop = hasil[2] as KategoriBreakdownMingguanCop[];
    kategoriRbaPhqc = hasil[3] as KategoriBreakdownMingguanCop[];
    kategoriDaerahTerjangkit = hasil[4] as KategoriBreakdownMingguanCop[];
    kategoriRatGuardMinggu = (hasil[5] ?? []) as KategoriBreakdownMingguanCop[];
  } catch (err) {
    errorMuat = err instanceof Error ? err.message : "Gagal mengambil data dashboard.";
  }

  const ringkasanCopMinggu = ringkasanCopTahun.filter((r) => r.minggu_epid === mingguEpid);
  const ringkasanPhqcMinggu = ringkasanPhqcTahun.filter((r) => r.minggu_epid === mingguEpid);

  function jumlahkanPerNilai(
    rows: KategoriBreakdownMingguanCop[]
  ): { nilai: string; jumlah: number }[] {
    if (!rows || !Array.isArray(rows)) return [];
    const peta = new Map<string, number>();
    rows.forEach((r) => peta.set(r.nilai, (peta.get(r.nilai) ?? 0) + r.jumlah));
    return Array.from(peta.entries())
      .map(([nilai, jumlah]) => ({ nilai, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }

  const kategoriRbaCopTerjumlah = jumlahkanPerNilai(kategoriRbaCop);
  const kategoriRbaPhqcTerjumlah = jumlahkanPerNilai(kategoriRbaPhqc);
  const kategoriDaerahTerjangkitTerjumlah = jumlahkanPerNilai(kategoriDaerahTerjangkit);
  const kategoriRatGuardMingguTerjumlah = jumlahkanPerNilai(kategoriRatGuardMinggu);

  // === KALKULASI RINGKASAN KPI ===
  const totalKapalCop = ringkasanCopMinggu.reduce((a, r) => a + r.jumlah_kapal, 0);
  const totalKapalPhqc = ringkasanPhqcMinggu.reduce((a, r) => a + r.jumlah_kapal, 0);
  const totalAbk =
    ringkasanCopMinggu.reduce((a, r) => a + r.total_abk, 0) +
    ringkasanPhqcMinggu.reduce((a, r) => a + r.total_abk, 0);

  const totalPenumpang = ringkasanPhqcMinggu.reduce(
    (a, r) => a + (r.total_penumpang ?? (r as any).jumlah_penumpang ?? 0),
    0
  );

  const adaData = totalKapalCop > 0 || totalKapalPhqc > 0;

  // === DATA GRAFIK PER WILAYAH (WARNA-WARNI) ===
  const wilayahBarCop = WILAYAH_URUTAN.map((w) => {
    const ditemuka = ringkasanCopMinggu.filter((r) => cocokWilayah(r.wilayah_kerja, w));
    const totalJml = ditemuka.reduce((acc, curr) => acc + curr.jumlah_kapal, 0);
    return { wilayah: w, jumlah: totalJml, warna: PALET_WARNA_WILAYAH[w] || "bg-teal-500" };
  }).sort((a, b) => b.jumlah - a.jumlah);

  const maxWilayahCop = Math.max(1, ...wilayahBarCop.map((w) => w.jumlah));

  const wilayahBarPhqc = WILAYAH_URUTAN.map((w) => {
    const ditemuka = ringkasanPhqcMinggu.filter((r) => cocokWilayah(r.wilayah_kerja, w));
    const totalJml = ditemuka.reduce((acc, curr) => acc + curr.jumlah_kapal, 0);
    return { wilayah: w, jumlah: totalJml, warna: PALET_WARNA_WILAYAH[w] || "bg-teal-500" };
  }).sort((a, b) => b.jumlah - a.jumlah);

  const maxWilayahPhqc = Math.max(1, ...wilayahBarPhqc.map((w) => w.jumlah));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* HEADER PAGE */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2A38]">
            Alat Angkut Kapal (Kedatangan Luar Negeri &amp; Keberangkatan)
          </h1>
          <p className="text-sm text-gray-500">
            Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}
          </p>
        </div>
      </div>

      {/* NAVIGASI TOMBOL DASHBOARD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cop"
            prefetch={false}
            className="rounded-lg bg-[#0F2A38] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Dashboard Kapal dari Luar Negeri
          </Link>
          <Link
            href="/phqc"
            prefetch={false}
            className="rounded-lg bg-[#0F2A38] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Dashboard Keberangkatan Kapal
          </Link>
          <Link
            href="/dashboard/alat-angkut/rat-guard"
            prefetch={false}
            className="rounded-lg bg-[#0F2A38] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Dashboard Rat Guard
          </Link>
        </div>
      </div>

      {/* ERROR HANDLING */}
      {errorMuat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          Gagal memuat data: {errorMuat}
        </div>
      )}

      {/* STATE JIKA DATA KOSONG */}
      {!errorMuat && !adaData && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 text-center">
          Belum ada kegiatan tercatat untuk Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}.
        </div>
      )}

      {/* TAMPILAN DASHBOARD UTAMA */}
      {!errorMuat && adaData && (
        <>
          {/* SECTION KPI: 4 KARTU RINGKASAN */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KartuKpi label="Kapal Dari Luar Negeri" nilai={totalKapalCop} />
            <KartuKpi label="Keberangkatan Kapal" nilai={totalKapalPhqc} />
            <KartuKpi label="Total ABK" nilai={totalAbk} />
            <KartuKpi label="Jumlah Penumpang" nilai={totalPenumpang} />
          </div>

          {/* SECTION GRAFIK RBA (COP vs PHQC) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                Risk Based Assessment (RBA) Kedatangan Kapal Luar Negeri
                <br />
                Minggu Epidemiologi ke-{mingguEpid}
              </h2>
              <DonutRba data={kategoriRbaCopTerjumlah} />
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                Risk Based Assessment (RBA) Keberangkatan Kapal
                <br />
                Minggu Epidemiologi ke-{mingguEpid}
              </h2>
              <DonutRba data={kategoriRbaPhqcTerjumlah} />
            </div>
          </div>

          {/* SECTION BAR PER WILAYAH KERJA (WARNA WARNI) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* KEDATANGAN LUAR NEGERI */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Pengawasan Kedatangan Kapal dari Luar Negeri
              </h2>
              <div className="space-y-3">
                {wilayahBarCop.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm font-medium">
                      <span className="text-gray-700">{w.wilayah}</span>
                      <span className="font-semibold text-gray-900">
                        {w.jumlah.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${w.warna}`}
                        style={{ width: `${(w.jumlah / maxWilayahCop) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KEBERANGKATAN KAPAL */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Pengawasan Keberangkatan Kapal
              </h2>
              <div className="space-y-3">
                {wilayahBarPhqc.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm font-medium">
                      <span className="text-gray-700">{w.wilayah}</span>
                      <span className="font-semibold text-gray-900">
                        {w.jumlah.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${w.warna}`}
                        style={{ width: `${(w.jumlah / maxWilayahPhqc) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION STATUS NEGARA & RAT GUARD MINGGU INI */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                Proporsi Kedatangan Kapal dari Luar Negeri <br /> Minggu Epidemiologi ke-{mingguEpid}
              </h2>
              <PieBreakdown data={kategoriDaerahTerjangkitTerjumlah} skema="terjangkit" />
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                Pengawasan Rat Guard <br /> Minggu Epidemiologi ke-{mingguEpid}
              </h2>
              <DonutRba data={kategoriRatGuardMingguTerjumlah} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

{/* KOMPONEN KARTU KPI TERUNIFIKASI */}
function KartuKpi({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm border border-gray-100">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {nilai.toLocaleString("id-ID")}
      </p>
    </div>
  );
}