import Link from "next/link";
import { catatKunjungan } from "@/app/actions/kunjungan";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { TombolAnalisisAI } from "@/components/TombolAnalisisAI";
import { DonutRba } from "@/components/cop/DonutRba";
import { PieBreakdown } from "@/components/cop/PieBreakdown";
import { getRingkasanMingguan, getKategoriBreakdown } from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
// ============================================================
// TANDA #1 -- import baru, dipakai untuk mundur beberapa minggu
// ============================================================
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

export default async function DashboardPage() {
  await catatKunjungan("/dashboard/alat-angkut");
  const { sudahLogin, role } = await getStatusAkses();

  // ============================================================
  // TANDA #2 -- BAGIAN YANG DIUBAH
  // Sebelumnya: const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());
  // Sekarang: hitung minggu BERJALAN dulu, lalu mundurkan sejumlah
  // JUMLAH_MINGGU_MUNDUR minggu (data lapangan biasanya baru masuk
  // belakangan, sama seperti pola di modul Vektor Aedes).
  //
  // MAU TAMBAH/KURANGI JARAK MUNDUR? Ubah angka di baris ini saja:
  const JUMLAH_MINGGU_MUNDUR = 2; // <-- UBAH ANGKA INI (0 = minggu berjalan, tanpa mundur)

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
  // ============================================================
  // AKHIR TANDA #2 -- semua kode di bawah ini TIDAK PERLU DIUBAH,
  // karena semuanya sudah otomatis memakai tahunEpid/mingguEpid
  // yang sudah dimundurkan di atas.
  // ============================================================

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
        // TANDA #3 -- query baru untuk donut RBA TOTAL (tanpa filter
        // minggu_epid = otomatis dapat gabungan semua minggu di tahun
        // berjalan, bukan cuma 1 minggu).
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
  // MEMISAHKAN & MENGURUTKAN VARIABEL WILAYAH (TERTINGGI KE TERENDAH)
  // ============================================================
  const wilayahBarCop = WILAYAH_URUTAN.map((w) => ({
    wilayah: w,
    jumlah: ringkasanCopMinggu.find((r) => r.wilayah_kerja === w)?.jumlah_kapal ?? 0,
  })).sort((a, b) => b.jumlah - a.jumlah); // <-- Tambahan pengurutan di sini
  
  const maxWilayahCop = Math.max(1, ...wilayahBarCop.map((w) => w.jumlah));

  const wilayahBarPhqc = WILAYAH_URUTAN.map((w) => ({
    wilayah: w,
    jumlah: ringkasanPhqcMinggu.find((r) => r.wilayah_kerja === w)?.jumlah_kapal ?? 0,
  })).sort((a, b) => b.jumlah - a.jumlah); // <-- Tambahan pengurutan di sini
  
  const maxWilayahPhqc = Math.max(1, ...wilayahBarPhqc.map((w) => w.jumlah));
  // ============================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* Judul utama dengan warna hijau */}
          <h1 className="text-2xl font-bold text-green-600">Alat Angkut Kapal (COP &amp; PHQC)</h1>
          <p className="text-sm text-muted">
            Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}
          </p>
        </div>
      </div>

      {/* Menjajajarkan tombol Navigasi di sebelah kiri dan Tombol Analisis AI di sebelah kanan */}
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
        </div>
        
        {/* Tombol Analisis AI dipindahkan ke sini agar sejajar di kanan */}
        <TombolAnalisisAI
          sudahLogin={sudahLogin}
          role={role}
          konteks="alat-angkut-ringkasan"
          periodeKey={periodeKey}
        />
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

          {/* TANDA #4 -- sekarang 2 kolom: kiri minggu berjalan, kanan total tahun */}
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

           {/* TANDA #6 -- Per Wilayah Kerja dipecah jadi 2 kolom terpisah:
               COP kiri, PHQC kanan (sebelumnya digabung jadi 1 angka). */}
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