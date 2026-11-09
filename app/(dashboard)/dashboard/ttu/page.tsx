import Link from "next/link";
import {
  getRingkasanTtuBulanan,
  getRingkasanTtuMingguan,
} from "@/lib/db/queries/umum";
import { getNamaWilkerModul } from "@/lib/wilayah-kerja/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import TtuClient from "./TtuClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI, kunciAI } from "@/lib/ai/getBanyakHasilAI";
import FilterTahun from "@/components/FilterTahun";
import { bacaTahun, bulanTampil, jumlahMingguEpid, TAHUN_MAJU_SANITASI } from "@/lib/tahun";

type TtuPageProps = {
  searchParams: Promise<{
    wilayah?: string | string[];
    tahun?: string | string[];
  }>;
};

export default async function TtuPage({ searchParams }: TtuPageProps) {
  const resolvedParams = await searchParams;

  const wilayah = Array.isArray(resolvedParams.wilayah)
    ? resolvedParams.wilayah[0]
    : resolvedParams.wilayah;

  const tahunParam = Array.isArray(resolvedParams.tahun)
    ? resolvedParams.tahun[0]
    : resolvedParams.tahun;

  // Tahun berjalan sampai TAHUN_MAJU_SANITASI tahun ke depan; nilai di luar itu jatuh ke tahun berjalan.
  const tahun = bacaTahun(tahunParam, TAHUN_MAJU_SANITASI);

  const bulanBerjalan = bulanTampil(tahun); // 12 untuk tahun selain tahun ini

  // ============================================================
  // PENTING: kombinasi ini HARUS PERSIS SAMA dengan default state di
  // TtuClient.tsx -- granularitas default "bulanan", rentangBulan
  // default { awal: 1, akhir: bulanBerjalan }. wilayahKerja default
  // BISA dihitung server karena selectedWilayah awal client =
  // wilayahParam || "semua".
  // ============================================================
  const konteksAiDefault = "ttu-bulanan";
  const periodeKeyDefault = `${tahun}-${bulanBerjalan}`;
  const wilayahKerjaDefault = wilayah || undefined;
  const comboKeyDasar = `${konteksAiDefault}|${periodeKeyDefault}|${wilayahKerjaDefault ?? ""}`;

  const [role, daftarWilayah, dataBulanan, dataMingguan, hasilAI] = await Promise.all([
    getUserRole(),
    getNamaWilkerModul("ttu"), // Menggunakan wilayah kerja khusus modul TTU sesuai centang admin
    getRingkasanTtuBulanan(tahun, wilayah),
    getRingkasanTtuMingguan(tahun, wilayah),
    getBanyakHasilAI([
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" },
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" },
    ]),
  ]);

  const bolehInput = role === "admin" || role === "petugas";

  // Minggu epid dimundurkan 1 minggu khusus untuk tampilan
  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidSaatIni, mingguEpid: mingguEpidSaatIni } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);
  // Tahun lain: tampilkan seluruh minggu tahun itu (52/53), bukan minggu hari ini.
  const tahunIni = tahun === tahunEpidSaatIni;
  const tahunEpidBerjalan = tahun;
  const mingguEpidBerjalan = tahunIni ? mingguEpidSaatIni : jumlahMingguEpid(tahun);

  return (
    <TtuClient
      key={tahun}
      daftarWilayah={daftarWilayah ?? []}
      dataBulanan={dataBulanan ?? []}
      dataMingguan={dataMingguan ?? []}
      role={role ?? ""}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      tahunEpidBerjalan={tahunEpidBerjalan}
      mingguEpidBerjalan={mingguEpidBerjalan}
      wilayahParam={wilayah}
      aksiHeader={
        <>
          <FilterTahun maju={TAHUN_MAJU_SANITASI} />
          {bolehInput ? (
            <Link
              href="/dashboard/ttu/input"
              className="rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
            >
              + Input / Unggah Data
            </Link>
          ) : null}
        </>
      }
      hasilAwalInisial={{
        comboKeyDasar,
        analisis: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" })] ?? null,
        prediksi: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" })] ?? null,
      }}
    />
  );
}