import {
  getRingkasanVektorTikus,
  getRingkasanVektorTikusBulanan,
  getWilkerRef,
  getUjiLabVektorTikusMingguan,
  getUjiLabVektorTikusBulanan,
} from "@/lib/supabase/queries";
import { getUserRole } from "@/lib/auth/get-user-role";
import { getMingguEpidSaatIni } from "@/lib/epi-week";
import { getValidRole } from "@/lib/auth/utils";
import VektorTikusClient from "./VektorTikusClient";

export default async function VektorTikusPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasanMingguan, ringkasanBulanan, ujiLabMingguan, ujiLabBulanan] =
    await Promise.all([
      getUserRole(),
      getWilkerRef(),
      getRingkasanVektorTikus(tahun, wilker),
      getRingkasanVektorTikusBulanan(tahun, wilker),
      getUjiLabVektorTikusMingguan(tahun, wilker),
      getUjiLabVektorTikusBulanan(tahun, wilker),
    ]);

  const { tahunEpid, mingguEpid } = getMingguEpidSaatIni();

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

console.log("DEBUG daftarWilker:", daftarWilker);
console.log("DEBUG contoh baris ringkasanMingguan:", ringkasanMingguan[0]);
console.log("DEBUG contoh baris labMingguan:", labMingguan[0]);

  return (
    <VektorTikusClient
      daftarWilker={daftarWilker}
      dataMingguan={dataMingguan}
      dataBulanan={dataBulanan}
      labMingguan={labMingguan}
      labBulanan={labBulanan}
      role={role ?? ""}
      tahunBerjalan={tahunEpid}
      mingguBerjalan={mingguEpid}
      wilkerParam={wilker}
    />
  );
}