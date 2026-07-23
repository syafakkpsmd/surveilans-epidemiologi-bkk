import {
  getRingkasanTppBulanan,
  getRingkasanTppMingguan,
  getDaftarWilayahKerjaSanitasi,
  getDetailPemeriksaanTpp,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import TppClient from "./TppClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";

type TppPageProps = {
  searchParams: Promise<{
    wilayah?: string | string[];
    tahun?: string | string[];
  }>;
};

export default async function TppPage({ searchParams }: TppPageProps) {
  const resolvedParams = await searchParams;

  const wilayah = Array.isArray(resolvedParams.wilayah)
    ? resolvedParams.wilayah[0]
    : resolvedParams.wilayah;

  const tahunParam = Array.isArray(resolvedParams.tahun)
    ? resolvedParams.tahun[0]
    : resolvedParams.tahun;

  const tahunParsed = tahunParam ? parseInt(tahunParam, 10) : NaN;
  const tahun = Number.isFinite(tahunParsed) ? tahunParsed : new Date().getFullYear();

  const [role, daftarWilayah, dataBulanan, dataMingguan, dataDetailTpp] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanTppBulanan(tahun, wilayah),
    getRingkasanTppMingguan(tahun, wilayah),
    getDetailPemeriksaanTpp(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  // Untuk TAMPILAN saja: minggu epid dimundurkan 1 minggu dari minggu
  // berjalan sebenarnya. Sengaja TIDAK memakai getMingguEpidSaatIni()
  // dari lib/epi-week.ts supaya fungsi yang sinkron dengan SQL
  // mmwr_week (dipakai view Supabase) tidak ikut berubah. Digeser
  // lewat tanggal (bukan `mingguEpid - 1` manual) supaya pergantian
  // tahun & minggu ke-52/53 tetap ditangani benar oleh logika yang
  // sama seperti fungsi intinya.
  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  return (
    <TppClient
      daftarWilayah={daftarWilayah ?? []}
      dataBulanan={dataBulanan ?? []}
      dataMingguan={dataMingguan ?? []}
      dataDetailTpp={dataDetailTpp ?? []}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      tahunEpidBerjalan={tahunEpidBerjalan}
      mingguEpidBerjalan={mingguEpidBerjalan}
      wilayahParam={wilayah}
    />
  );
}