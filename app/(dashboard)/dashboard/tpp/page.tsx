import Link from "next/link";
import {
  getRingkasanTppBulanan,
  getRingkasanTppMingguan,
  getDetailPemeriksaanTpp,
} from "@/lib/db/queries/umum";
import { getNamaWilkerModul } from "@/lib/wilayah-kerja/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import TppClient from "./TppClient";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI } from "@/lib/ai/getBanyakHasilAI";
import type { PermintaanHasilAI } from "@/lib/ai/hasilAiTypes";

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
    getNamaWilkerModul("tpp"),
    getRingkasanTppBulanan(tahun, wilayah),
    getRingkasanTppMingguan(tahun, wilayah),
    getDetailPemeriksaanTpp(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;
  const bolehInput = role === "admin" || role === "petugas";

  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  const mingguTersediaDefault = (() => {
    const set = new Set<number>();
    dataMingguan.forEach((item: any) => {
      const mg = item.minggu ?? null;
      if (mg !== null && mg !== undefined) set.add(Number(mg));
    });
    if (set.size === 0) return 52;
    return Math.max(...Array.from(set));
  })();

  const wilayahKerjaAI = wilayah && wilayah !== "semua" ? wilayah : undefined;
  const periodeKeyMingguanDefault = `${tahun}-W${mingguTersediaDefault}`;
  const periodeKeyBulananDefault = `${tahun}-${bulanBerjalan}`;

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "tpp-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tpp-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
    { konteks: "tpp-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tpp-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
  ];

  const hasilAI = await getBanyakHasilAI(permintaanAI);

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
      aksiHeader={
        bolehInput ? (
          <Link
            href="/dashboard/tpp/input"
            className="rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
          >
            + Input / Unggah Data
          </Link>
        ) : null
      }
      hasilAI={hasilAI}
    />
  );
}