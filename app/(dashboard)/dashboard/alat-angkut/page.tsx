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

const WILAYAH_URUTAN = [
  "Samarinda",
  "TanjungSantan",
  "TanjungLaut",
  "Lhoktuan",
  "Sangatta",
  "Sangkulirang",
];

/**
 * Mapping pencocokan fleksibel agar string wilayah di database
 * (misal: "Pelabuhan Laut Tanjung Santan") cocok dengan key WILAYAH_URUTAN ("TanjungSantan")
 */
function cocokWilayah(wilayahDb: string | undefined | null, targetWilayah: string): boolean {
  if (!wilayahDb) return false;
  
  // Bersihkan spasi dan ubah ke huruf kecil
  const bersihDb = wilayahDb.toLowerCase().replace(/\s+/g, "");
  const bersihTarget = targetWilayah.toLowerCase().replace(/\s+/g, "");

  // Jika cocok langsung
  if (bersihDb === bersihTarget) return true;

  // Cek kata kunci spesifik
  if (targetWilayah === "TanjungSantan" && bersihDb.includes("tanjungsantan")) return true;
  if (targetWilayah === "TanjungLaut" && bersihDb.includes("tanjunglaut")) return true;
  if (targetWilayah === "Lhoktuan" && (bersihDb.includes("lhoktuan") || bersihDb.includes("lhoktuan"))) return true;
  if (targetWilayah === "Sangatta" && bersihDb.includes("sangatta")) return true;
  if (targetWilayah === "Sangkulirang" && bersihDb.includes("sangkulirang")) return true;
  if (targetWilayah === "Samarinda" && bersihDb.includes("samarinda")) return true;

  return false;
}

