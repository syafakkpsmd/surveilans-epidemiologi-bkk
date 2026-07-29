import {
  getRingkasanRatGuardBulanan,
  getRingkasanRatGuardMingguan,
  getDaftarWilayahKerjaRatGuard,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import RatGuardClient from "./RatGuardClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI, type PermintaanHasilAI } from "@/lib/ai/getBanyakHasilAI";

type RatGuardPageProps = {
  searchParams: Promise<{
    wilayah?: string | string[];
    tahun?: string | string[];
  }>;
};

export default async function RatGuardPage({ searchParams }: RatGuardPageProps) {
  const resolvedParams = await searchParams;

  const wilayah = Array.isArray(resolvedParams.wilayah)
    ? resolvedParams.wilayah[0]
    : resolvedParams.wilayah;

  const tahunParam = Array.isArray(resolvedParams.tahun)
    ? resolvedParams.tahun[0]
    : resolvedParams.tahun;

  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const [role, daftarWilayah, dataBulanan, dataMingguan] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaRatGuard(),
    getRingkasanRatGuardBulanan(tahun, wilayah),
    getRingkasanRatGuardMingguan(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  // Sama seperti TPP/TTU: minggu epid dimundurkan 1 minggu khusus untuk
  // tampilan, tanpa mengubah lib/epi-week.ts (harus tetap sinkron dgn SQL mmwr_week)
  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  // ============================================================
  // BATCH-FETCH HASIL AI -- menggantikan pola lama di mana setiap
  // <BoxAnalisisAI>/<BoxPrediksiAI> fetch GET sendiri saat mount.
  //
  // RatGuardClient.tsx defaultnya buka di tab "Bulanan" dengan
  // rentang akhir = bulanBerjalan, dan tab "Mingguan" defaultnya
  // rentang akhir = 52 (lihat state awal di RatGuardClient.tsx).
  // Jadi 2 kombinasi periodeKey INI yang paling mungkin dilihat
  // user pertama kali -- keduanya diambil sekaligus di sini.
  //
  // Kalau user nanti ganti rentang tanggal/tab lewat tombol
  // "Terapkan" di client, periodeKey berubah jadi kombinasi yang
  // TIDAK ada di hasil prefetch ini -- BoxAnalisisAI/BoxPrediksiAI
  // otomatis balik fetch sendiri untuk kombinasi baru itu saja
  // (lihat komentar hasilAwal di BoxAnalisisAI.tsx), jadi tidak
  // akan pernah nampilkan hasil yang salah periode.
  // ============================================================
  const wilayahKerjaAi = wilayah && wilayah !== "semua" ? wilayah : undefined;

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "rat-guard-bulanan", periodeKey: `${tahun}-${bulanBerjalan}`, tipe: "analisis", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-bulanan", periodeKey: `${tahun}-${bulanBerjalan}`, tipe: "prediksi", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-mingguan", periodeKey: `${tahun}-W52`, tipe: "analisis", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-mingguan", periodeKey: `${tahun}-W52`, tipe: "prediksi", wilayahKerja: wilayahKerjaAi },
  ];

  const hasilAI = await getBanyakHasilAI(permintaanAI);

  return (
    <RatGuardClient
      daftarWilayah={daftarWilayah ?? []}
      dataBulanan={dataBulanan ?? []}
      dataMingguan={dataMingguan ?? []}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      tahunEpidBerjalan={tahunEpidBerjalan}
      mingguEpidBerjalan={mingguEpidBerjalan}
      wilayahParam={wilayah}
      hasilAI={hasilAI}
    />
  );
}