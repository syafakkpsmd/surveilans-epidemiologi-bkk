import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FilterPeriodeWilayah } from "@/components/FilterPeriodeWilayah";
import { TrenChart } from "@/components/TrenChart";
import { BreakdownCard } from "@/components/BreakdownCard";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getKategoriBreakdown,
  getKegiatanPhqcEnriched,
} from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import type { Wilayah, KategoriPhqc, KegiatanPhqcEnriched } from "@/types/database.types";
import { DonutBreakdown } from "@/components/phqc/DonutBreakdown";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";

// ============================================================
// 1. KONSTANTA & HELPER MODULE-LEVEL
// ============================================================

function normalisasiNilaiKategori(nilai: string): string {
  const d = nilai.trim();
  if (!d) return d;
  return d.toLowerCase().split(" ").map((k) => (k ? k[0].toUpperCase() + k.slice(1) : k)).join(" ");
}

const WARNA_RBA: Record<string, string> = {
  Hijau: "var(--color-risiko-hijau)",
  Kuning: "var(--color-risiko-kuning)",
  Merah: "var(--color-risiko-merah)",
};

const PALET_PELABUHAN = [
  "#0F4C5C", "#2F9E44", "#F0A202", "#D62839",
  "#7C3AED", "#EA580C", "#5B7083", "#0891B2",
];

const KATEGORI_LIST: { key: KategoriPhqc; label: string }[] = [
  { key: "bendera", label: "Bendera Kapal" },
  { key: "rba", label: "RBA (Risk Based Assessment)" },
  { key: "tujuan_berlayar", label: "Tujuan Berlayar" },
  { key: "pelabuhan_kedatangan", label: "Pelabuhan Kedatangan" },
  { key: "pelabuhan_tujuan", label: "Pelabuhan Tujuan" },
];

const DAFTAR_WILAYAH: Wilayah[] = [
  "Samarinda",
  "TanjungSantan",
  "TanjungLaut",
  "Lhoktuan",
  "Sangatta",
  "Sangkulirang",
];

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function validasiWilayah(nilai: string | undefined): Wilayah | "Semua" {
  if (nilai && (DAFTAR_WILAYAH as string[]).includes(nilai)) return nilai as Wilayah;
  return "Semua";
}

/**
 * Helper untuk melakukan pivot data tren berdasarkan Minggu atau Bulan secara dinamis
 */
function pivotKategoriDinamis(
  rows: { minggu_epid?: number; bulan?: number; nilai: string; jumlah: number }[],
  mode: "mingguan" | "bulanan",
  normalisasi: (nilai: string) => string = normalisasiNilaiKategori
) {
  const peta = new Map<number, Record<string, string | number>>();
  const totalPerNilai = new Map<string, number>();

  rows.forEach((r) => {
    const nilai = normalisasi(r.nilai);
    if (!nilai) return;

    const urutan = mode === "mingguan" ? (r.minggu_epid ?? 0) : (r.bulan ?? 0);
    const label = mode === "mingguan" ? `Mg ${urutan}` : (NAMA_BULAN[urutan - 1] ?? `Bln ${urutan}`);

    const existing = peta.get(urutan) ?? { label, urutan };
    existing[nilai] = ((existing[nilai] as number) ?? 0) + r.jumlah;
    peta.set(urutan, existing);
    
    totalPerNilai.set(nilai, (totalPerNilai.get(nilai) ?? 0) + r.jumlah);
  });

  return {
    data: Array.from(peta.values()).sort((a, b) => (a.urutan as number) - (b.urutan as number)),
    totals: Array.from(totalPerNilai.entries()).sort((a, b) => b[1] - a[1]),
  };
}

interface TitikTrenPhqc {
  label: string;
  urutan: number;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
  total_penumpang: number;
  total_penumpang_wna: number;
  total_penumpang_wni: number;
  [key: string]: string | number;
}

// ============================================================
// 2. KOMPONEN HALAMAN UTAMA
// ============================================================