export default async function DashboardPage() {
  await catatKunjungan("/dashboard/alat-angkut");
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

  const periodeKey = `${tahunEpid}-W${mingguEpid}`;

  let ringkasanCopTahun: RingkasanMingguanCop[] = [];
  let ringkasanPhqcTahun: RingkasanMingguanPhqc[] = [];
  let kategoriRba: KategoriBreakdownMingguanCop[] = [];
  let kategoriRbaTotalTahun: KategoriBreakdownMingguanCop[] = [];
  let kategoriDaerahTerjangkit: KategoriBreakdownMingguanCop[] = [];
  let errorMuat: string | null = null;

  try {
    [ringkasanCopTahun, ringkasanPhqcTahun, kategoriRba, kategoriRbaTotalTahun, kategoriDaerahTerjangkit] =
      await Promise.all([
        getRingkasanMingguan("cop", tahunEpid),
        getRingkasanMingguan("phqc", tahunEpid),
        getKategoriBreakdown("cop", "mingguan", {
          tahun_epid: tahunEpid,
          minggu_epid: mingguEpid,
          kategori: "rba",
        }),
        getKategoriBreakdown("cop", "mingguan", {
          tahun_epid: tahunEpid,
          kategori: "rba",
        }),
        getKategoriBreakdown("cop", "mingguan", {
          tahun_epid: tahunEpid,
          minggu_epid: mingguEpid,
          kategori: "daerah_terjangkit",
        }),
      ]);
  } catch (err) {
    errorMuat = err instanceof Error ? err.message : "Gagal mengambil data dashboard.";
  }

  const ringkasanCopMinggu = ringkasanCopTahun.filter((r) => r.minggu_epid === mingguEpid);
  const ringkasanPhqcMinggu = ringkasanPhqcTahun.filter((r) => r.minggu_epid === mingguEpid);

  function jumlahkanPerNilai(
    rows: KategoriBreakdownMingguanCop[]
  ): { nilai: string; jumlah: number }[] {
    const peta = new Map<string, number>();
    rows.forEach((r) => peta.set(r.nilai, (peta.get(r.nilai) ?? 0) + r.jumlah));
    return Array.from(peta.entries())
      .map(([nilai, jumlah]) => ({ nilai, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }

  const kategoriRbaTerjumlah = jumlahkanPerNilai(kategoriRba);
  const kategoriRbaTotalTahunTerjumlah = jumlahkanPerNilai(kategoriRbaTotalTahun);
  const kategoriDaerahTerjangkitTerjumlah = jumlahkanPerNilai(kategoriDaerahTerjangkit);

  const totalKapalCop = ringkasanCopMinggu.reduce((a, r) => a + r.jumlah_kapal, 0);
  const totalKapalPhqc = ringkasanPhqcMinggu.reduce((a, r) => a + r.jumlah_kapal, 0);
  const totalAbk =
    ringkasanCopMinggu.reduce((a, r) => a + r.total_abk, 0) +
    ringkasanPhqcMinggu.reduce((a, r) => a + r.total_abk, 0);

  const adaData = totalKapalCop > 0 || totalKapalPhqc > 0;

  // ============================================================
  // PENGGUNAAN HELPER `cocokWilayah` AGAR TIDAK KOSONG WALAUPUN
  // NAMA WILAYAH DI DATABASE BERBEDA FORMAT
  // ============================================================
  const wilayahBarCop = WILAYAH_URUTAN.map((w) => {
    const ditemuka = ringkasanCopMinggu.filter((r) => cocokWilayah(r.wilayah_kerja, w));
    const totalJml = ditemuka.reduce((acc, curr) => acc + curr.jumlah_kapal, 0);
    return { wilayah: w, jumlah: totalJml };
  }).sort((a, b) => b.jumlah - a.jumlah);

  const maxWilayahCop = Math.max(1, ...wilayahBarCop.map((w) => w.jumlah));

  const wilayahBarPhqc = WILAYAH_URUTAN.map((w) => {
    const ditemuka = ringkasanPhqcMinggu.filter((r) => cocokWilayah(r.wilayah_kerja, w));
    const totalJml = ditemuka.reduce((acc, curr) => acc + curr.jumlah_kapal, 0);
    return { wilayah: w, jumlah: totalJml };
  }).sort((a, b) => b.jumlah - a.jumlah);

  const maxWilayahPhqc = Math.max(1, ...wilayahBarPhqc.map((w) => w.jumlah));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-600">Alat Angkut Kapal (COP &amp; PHQC)</h1>
          <p className="text-sm text-muted">
            Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cop"
            className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
          >
            Lihat Dashboard COP Lengkap
          </Link>
          <Link
            href="/phqc"
            className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
          >
            Lihat Dashboard PHQC Lengkap
          </Link>
          <Link
            href="/dashboard/alat-angkut/sscec"
            className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
          >
            Lihat Dashboard SSCEC Lengkap
          </Link>
          <Link
            href="/dashboard/alat-angkut/ratguard"
            className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
          >
            Lihat Dashboard Rat Guard Lengkap
          </Link>
        </div>
      </div>

      {errorMuat && (
        <div className="rounded-card border border-risiko-merah/30 bg-surface p-6 text-sm text-risiko-merah">
          Gagal memuat data: {errorMuat}
        </div>
      )}

      {!errorMuat && !adaData && (
        <div className="rounded-card border border-dashed border-border bg-surface p-6 text-sm text-muted">
          Belum ada kegiatan tercatat untuk Minggu Epidemiologi ke-{mingguEpid} Tahun{" "}
          {tahunEpid}.
        </div>
      )}

      {!errorMuat && adaData && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <KartuKpi label="Kapal COP" nilai={totalKapalCop} />
            <KartuKpi label="Kapal PHQC" nilai={totalKapalPhqc} />
            <KartuKpi label="Total ABK" nilai={totalAbk} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                RBA — Minggu Epidemiologi ke-{mingguEpid}
              </h2>
              <DonutRba data={kategoriRbaTerjumlah} />
            </div>

            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                RBA — Total Tahun {tahunEpid}
              </h2>
              <DonutRba data={kategoriRbaTotalTahunTerjumlah} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Per Wilayah Kerja — COP
              </h2>
              <div className="space-y-3">
                {wilayahBarCop.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{w.wilayah}</span>
                      <span className="font-semibold text-ink">{w.jumlah}</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg">
                      <div
                        className="h-2 rounded-full bg-teal"
                        style={{ width: `${(w.jumlah / maxWilayahCop) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Per Wilayah Kerja — PHQC
              </h2>
              <div className="space-y-3">
                {wilayahBarPhqc.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{w.wilayah}</span>
                      <span className="font-semibold text-ink">{w.jumlah}</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg">
                      <div
                        className="h-2 rounded-full bg-teal"
                        style={{ width: `${(w.jumlah / maxWilayahPhqc) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-card bg-surface p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
              Daerah Terjangkit Minggu Ini (COP)
            </h2>
            <p className="mb-4 text-xs text-muted">
              Hijau = kapal dari daerah sehat (tidak terjangkit) • Merah = kapal dari daerah terjangkit wabah
            </p>
            <PieBreakdown data={kategoriDaerahTerjangkitTerjumlah} skema="terjangkit" />
          </div>
        </>
      )}
    </div>
  );
}

function KartuKpi({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{nilai}</p>
    </div>
  );
}