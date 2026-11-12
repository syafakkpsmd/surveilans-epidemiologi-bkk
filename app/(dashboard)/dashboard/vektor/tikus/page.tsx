import {
  getRingkasanVektorTikus,
  getRingkasanVektorTikusBulanan,
  getUjiLabVektorTikusMingguan,
  getUjiLabVektorTikusBulanan,
} from "@/lib/db/queries/umum";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { getMingguEpidSaatIni } from "@/lib/epi-week";
import VektorTikusClient from "./VektorTikusClient";
import { getBanyakHasilAI } from "@/lib/ai/getBanyakHasilAI";
import type { PermintaanHasilAI } from "@/lib/ai/hasilAiTypes";
import { bacaTahun, jumlahMingguEpid } from "@/lib/tahun";
import { getDaftarWilker } from "@/lib/wilayah-kerja/server";

export default async function VektorTikusPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = bacaTahun(tahunParam);

  const { sudahLogin, role } = await getStatusAkses();

  const { tahunEpid, mingguEpid } = getMingguEpidSaatIni();
  const tahunIni = tahun === tahunEpid;
  const mingguBerjalan = tahunIni ? Math.max(1, mingguEpid - 1) : jumlahMingguEpid(tahun);
  const bulanBerjalan = tahunIni ? new Date().getMonth() + 1 : 12;

  const wilayahKerjaAI = wilker && wilker !== "semua" ? wilker : undefined;
  const periodeKeyMingguanDefault = `${tahun}-W1_W${mingguBerjalan}`;
  const periodeKeyBulananDefault = `${tahun}-M1_M${bulanBerjalan}`;

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "vektor-tikus-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "vektor-tikus-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
    { konteks: "tikus-lab-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tikus-lab-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
    { konteks: "tikus-lab-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tikus-lab-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
  ];

  const [wilkerRefRaw, ringkasanMingguan, ringkasanBulanan, ujiLabMingguan, ujiLabBulanan, hasilAI] =
    await Promise.all([
      getDaftarWilker(),
      getRingkasanVektorTikus(tahun, wilker),
      getRingkasanVektorTikusBulanan(tahun, wilker),
      getUjiLabVektorTikusMingguan(tahun, wilker),
      getUjiLabVektorTikusBulanan(tahun, wilker),
      getBanyakHasilAI(permintaanAI),
    ]);

    // Wilayah yang ditampilkan: aktif, bukan kantor induk, dan bukan anak (bandara privat menginduk ke wilker lain)
  const daftarWilker = wilkerRefRaw
    .filter((w) => w.aktif && w.jenis !== "Kantor" && !w.indukKode)
    .map((w) => ({ kode: w.kode, nama: w.nama, warna: w.warna, aktif: w.aktif }));

  const dataMingguan = ringkasanMingguan.map((r: any) => ({
    minggu_epid: r.minggu_epid || 0,
    kode_wilker: r.kode_wilker ?? "semua",
    jml_trap_dipasang: r.jml_trap_dipasang || 0,
    jml_trap_tertangkap: r.jml_trap_tertangkap || 0,
    tsi: r.tsi_rerata ?? 0,
    index_pinjal: r.index_pinjal_rerata ?? 0,
    rt: r.rt || 0,
    rn: r.rn || 0,
    mm: r.mm || 0,
    jenis_lainnya: r.jenis_lainnya || 0,
  }));

  const dataBulanan = ringkasanBulanan.map((r: any) => ({
    bulan: r.bulan || 1,
    kode_wilker: r.kode_wilker ?? "semua",
    jml_trap_dipasang: r.jml_trap_dipasang || 0,
    jml_trap_tertangkap: r.jml_trap_tertangkap || 0,
    tsi: r.tsi_rerata ?? 0,
    index_pinjal: r.index_pinjal_rerata ?? 0,
    rt: r.rt || 0,
    rn: r.rn || 0,
    mm: r.mm || 0,
    jenis_lainnya: r.jenis_lainnya || 0,
  }));

  const labMingguan = ringkasanMingguan.map((r: any) => {
    const cocok = ujiLabMingguan.find(
      (u) => u.periode === (r.minggu_epid || 0) && u.kode_wilker === (r.kode_wilker || "")
    );
    return {
      minggu_epid: r.minggu_epid || 0,
      kode_wilker: r.kode_wilker || "semua",
      diuji_lab: cocok?.diuji_lab ?? 0,
      leptospira_positif: r.total_positif_leptospira || 0,
      leptospira_negatif: cocok?.leptospira_negatif ?? 0,
      pes_positif: r.total_positif_pes || 0,
      pes_negatif: cocok?.pes_negatif ?? 0,
      hantavirus_positif: r.total_positif_hantavirus || 0,
      hantavirus_negatif: cocok?.hantavirus_negatif ?? 0,
    };
  });

  const labBulanan = ringkasanBulanan.map((r: any) => {
    const cocok = ujiLabBulanan.find(
      (u) => u.periode === (r.bulan || 1) && u.kode_wilker === (r.kode_wilker || "")
    );
    return {
      bulan: r.bulan || 1,
      kode_wilker: r.kode_wilker || "semua",
      diuji_lab: cocok?.diuji_lab ?? 0,
      leptospira_positif: r.total_positif_leptospira || 0,
      leptospira_negatif: cocok?.leptospira_negatif ?? 0,
      pes_positif: r.total_positif_pes || 0,
      pes_negatif: cocok?.pes_negatif ?? 0,
      hantavirus_positif: r.total_positif_hantavirus || 0,
      hantavirus_negatif: cocok?.hantavirus_negatif ?? 0,
    };
  });

  return (
    <VektorTikusClient
      key={tahun}
      daftarWilker={daftarWilker}
      dataMingguan={dataMingguan}
      dataBulanan={dataBulanan}
      labMingguan={labMingguan}
      labBulanan={labBulanan}
      sudahLogin={sudahLogin}
      role={role ?? ""}
      tahunBerjalan={tahun}
      mingguBerjalan={mingguBerjalan}
      bulanBerjalan={bulanBerjalan}
      wilkerParam={wilker}
      hasilAI={hasilAI}
    />
  );
}