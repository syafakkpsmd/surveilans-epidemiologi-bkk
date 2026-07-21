import {
  getRingkasanTppBulanan,
  getRingkasanTppMingguan,
  getDaftarWilayahKerjaSanitasi,
  getDetailPemeriksaanTpp, // Import query data detail
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import TppClient from "./TppClient";

export default async function TppPage({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string; tahun?: string }>;
}) {
  const { wilayah, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  // Ambil semua data secara paralel termasuk data detail pemeriksaan
  const [role, daftarWilayah, dataBulanan, dataMingguan, dataDetailTpp] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanTppBulanan(tahun, wilayah),
    getRingkasanTppMingguan(tahun, wilayah),
    getDetailPemeriksaanTpp(tahun, wilayah), // Query tambahan
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  return (
    <TppClient
      daftarWilayah={daftarWilayah}
      dataBulanan={dataBulanan}
      dataMingguan={dataMingguan}
      dataDetailTpp={dataDetailTpp} // Meneruskan data detail ke TppClient
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      wilayahParam={wilayah}
    />
  );
}