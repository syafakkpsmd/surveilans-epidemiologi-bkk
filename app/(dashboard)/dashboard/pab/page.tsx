import {
  getRingkasanPabBulanan,
  getRingkasanPabMingguan,
  getDaftarWilayahKerjaSanitasi,
  getDaftarPabTmsDetail,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import PabClient from "./PabClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";

type PabPageProps = {
  searchParams: Promise<{
    wilayah?: string | string[];
    tahun?: string | string[];
  }>;
};

export default async function PabPage({ searchParams }: PabPageProps) {
  const resolvedParams = await searchParams;

  const wilayah = Array.isArray(resolvedParams.wilayah)
    ? resolvedParams.wilayah[0]
    : resolvedParams.wilayah;

  const tahunParam = Array.isArray(resolvedParams.tahun)
    ? resolvedParams.tahun[0]
    : resolvedParams.tahun;

  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const [role, daftarWilayah, dataBulanan, dataMingguan, dataTmsDetail] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanPabBulanan(tahun, wilayah),
    getRingkasanPabMingguan(tahun, wilayah),
    getDaftarPabTmsDetail(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  // Sama seperti TPP/TTU: minggu epid dimundurkan 1 minggu khusus
  // untuk tampilan (periodeKey Box AI saat granularitas mingguan),
  // tanpa mengubah lib/epi-week.ts yang harus tetap sinkron dengan
  // SQL mmwr_week.
  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  return (
    <PabClient
      daftarWilayah={daftarWilayah ?? []}
      dataBulanan={dataBulanan ?? []}
      dataMingguan={dataMingguan ?? []}
      dataTmsDetail={dataTmsDetail ?? []}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      tahunEpidBerjalan={tahunEpidBerjalan}
      mingguEpidBerjalan={mingguEpidBerjalan}
      wilayahParam={wilayah}
    />
  );
}