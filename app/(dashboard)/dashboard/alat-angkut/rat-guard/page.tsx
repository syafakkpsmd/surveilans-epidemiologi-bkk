import {
  getRingkasanRatGuardBulanan,
  getRingkasanRatGuardMingguan,
  getDaftarWilayahKerjaRatGuard,
} from "@/lib/db/queries/umum";
import { getUserRole } from "@/lib/auth/get-user-role";
import RatGuardClient from "./RatGuardClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI, type PermintaanHasilAI } from "@/lib/ai/getBanyakHasilAI";
import FilterTahun from "@/components/FilterTahun";
import { bacaTahun } from "@/lib/tahun";

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

  const tahun = bacaTahun(tahunParam);

  const [role, daftarWilayah, dataBulanan, dataMingguan] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaRatGuard(),
    getRingkasanRatGuardBulanan(tahun, wilayah),
    getRingkasanRatGuardMingguan(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  const wilayahKerjaAi = wilayah && wilayah !== "semua" ? wilayah : undefined;

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "rat-guard-bulanan", periodeKey: `${tahun}-${bulanBerjalan}`, tipe: "analisis", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-bulanan", periodeKey: `${tahun}-${bulanBerjalan}`, tipe: "prediksi", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-mingguan", periodeKey: `${tahun}-W52`, tipe: "analisis", wilayahKerja: wilayahKerjaAi },
    { konteks: "rat-guard-mingguan", periodeKey: `${tahun}-W52`, tipe: "prediksi", wilayahKerja: wilayahKerjaAi },
  ];

  const hasilAI = await getBanyakHasilAI(permintaanAI);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* BARIS HEADER UTAMA DENGAN FILTER TAHUN */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Pengawasan Rat Guard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoring Kepatuhan Pemasangan Rat Guard Alat Angkut Kapal Tahun {tahun}
          </p>
        </div>
        <div>
          <FilterTahun />
        </div>
      </div>

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
    </div>
  );
}