import {
  getRingkasanTtuBulanan,
  getRingkasanTtuMingguan,
  getDaftarWilayahKerjaSanitasi,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import TtuClient from "./TtuClient";

export default async function TtuPage({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string; tahun?: string }>;
}) {
  const { wilayah, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilayah, dataBulanan, dataMingguan] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanTtuBulanan(tahun, wilayah),
    getRingkasanTtuMingguan(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  return (
    <TtuClient
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
