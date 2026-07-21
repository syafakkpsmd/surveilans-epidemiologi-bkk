import {
  getRingkasanPabBulanan,
  getRingkasanPabMingguan,
  getDaftarWilayahKerjaSanitasi,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import PabClient from "./PabClient";

export default async function PabPage({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string; tahun?: string }>;
}) {
  const { wilayah, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilayah, dataBulanan, dataMingguan] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanPabBulanan(tahun, wilayah),
    getRingkasanPabMingguan(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  return (
    <PabClient
      daftarWilayah={daftarWilayah}
      dataBulanan={dataBulanan}
      dataMingguan={dataMingguan}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      wilayahParam={wilayah}
    />
  );
}
