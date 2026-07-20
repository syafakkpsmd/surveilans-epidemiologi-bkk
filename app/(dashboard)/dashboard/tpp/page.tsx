import { getRingkasanTppBulanan, getDaftarWilayahKerjaSanitasi } from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import TppClient from "./TppClient";

export default async function TppPage({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string; tahun?: string }>;
}) {
  const { wilayah, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilayah, ringkasanBulanan] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanTppBulanan(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  return (
    <TppClient
      daftarWilayah={daftarWilayah}
      dataBulanan={ringkasanBulanan}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      wilayahParam={wilayah}
    />
  );
}
