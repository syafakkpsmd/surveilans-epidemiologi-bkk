import {
  getRingkasanRatGuardBulanan,
  getRingkasanRatGuardMingguan,
  getDaftarWilayahKerjaRatGuard,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import RatGuardClient from "./RatGuardClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";

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
    />
  );
}