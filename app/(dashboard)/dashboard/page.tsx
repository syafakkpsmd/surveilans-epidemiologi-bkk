import { catatKunjungan } from "@/app/actions/kunjungan";
import { getRingkasanMingguan } from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { KartuKategoriHub } from "@/components/KartuKategoriHub";
import { HeroCarousel } from "@/components/HeroCarousel";
import { getGaleriFoto, getJenisKegiatanFoto } from '@/lib/supabase/queriesFoto';
import GaleriFotoKegiatan from '@/components/GaleriFotoKegiatan';
import { getUserRole } from "@/lib/auth/get-user-role";
import { TombolAnalisisAI } from "@/components/TombolAnalisisAI";


export default async function DashboardHubPage() {
  await catatKunjungan("/dashboard");

  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());

  const [role, fotoUntukSlide, daftarJenis] = await Promise.all([
      getUserRole(),
      getGaleriFoto(10),
      getJenisKegiatanFoto(),
  ]);

  const fotoAwal = fotoUntukSlide.slice(0, 4); // widget galeri cuma 6 foto terbaru

  const slides = fotoUntukSlide.map((foto) => ({
    title: foto.judul,
    image: foto.url,
    deskripsi: foto.deskripsi ?? undefined,
  }));

  let statistikAlatAngkut: string | undefined;
  try {
    const [ringkasanCop, ringkasanPhqc] = await Promise.all([
      getRingkasanMingguan("cop", tahunEpid),
      getRingkasanMingguan("phqc", tahunEpid),
    ]);
    const totalMinggu =
      ringkasanCop.filter((r) => r.minggu_epid === mingguEpid).reduce((a, r) => a + r.jumlah_kapal, 0) +
      ringkasanPhqc.filter((r) => r.minggu_epid === mingguEpid).reduce((a, r) => a + r.jumlah_kapal, 0);
    statistikAlatAngkut = `${totalMinggu} kapal minggu ini`;
  } catch {
    statistikAlatAngkut = undefined;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header Dashboard & Tombol Atur AI (Sejajar Kanan-Kiri) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Kiri: Judul Dashboard */}
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
          role={role === 'admin' || role === 'petugas' ? role : null} 
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
          bisaKelola={role === 'admin' || role === 'petugas'}
          tampilan="ringkas"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KartuKategoriHub
          judul="Alat Angkut Kapal"
          deskripsi="Kegiatan COP & PHQC di 6 wilayah kerja pelabuhan."
          href="/dashboard/alat-angkut"
          statistik={statistikAlatAngkut}
        />
        <KartuKategoriHub
          judul="Alat Angkut Pesawat"
          deskripsi="Surveilans kedatangan pesawat di Bandara APT Pranoto."
          href="/dashboard/alat-angkut/pesawat"
        />
        <KartuKategoriHub
          judul="Surveilans Vektor"
          deskripsi="Pengawasan vektor penyakit (Nyamuk, lalat, tikus) di wilayah kerja."
          href="/dashboard/vektor"
        />
        <KartuKategoriHub
          judul="Surveilans TPP/TTU/PAB"
          deskripsi="Tempat pengelolaan pangan, tempat umum, penyediaan air bersih."
          href="/dashboard/tpp"
        />
        <KartuKategoriHub
          judul="Penyakit Infeksi Emerging"
          deskripsi="Deteksi & pemantauan penyakit infeksi baru muncul."
          href="/dashboard/emerging"
        />
        <KartuKategoriHub
          judul="KLB"
          deskripsi="Kejadian Luar Biasa -- pemantauan & respons."
          href="https://script.google.com/macros/s/AKfycbx0LK83R7rZ0UGblcVKqKlwUJ8Jk3EdF9sV_l2JTMXzbAzjyj-ZZJ-WNIfiaHqJ5OMesQ/exec"
        />
        <KartuKategoriHub
          judul="Surveilans Migrasi Malaria"
          deskripsi="Pemantauan kasus malaria impor pada penumpang/ABK yang baru tiba."
          href="/dashboard/malaria"
        />
        <KartuKategoriHub
          judul="Surveilans TB"
          deskripsi="Pemantauan kasus tuberculosis di wilayah kerja."
          href="/dashboard/tb"
        />
        <KartuKategoriHub
          judul="HIV"
          deskripsi="Pemantauan kasus HIV di wilayah kerja."
          href="/dashboard/hiv"
        />
        <KartuKategoriHub
          judul="Buletin Surveilans"
          deskripsi="Buletin informasi surveilans epidemiologi."
          href="/dashboard/buletin"
        />
      </div>
    </div>
  );
}