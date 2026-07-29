import {
  getRingkasanPabBulanan,
  getRingkasanPabMingguan,
  getDaftarWilayahKerjaSanitasi,
  getDaftarPabTmsDetail,
} from "@/lib/supabase/queries";
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

  // ============================================================
  // PENTING: kombinasi ini HARUS PERSIS SAMA dengan default useState
  // di PabClient.tsx -- granularitas default "bulanan", appliedBulanAwal=1/
  // appliedBulanAkhir=12 (periodeKey pakai appliedBulanAkhir). wilayahKerja
  // default MEMANG bisa dihitung server karena selectedWilayah awal client
  // = wilayahParam || "semua" -- jadi `wilayah` dari searchParams ini valid
  // dipakai langsung (undefined kalau belum ada filter wilayah, sama seperti
  // wilayahKerja undefined saat selectedWilayah==="semua" di client).
  // Kalau default granularitas/rentang di PabClient.tsx berubah nanti,
  // sesuaikan juga di sini -- kalau lupa, tidak fatal (fallback fetch client
  // tetap jalan), cuma prefetch jadi mubazir.
  // ============================================================
  const konteksAiDefault = "pab-bulanan";
  const periodeKeyDefault = `${tahun}-12`;
  const wilayahKerjaDefault = wilayah || undefined;
  const comboKeyDasar = `${konteksAiDefault}|${periodeKeyDefault}|${wilayahKerjaDefault ?? ""}`;

  const [role, daftarWilayah, dataBulanan, dataMingguan, dataTmsDetail, hasilAI] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanPabBulanan(tahun, wilayah),
    getRingkasanPabMingguan(tahun, wilayah),
    getDaftarPabTmsDetail(tahun, wilayah),
    getBanyakHasilAI([
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" },
      { konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" },
    ]),
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
      hasilAwalInisial={{
        comboKeyDasar,
        analisis: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "analisis" })] ?? null,
        prediksi: hasilAI[kunciAI({ konteks: konteksAiDefault, periodeKey: periodeKeyDefault, wilayahKerja: wilayahKerjaDefault, tipe: "prediksi" })] ?? null,
      }}
    />
  );
}