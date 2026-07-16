import { getRingkasanVektorTikus, getRingkasanVektorTikusBulanan, getWilkerRef } from "@/lib/supabase/queries";
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

  const [role, daftarWilker, ringkasanMingguan, ringkasanBulanan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanVektorTikus(tahun, wilker),
    getRingkasanVektorTikusBulanan(tahun, wilker),
  ]);

  const { tahunEpid, mingguEpid } = getMingguEpidSaatIni();

  const dataMingguan = ringkasanMingguan.map((r: any) => ({
    minggu_epid: r.minggu_epid || 0,
    kode_wilker: wilker || "semua",
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
    kode_wilker: wilker || "semua",
    jml_trap_dipasang: r.jml_trap_dipasang || 0,
    jml_trap_tertangkap: r.jml_trap_tertangkap || 0,
    tsi: r.tsi_rerata ?? 0,
    index_pinjal: r.index_pinjal_rerata ?? 0,
    rt: r.rt || 0,
    rn: r.rn || 0,
    mm: r.mm || 0,
    jenis_lainnya: r.jenis_lainnya || 0,
  }));

  return (
    <VektorTikusClient
      daftarWilker={daftarWilker}
      dataMingguan={dataMingguan}
      dataBulanan={dataBulanan}
      role={getValidRole(role)}
      tahunBerjalan={tahunEpid}
      mingguBerjalan={mingguEpid}
      wilkerParam={wilker}
    />
  );
}