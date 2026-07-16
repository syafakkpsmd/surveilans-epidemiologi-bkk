import { catatKunjungan } from "@/app/actions/kunjungan";
import { getRingkasanMingguan } from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { KartuKategoriHub } from "@/components/KartuKategoriHub";
import { HeroCarousel } from "@/components/HeroCarousel";
import { getGaleriFoto } from '@/lib/supabase/queriesFoto';
import GaleriFotoKegiatan from '@/components/GaleriFotoKegiatan';
import { getUserRole } from "@/lib/auth/get-user-role";

const slides = [
  { title: "Pemeriksaan Kapal Dalam Karantina", 
    image: "/kegiatan-1.jpg",
    deskripsi: "Pemeriksaan tanda-tanda kehidupan vektor di kapal MV. Courage."
  },
  { title: "Pengawasan Kapal di Pelabuhan", 
    image: "/kegiatan-2.jpg", 
    deskripsi: "Pengawasan kapal Penumpang kapal KM. Queen Soya di Pelabuhan Samarinda." 
  },
  { title: "Survei Jentik Anopheles di IKN", 
    image: "/kegiatan-3.jpg", 
    deskripsi: "Petugas melakukan survei jentik Anopheles pada Rawa yang ada di wilayah Ibu Kota Negara dengan  melakukan pengambilan Sampel." 
  },
  { title: "Pengawasan Vektor di IKN", 
    image: "/kegiatan-4.jpg", 
    deskripsi: "Pengawasan vektor penyakit di wilayah IKN." 
  },
  { title: "Pemeriksaan Kesehatan di Bandara APT Pranoto", 
    image: "/kegiatan-5.jpg", 
    deskripsi: "Pemeriksaan Kesehatan pada penumpang di Bandara APT Pranoto." 
  },
  { title: "Pengawasan Penumpang kapal di Pelabuhan", 
    image: "/kegiatan-6.jpg", 
    deskripsi: "Pemeriksaan lalu lintas Penumpang kapal di Pelabuhan Samarinda." 
  },
];

export default async function DashboardHubPage() {
  await catatKunjungan("/dashboard");

  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());

  const [role, fotoAwal] = await Promise.all([
    getUserRole(),
    getGaleriFoto(8),
  ]);

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
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">BKK Kelas I Samarinda</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Dashboard Surveilans</h1>
        <p className="text-sm text-slate-500">Minggu Epidemiologi ke-{mingguEpid} Tahun {tahunEpid}</p>
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
          bisaKelola={role === 'admin' || role === 'petugas'}
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
          href="/dashboard/pesawat"
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