export default async function PhqcPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; wilayah?: string }>;
}) {
  const sp = await searchParams;
  const mode: "mingguan" | "bulanan" = sp.mode === "bulanan" ? "bulanan" : "mingguan";
  const wilayah = validasiWilayah(sp.wilayah);

  const { sudahLogin, role } = await getStatusAkses();

 // Logika Waktu Sistem & Proteksi Mundur 1 Periode (Minggu) & Bulan Normal
  // Logika Waktu Sistem
  const sekarang = new Date();
  const { tahunEpid: tahunEpidSaatIni, mingguEpid: mingguEpidSaatIni } = hitungMingguEpidemiologi(sekarang);

  // 1. Perhitungan mundur 1 minggu (Mode Mingguan)
  const mingguEpidTampilan = mingguEpidSaatIni - 1 > 0 ? mingguEpidSaatIni - 1 : 1;

  // 2. Bulan dibuat normal (Gunakan LET, bukan CONST, agar bisa diubah di blok IF)
  let bulanTampilan = sekarang.getMonth() + 1; 
  let tahunTampilanBulanan = sekarang.getFullYear();

  // Logika penyesuaian jika ada kompensasi batas bulan/tahun
  if (bulanTampilan <= 0) {
    bulanTampilan = 12 + bulanTampilan; 
    tahunTampilanBulanan = tahunTampilanBulanan - 1; 
  }

  // Tentukan parameter tahun dan periodeKey sesuai mode aktif
  const tahun = mode === "mingguan" ? tahunEpidSaatIni : tahunTampilanBulanan;
  const periodeKey =
    mode === "mingguan"
      ? `${tahunEpidSaatIni}-W${mingguEpidTampilan}`
      : `${tahunTampilanBulanan}-${bulanTampilan}`;

  let errorMuat: string | null = null;
  let trenData: TitikTrenPhqc[] = [];
  const kategoriData: Record<KategoriPhqc, { nilai: string; jumlah: number }[]> = {
    bendera: [],
    rba: [],
    tujuan_berlayar: [],
    pelabuhan_kedatangan: [],
    pelabuhan_tujuan: [],
  };
  let dataMentah: KegiatanPhqcEnriched[] = [];

  let totalKapal = 0;
  let totalAbkKpi = 0;
  let totalPenumpangKpi = 0;

  let donutBenderaAsalNegara: { nilai: string; jumlah: number }[] = [];
  let benderaLuarNegeri: { nilai: string; jumlah: number }[] = [];
  let kategoriRbaPeriodeIni: { nilai: string; jumlah: number }[] = [];
  let trenRbaPeriodik: Array<Record<string, string | number>> = [];
  let seriesRba: SeriesChecklist[] = [];
  let trenPelabuhanPeriodik: Array<Record<string, string | number>> = [];
  let seriesPelabuhan: SeriesChecklist[] = [];
  let donutAbkPenumpang: { nilai: string; jumlah: number }[] = [];

  try {
    // 1. Jalankan pengambilan data tren (Ringkasan Mingguan / Bulanan)
    if (mode === "mingguan") {
      const ringkasan = await getRingkasanMingguan("phqc", tahun);
      const terfilter = wilayah === "Semua" ? ringkasan : ringkasan.filter((r) => r.wilayah_kerja === wilayah);

      const peta = new Map<number, TitikTrenPhqc>();
      terfilter.forEach((r) => {
        const existing = peta.get(r.minggu_epid) ?? {
          label: `Mg ${r.minggu_epid}`,
          urutan: r.minggu_epid,
          jumlah_kapal: 0,
          total_abk: 0,
          total_abk_wna: 0,
          total_abk_wni: 0,
          total_penumpang: 0,
          total_penumpang_wna: 0,
          total_penumpang_wni: 0, 
        };
        existing.jumlah_kapal += r.jumlah_kapal;
        existing.total_abk += r.total_abk;
        existing.total_abk_wna += r.total_abk_wna;
        existing.total_abk_wni += r.total_abk_wni;
        existing.total_penumpang += r.total_penumpang;
        existing.total_penumpang_wna += r.total_penumpang_wna;
        existing.total_penumpang_wni += r.total_penumpang_wni;
        peta.set(r.minggu_epid, existing);
      });
      trenData = Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
    } else {
      const ringkasan = await getRingkasanBulanan("phqc", tahun);
      const terfilter = wilayah === "Semua" ? ringkasan : ringkasan.filter((r) => r.wilayah_kerja === wilayah);

      const peta = new Map<number, TitikTrenPhqc>();
      terfilter.forEach((r) => {
        const existing = peta.get(r.bulan) ?? {
          label: NAMA_BULAN[r.bulan - 1],
          urutan: r.bulan,
          jumlah_kapal: 0,
          total_abk: 0,
          total_abk_wna: 0,
          total_abk_wni: 0,
          total_penumpang: 0,
          total_penumpang_wna: 0,
          total_penumpang_wni: 0,
        };
        existing.jumlah_kapal += r.jumlah_kapal;
        existing.total_abk += r.total_abk;
        existing.total_abk_wna += r.total_abk_wna;
        existing.total_abk_wni += r.total_abk_wni;
        existing.total_penumpang += r.total_penumpang;
        existing.total_penumpang_wna += r.total_penumpang_wna;
        existing.total_penumpang_wni += r.total_penumpang_wni;
        peta.set(r.bulan, existing);
      });
      trenData = Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
    }

    // Perhitungan Total KPI Utama (Aktif baik di Mingguan maupun Bulanan)
    totalKapal = trenData.reduce((a, r) => a + r.jumlah_kapal, 0);
    totalAbkKpi = trenData.reduce((a, r) => a + r.total_abk, 0);
    totalPenumpangKpi = trenData.reduce((a, r) => a + r.total_penumpang, 0);

    // 2. Ambil Data Breakdown untuk Kategori Utama -- dijalankan PARALEL
    // (Promise.all), bukan satu-satu berurutan seperti sebelumnya.
    const hasilSemuaKategori = await Promise.all(
      KATEGORI_LIST.map((k) =>
        mode === "mingguan"
          ? getKategoriBreakdown("phqc", "mingguan", {
              tahun_epid: tahun,
              wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
              kategori: k.key,
            })
          : getKategoriBreakdown("phqc", "bulanan", {
              tahun,
              wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
              kategori: k.key,
            })
      )
    );

    KATEGORI_LIST.forEach((k, idx) => {
      const rows = hasilSemuaKategori[idx];
      const peta = new Map<string, number>();
      rows.forEach((r) => {
        const nilaiNormal = normalisasiNilaiKategori(r.nilai);
        peta.set(nilaiNormal, (peta.get(nilaiNormal) ?? 0) + r.jumlah);
      });
      kategoriData[k.key] = Array.from(peta.entries())
        .map(([nilai, jumlah]) => ({ nilai, jumlah }))
        .sort((a, b) => b.jumlah - a.jumlah);
    });

    // 3. Pemrosesan Data Grafik Bagian Bawah Kompatibel (Mingguan & Bulanan)
    const benderaIndonesia = kategoriData.bendera.filter((b) => b.nilai.toLowerCase() === "indonesia");
    benderaLuarNegeri = kategoriData.bendera.filter((b) => b.nilai.toLowerCase() !== "indonesia");
    donutBenderaAsalNegara = [
      { nilai: "Indonesia", jumlah: benderaIndonesia.reduce((a, b) => a + b.jumlah, 0) },
      { nilai: "Luar Negeri", jumlah: benderaLuarNegeri.reduce((a, b) => a + b.jumlah, 0) },
    ];

    // Ambil Data RBA Spesifik Periode Tampilan + Tren RBA Sepanjang Tahun
    // secara PARALEL (dua query ini independen satu sama lain).
    const [rowsPeriodeIni, rowsRbaTahunan] = await Promise.all([
      mode === "mingguan"
        ? getKategoriBreakdown("phqc", "mingguan", {
            tahun_epid: tahun,
            minggu_epid: mingguEpidTampilan,
            wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
            kategori: "rba",
          })
        : getKategoriBreakdown("phqc", "bulanan", {
            tahun,
            bulan: bulanTampilan,
            wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
            kategori: "rba",
          }),
      mode === "mingguan"
        ? getKategoriBreakdown("phqc", "mingguan", {
            tahun_epid: tahun,
            wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
            kategori: "rba",
          })
        : getKategoriBreakdown("phqc", "bulanan", {
            tahun,
            wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
            kategori: "rba",
          }),
    ]);

    const petaPeriodeIni = new Map<string, number>();
    rowsPeriodeIni.forEach((r) => petaPeriodeIni.set(r.nilai, (petaPeriodeIni.get(r.nilai) ?? 0) + r.jumlah));
    kategoriRbaPeriodeIni = Array.from(petaPeriodeIni.entries())
      .map(([nilai, jumlah]) => ({ nilai, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    const pivotRba = pivotKategoriDinamis(rowsRbaTahunan, mode, (n) => n);
    trenRbaPeriodik = pivotRba.data;
    seriesRba = pivotRba.totals.map(([nilai]) => ({
      key: nilai,
      label: nilai,
      warna: WARNA_RBA[nilai] ?? "var(--color-teal)",
    }));

    // Pembuatan Garis Tren Gabungan Pelabuhan Sepanjang Tahun
    const [rowsKedatangan, rowsTujuan] = mode === "mingguan"
      ? await Promise.all([
          getKategoriBreakdown("phqc", "mingguan", { tahun_epid: tahun, wilayah_kerja: wilayah === "Semua" ? undefined : wilayah, kategori: "pelabuhan_kedatangan" }),
          getKategoriBreakdown("phqc", "mingguan", { tahun_epid: tahun, wilayah_kerja: wilayah === "Semua" ? undefined : wilayah, kategori: "pelabuhan_tujuan" }),
        ])
      : await Promise.all([
          getKategoriBreakdown("phqc", "bulanan", { tahun, wilayah_kerja: wilayah === "Semua" ? undefined : wilayah, kategori: "pelabuhan_kedatangan" }),
          getKategoriBreakdown("phqc", "bulanan", { tahun, wilayah_kerja: wilayah === "Semua" ? undefined : wilayah, kategori: "pelabuhan_tujuan" }),
        ]);

    const gabunganPelabuhan = [
      ...rowsKedatangan.map((r) => ({ ...r, nilai: `Kedatangan: ${normalisasiNilaiKategori(r.nilai)}` })),
      ...rowsTujuan.map((r) => ({ ...r, nilai: `Tujuan: ${normalisasiNilaiKategori(r.nilai)}` })),
    ];
    
    const pivotPelabuhan = pivotKategoriDinamis(gabunganPelabuhan, mode, (n) => n);
    trenPelabuhanPeriodik = pivotPelabuhan.data;
    seriesPelabuhan = pivotPelabuhan.totals.map(([nilai], i) => ({
      key: nilai,
      label: nilai,
      warna: PALET_PELABUHAN[i % PALET_PELABUHAN.length],
    }));

    // Demografi Demografis Crew & Penumpang
    donutAbkPenumpang = [
      { nilai: "ABK WNA", jumlah: trenData.reduce((a, r) => a + r.total_abk_wna, 0) },
      { nilai: "ABK WNI", jumlah: trenData.reduce((a, r) => a + r.total_abk_wni, 0) },
      { nilai: "Penumpang WNA", jumlah: trenData.reduce((a, r) => a + r.total_penumpang_wna, 0) },
      { nilai: "Penumpang WNI", jumlah: trenData.reduce((a, r) => a + r.total_penumpang_wni, 0) },
    ];

    dataMentah = await getKegiatanPhqcEnriched({
      wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
      limit: 50,
    });
  } catch (err) {
    errorMuat = err instanceof Error ? err.message : "Gagal mengambil data PHQC.";
  }

  // ============================================================
  // 3. RENDER / BLOK STRUKTUR VIEW TAMPILAN
  // ============================================================
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
  
      {/* BAGIAN A: HEADER & UTILITY FILTER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Sisi Kiri: Teks Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            BKK Kelas I Samarinda
          </p>
          <h1 className="text-2xl font-bold text-ink">Dashboard Kegiatan PHQC</h1>
          <p className="text-sm text-muted">Berdasarkan tanggal keberangkatan</p>
        </div>

        {/* Sisi Kanan: Tombol Kembali */}
        <Link
          href="/dashboard/alat-angkut/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Dashboard Alat Angkut Kapal
        </Link>
      </div>

      <FilterPeriodeWilayah mode={mode} wilayah={wilayah} />

      {errorMuat && (
        <div className="rounded-card border border-risiko-merah/30 bg-surface p-6 text-sm text-risiko-merah">
          Gagal memuat data: {errorMuat}
        </div>
      )}

      {!errorMuat && (
        <>
          {/* BAGIAN B: KARTU INDIKATOR KPI UTAMA (Sekarang Tampil di Kedua Mode) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Jumlah Kapal ({mode === "mingguan" ? "Tahunan" : "Bulanan"})
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">{totalKapal}</p>
            </div>
            <div className="rounded-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total ABK</p>
              <p className="mt-1 text-2xl font-bold text-ink">{totalAbkKpi}</p>
            </div>
            <div className="rounded-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total Penumpang</p>
              <p className="mt-1 text-2xl font-bold text-ink">{totalPenumpangKpi}</p>
            </div>
          </div>

          {/* BAGIAN C: GRAFIK GARIS TREN UTAMA TAHUNAN */}
          <div className="rounded-card bg-surface p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
              Tren {mode === "mingguan" ? "Mingguan" : "Bulanan"} Tahun {tahun}
            </h2>
            {trenData.length === 0 ? (
              <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>
            ) : (
              <TrenChart
                data={trenData}
                variant={mode === "bulanan" ? "bar" : "line"}
                seri={[
                  { dataKey: "jumlah_kapal", nama: "Jumlah Kapal", warna: "#0F4C5C" },
                  { dataKey: "total_abk", nama: "Total ABK", warna: "#D97706" },
                  { dataKey: "total_penumpang", nama: "Total Penumpang", warna: "#7C3AED" },
                ]}
              />
            )}
            <BoxAnalisisAI
              sudahLogin={sudahLogin}
              role={role}
              konteks={`phqc-${mode}`}
              periodeKey={periodeKey}
              wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
            />
          </div>

          {/* BAGIAN D: STRUKTUR GRID UTAMA (Pelabuhan Kedatangan & Tujuan Berdampingan) */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <BreakdownCard
                  judul="Pelabuhan Kedatangan (Daerah Asal Kapal)"
                  data={kategoriData["pelabuhan_kedatangan"]}
                />
                <BoxAnalisisAI
                  sudahLogin={sudahLogin}
                  role={role}
                  konteks="phqc-daerah-asal"
                  periodeKey={periodeKey}
                  wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
                />
                <BoxPrediksiAI
                  sudahLogin={sudahLogin}
                  role={role}
                  konteks="phqc-daerah-asal"
                  periodeKey={periodeKey}
                  wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
                />
              </div>
              <BreakdownCard
                judul="Pelabuhan Tujuan"
                data={kategoriData["pelabuhan_tujuan"]}
              />
            </div>
          </div>

          {/* BAGIAN E: BLOK GRAFIK PENDUKUNG LENGKAP (Tampil di Kedua Mode) */}
          <>
            {/* Grafik Donut Asal Bendera Kapal */}
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  Bendera Kapal — Indonesia vs Luar Negeri
                </h3>
                <DonutBreakdown data={donutBenderaAsalNegara} />
              </div>
              <BreakdownCard judul="Bendera Kapal — Rincian Luar Negeri" data={benderaLuarNegeri} />
            </div>

            {/* Grafik RBA (Total vs Bulan/Minggu Target) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  RBA — Total Tahun {tahun}
                </h3>
                <DonutBreakdown data={kategoriData.rba} />
              </div>
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  RBA — {mode === "mingguan" ? `Minggu Epidemiologi ke-${mingguEpidTampilan}` : `Bulan ${NAMA_BULAN[bulanTampilan - 1]} ${tahun}`}
                </h3>
                <DonutBreakdown data={kategoriRbaPeriodeIni} />
              </div>
            </div>

            {/* Garis Tren Periodik RBA & Analisis AI */}
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Tren RBA {mode === "mingguan" ? "Mingguan" : "Bulanan"} — Tahun {tahun}
              </h3>
              <TrenChecklistMingguan 
                data={trenRbaPeriodik} 
                seriesList={seriesRba} 
                maxAktifDefault={seriesRba.length} 
                variant={mode === "bulanan" ? "bar" : "line"}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`phqc-rba-${mode}`}
                periodeKey={periodeKey}
                wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`phqc-rba-${mode}`}
                periodeKey={periodeKey}
                wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
              />
            </div>

            {/* Grafik Donut Tujuan Berlayar & Total Crew */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Tujuan Berlayar</h3>
                <DonutBreakdown data={kategoriData.tujuan_berlayar} />
              </div>
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  Total ABK & Penumpang — Tahun {tahun}
                </h3>
                <DonutBreakdown data={donutAbkPenumpang} />
              </div>
            </div>

            {/* Grafik Tren Periodik Gabungan Pelabuhan */}
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Tren {mode === "mingguan" ? "Mingguan" : "Bulanan"} Pelabuhan Kedatangan & Tujuan — Tahun {tahun}
              </h3>
              <TrenChecklistMingguan
                data={trenPelabuhanPeriodik}
                seriesList={seriesPelabuhan}
                tampilan="dropdown"
                variant={mode === "bulanan" ? "bar" : "line"}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`phqc-pelabuhan-${mode}`}
                periodeKey={periodeKey}
                wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role}
                konteks={`phqc-pelabuhan-${mode}`}
                periodeKey={periodeKey}
                wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
              />
            </div>

            {/* Grafik Tren Demografi ABK & Penumpang Keberangkatan */}
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Tren {mode === "mingguan" ? "Mingguan" : "Bulanan"} ABK & Penumpang Keberangkatan — Tahun {tahun}
              </h3>
              <TrenChart
                data={trenData}
                variant={mode === "bulanan" ? "bar" : "line"}
                seri={[
                  { dataKey: "total_abk_wna", nama: "ABK WNA", warna: "#2F9E44" },
                  { dataKey: "total_abk_wni", nama: "ABK WNI", warna: "#0F4C5C" },
                  { dataKey: "total_penumpang_wna", nama: "Penumpang WNA", warna: "#D97706" },
                  { dataKey: "total_penumpang_wni", nama: "Penumpang WNI", warna: "#7C3AED" },
                ]}
              />
              <div className="mt-4 space-y-3">
                <BoxAnalisisAI
                  sudahLogin={sudahLogin}
                  role={role}
                  konteks={`penumpang-${mode}`}
                  periodeKey={periodeKey}
                  wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
                />
                <BoxPrediksiAI
                  sudahLogin={sudahLogin}
                  role={role}
                  konteks={`penumpang-${mode}`}
                  periodeKey={periodeKey}
                  wilayahKerja={wilayah === "Semua" ? undefined : wilayah}
                />
              </div>
            </div>
          </>
        </>
      )}
    </div>
  );
}