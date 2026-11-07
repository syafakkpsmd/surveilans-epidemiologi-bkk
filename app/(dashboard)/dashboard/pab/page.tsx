import Link from "next/link";
import {
  getRingkasanPabBulanan,
  getRingkasanPabMingguan,
  getDaftarPabTmsDetail,
} from "@/lib/db/queries/umum";
import { getNamaWilkerModul } from "@/lib/wilayah-kerja/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import PabClient from "./PabClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI, kunciAI } from "@/lib/ai/getBanyakHasilAI";

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

  const konteksAiDefault = "pab-bulanan";
  const periodeKeyDefault = `${tahun}-12`;
  const wilayahKerjaDefault = wilayah || undefined;
  const comboKeyDasar = `${konteksAiDefault}|${periodeKeyDefault}|${wilayahKerjaDefault ?? ""}`;

  const [role, daftarWilayah, dataBulanan, dataMingguan, dataTmsDetail, hasilAI] = await Promise.all([
    getUserRole(),
    getNamaWilkerModul("pab"),
    getRingkasanPabBulanan(tahun, wilayah),
    getRingkasanPabMingguan(tahun, wilayah),
    getDaftarPabTmsDetail(tahun, wilayah),
    getBanyakHasilAI([
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" },
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" },
    ]),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;
  const bolehInput = role === "admin" || role === "petugas";

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
      aksiHeader={
        bolehInput ? (
          <Link
            href="/dashboard/pab/input"
            className="rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
          >
            + Input / Unggah Data
          </Link>
        ) : null
      }
      hasilAwalInisial={{
        comboKeyDasar,
        analisis: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" })] ?? null,
        prediksi: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" })] ?? null,
      }}
    />
  );
}