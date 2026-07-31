import { catatKunjungan } from "@/app/actions/kunjungan";
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getRingkasanVektorDbd,
  getRingkasanTppBulanan,
  getRingkasanTtuBulanan,
  getRingkasanPabBulanan,
  getKotaPesawatBulanan,
} from "@/lib/supabase/queries";
import { getRingkasanPesawatBulanan } from "@/lib/supabase/queriesPesawat";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { HeroCarousel } from "@/components/HeroCarousel";
import { getGaleriFoto, getJenisKegiatanFoto } from "@/lib/supabase/queriesFoto";
import GaleriFotoKegiatan from "@/components/GaleriFotoKegiatan";
import { getUserRole } from "@/lib/auth/get-user-role";
import { TombolAnalisisAI } from "@/components/TombolAnalisisAI";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ================================================================
// Tipe kartu dashboard
// ================================================================
interface KartuDashboard {
  href: string;
  ikon: string;
  judul: string;
  deskripsi: string;
  warna: string;
  statistik?: string;
}

// ================================================================
// Helper: bungkus satu promise data supaya kegagalannya terisolasi
// (tidak menjatuhkan promise lain di Promise.allSettled).
// ================================================================
async function amankan<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function DashboardHubPage() {
  await catatKunjungan("/dashboard");

  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());
  const bulanSekarang = new Date().getMonth() + 1;
  const tahunSekarang = new Date().getFullYear();

  // ================================================================
  // SATU Promise.all untuk SEMUA data yang dibutuhkan halaman ini.
  // Setiap entri dibungkus amankan() supaya satu query yang gagal
  // (mis. RLS/grant belum lengkap) tidak menjatuhkan seluruh halaman
  // -- kartu terkait saja yang kehilangan statistiknya.
  // ================================================================
  const [
    role,
    fotoUntukSlide,
    daftarJenis,
    ringkasanCopMingguan,
    ringkasanPhqcMingguan,
    ringkasanCopBulanan,
    ringkasanPhqcBulanan,
    pesawatKedatanganBulanan,
    pesawatKeberangkatanBulanan,
    ringkasanPesawatBulanan,
    dataDbdMingguan,
    dataTppBulanan,
    dataTtuBulanan,
    dataPabBulanan,
  ] = await Promise.all([
    getUserRole(),
    amankan(getGaleriFoto(10), []),
    amankan(getJenisKegiatanFoto(), []),
    amankan(getRingkasanMingguan("cop", tahunEpid), []),
    amankan(getRingkasanMingguan("phqc", tahunEpid), []),
    amankan(getRingkasanBulanan("cop", tahunSekarang), []),
    amankan(getRingkasanBulanan("phqc", tahunSekarang), []),
    amankan(getKotaPesawatBulanan(tahunSekarang, "kedatangan"), []),
    amankan(getKotaPesawatBulanan(tahunSekarang, "keberangkatan"), []),
    amankan(getRingkasanPesawatBulanan({ tahun: tahunSekarang }), []),
    amankan(getRingkasanVektorDbd(tahunEpid), []),
    amankan(getRingkasanTppBulanan(tahunSekarang), []),
    amankan(getRingkasanTtuBulanan(tahunSekarang), []),
    amankan(getRingkasanPabBulanan(tahunSekarang), []),
  ]);

  // ================================================================
  // Galeri & carousel
  // ================================================================
  const fotoAwal = fotoUntukSlide.slice(0, 4);
  const slides = fotoUntukSlide.map((foto) => ({
    title: foto.judul,
    image: foto.url,
    deskripsi: foto.deskripsi ?? undefined,
  }));

  // ================================================================
  // Kalkulasi statistik ringkas per kartu — murni sinkron, tidak ada
  // await di sini karena semua data sudah tersedia dari Promise.all
  // di atas.
  // ================================================================
  const totalKapalMingguIni =
    ringkasanCopMingguan.filter((r) => r.minggu_epid === mingguEpid).reduce((a, r) => a + r.jumlah_kapal, 0) +
    ringkasanPhqcMingguan.filter((r) => r.minggu_epid === mingguEpid).reduce((a, r) => a + r.jumlah_kapal, 0);

  const totalPenerbanganBulanIni = [...pesawatKedatanganBulanan, ...pesawatKeberangkatanBulanan]
    .filter((r) => r.bulan === bulanSekarang)
    .reduce((a, r) => a + r.jumlah_penerbangan, 0);

  const totalOrangBulanIni = (() => {
    const totalAbkCop = ringkasanCopBulanan
      .filter((r) => r.bulan === bulanSekarang)
      .reduce((a, r) => a + r.total_abk, 0);

    const totalAbkPhqc = ringkasanPhqcBulanan
      .filter((r) => r.bulan === bulanSekarang)
      .reduce((a, r: any) => a + r.total_abk + (r.total_penumpang ?? 0), 0);

    const totalPesawatOrang = ringkasanPesawatBulanan
      .filter((r: any) => {
        const b = typeof r.bulan === "number" ? r.bulan : parseInt(String(r.bulan), 10);
        return b === bulanSekarang;
      })
      .reduce(
        (a: number, r: any) =>
          a + (r.crew_datang ?? 0) + (r.penumpang_datang ?? 0) + (r.crew_berangkat ?? 0) + (r.penumpang_berangkat ?? 0),
        0
      );

    return totalAbkCop + totalAbkPhqc + totalPesawatOrang;
  })();

  const totalSurveiDbdMingguIni = dataDbdMingguan
    .filter((r: any) => r.minggu_epid === mingguEpid)
    .reduce((a: number, r: any) => a + (r.jml_survei ?? 0), 0);

  const totalTppDiperiksaBulanIni = dataTppBulanan
    .filter((r: any) => r.bulan === bulanSekarang)
    .reduce((a: number, r: any) => a + (r.jumlah_tpp_diperiksa ?? 0), 0);

  const totalTtuDiperiksaBulanIni = dataTtuBulanan
    .filter((r: any) => r.bulan === bulanSekarang)
    .reduce((a: number, r: any) => a + (r.jumlah_diperiksa ?? 0), 0);

  const totalPabDiperiksaBulanIni = dataPabBulanan
    .filter((r: any) => r.bulan === bulanSekarang)
    .reduce((a: number, r: any) => a + (r.total_pab_diperiksa ?? 0), 0);

  // ================================================================
  // Data kartu dashboard
  // ================================================================
  const kartuDashboard: KartuDashboard[] = [
    {
      href: "/dashboard/alat-angkut",
      ikon: "🚢",
      judul: "Alat Angkut Kapal",
      deskripsi: "Kegiatan COP & PHQC di 6 wilayah kerja pelabuhan.",
      warna: "#0E7490",
      statistik: `${totalKapalMingguIni} kapal minggu ini`,
    },
    {
      href: "/dashboard/alat-angkut/pesawat",
      ikon: "✈️",
      judul: "Alat Angkut Pesawat",
      deskripsi: "Surveilans kedatangan pesawat di Bandara APT Pranoto.",
      warna: "#1D4ED8",
      statistik: `${totalPenerbanganBulanIni} penerbangan bulan ini`,
    },
    {
      href: "/dashboard/abk-crew-penumpang",
      ikon: "🧑‍🤝‍🧑",
      judul: "Pengawasan Lalu Lintas Orang",
      deskripsi: "Pengawasan ABK, crew, dan penumpang.",
      warna: "#7C3AED",
      statistik: `${totalOrangBulanIni} orang bulan ini`,
    },
    {
      href: "/dashboard/vektor",
      ikon: "🦟",
      judul: "Surveilans Vektor",
      deskripsi: "Pengawasan vektor penyakit (Nyamuk, lalat, tikus) di wilayah kerja.",
      warna: "#B91C1C",
      statistik: `${totalSurveiDbdMingguIni} survei DBD minggu ini`,
    },
    {
      href: "/dashboard/tpp",
      ikon: "🍽️",
      judul: "Surveilans TPP",
      deskripsi: "Tempat pengelolaan pangan.",
      warna: "#B7791F",
      statistik: `${totalTppDiperiksaBulanIni} TPP diperiksa bulan ini`,
    },
    {
      href: "/dashboard/ttu",
      ikon: "🏢",
      judul: "Surveilans TTU",
      deskripsi: "Tempat-tempat umum.",
      warna: "#2563EB",
      statistik: `${totalTtuDiperiksaBulanIni} TTU diperiksa bulan ini`,
    },
    {
      href: "/dashboard/pab",
      ikon: "💧",
      judul: "Surveilans PAB",
      deskripsi: "Tempat penyediaan air bersih.",
      warna: "#0891B2",
      statistik: `${totalPabDiperiksaBulanIni} PAB diperiksa bulan ini`,
    },
    {
      href: "/dashboard/nasional-emerging",
      ikon: "🌐",
      judul: "Penyakit Infeksi Emerging Nasional",
      deskripsi: "Deteksi & pemantauan penyakit infeksi emerging di Indonesia.",
      warna: "#D97706",
    },
    {
      href: "/dashboard/global-emerging",
      ikon: "🌐",
      judul: "Penyakit Infeksi Emerging Global",
      deskripsi: "Deteksi & pemantauan penyakit infeksi emerging di Dunia.",
      warna: "#4338CA",
    },
    {
      href: "https://script.google.com/macros/s/AKfycbx0LK83R7rZ0UGblcVKqKlwUJ8Jk3EdF9sV_l2JTMXzbAzjyj-ZZJ-WNIfiaHqJ5OMesQ/exec",
      ikon: "🚨",
      judul: "KLB",
      deskripsi: "Kejadian Luar Biasa — pemantauan & respons.",
      warna: "#DC2626",
    },
    {
      href: "/dashboard/malaria",
      ikon: "🦟",
      judul: "Surveilans Migrasi Malaria",
      deskripsi: "Pemantauan kasus malaria impor pada penumpang/ABK yang baru tiba.",
      warna: "#15803D",
    },
    {
      href: "/dashboard/tb",
      ikon: "🫁",
      judul: "Surveilans TB",
      deskripsi: "Pemantauan kasus tuberculosis di wilayah kerja.",
      warna: "#4338CA",
    },
    {
      href: "/dashboard/hiv",
      ikon: "🎗️",
      judul: "HIV",
      deskripsi: "Pemantauan kasus HIV di wilayah kerja.",
      warna: "#BE185D",
    },
    {
      href: "/dashboard/buletin",
      ikon: "📰",
      judul: "Buletin Surveilans",
      deskripsi: "Buletin informasi surveilans epidemiologi.",
      warna: "#334155",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            BKK Kelas I Samarinda
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900">Dashboard Surveilans</h1>
          <p className="text-sm text-slate-500">
            Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}
          </p>
        </div>

        <TombolAnalisisAI
          sudahLogin={!!role}
          role={role === "admin" || role === "petugas" ? role : null}
          konteks="surveilans-hub"
          periodeKey={`${tahunEpid}-W${mingguEpid}`}
        />
      </div>

      <HeroCarousel items={slides} />

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Galeri Kegiatan Terbaru</h2>
          <a href="/dashboard/galeri" className="text-xs text-[#0F4C5C] underline">
            Lihat semua →
          </a>
        </div>
        <GaleriFotoKegiatan
          fotoAwal={fotoAwal}
          daftarJenis={daftarJenis}
          bisaKelola={role === "admin" || role === "petugas"}
          tampilan="ringkas"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kartuDashboard.map((kartu) => (
          <Link
            key={kartu.href}
            href={kartu.href}
            prefetch={false}
            className="rounded-xl border-t-4 bg-white p-5 shadow-sm transition hover:shadow-md"
            style={{ borderTopColor: kartu.warna }}
          >
            <div className="mb-2 text-3xl">{kartu.ikon}</div>
            <h2 className="font-semibold text-[#0F2A38]">{kartu.judul}</h2>
            <p className="mt-1 text-xs text-gray-500">{kartu.deskripsi}</p>
            {kartu.statistik && (
              <p className="mt-2 text-xs font-semibold" style={{ color: kartu.warna }}>
                {kartu.statistik}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}