import {
  getRingkasanVektorTikus,
  getRingkasanVektorTikusBulanan,
  getWilkerRef,
  getUjiLabVektorTikusMingguan,
  getUjiLabVektorTikusBulanan,
} from "@/lib/supabase/queries";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { getMingguEpidSaatIni } from "@/lib/epi-week";
import VektorTikusClient from "./VektorTikusClient";
import { getBanyakHasilAI } from "@/lib/ai/getBanyakHasilAI";
import type { PermintaanHasilAI } from "@/lib/ai/hasilAiTypes";

export default async function VektorTikusPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  const { wilker, tahun: tahunParam } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  // sudahLogin & role dari sumber yang sama dipakai di seluruh project (bukan getUserRole terpisah)
  const { sudahLogin, role } = await getStatusAkses();

  const { tahunEpid, mingguEpid } = getMingguEpidSaatIni();
  const mingguBerjalan = Math.max(1, mingguEpid - 1);
  const bulanBerjalan = new Date().getMonth() + 1; // untuk periodeKey Analisis/Prediksi AI mode Bulanan

  // ============================================================
  // BATCH-FETCH HASIL AI -- beda dengan TPP, periodeKey default di
  // sini murni fungsi tanggal berjalan (tahunEpid/mingguEpid/bulan),
  // TIDAK bergantung pada data hasil query -- jadi bisa digabung ke
  // Promise.all utama di bawah (jalan paralel, tidak menambah waktu
  // tunggu), sama seperti pola di halaman pesawat.
  //
  // Hanya cover state landing awal: toggle periodeType default
  // "mingguan" -- konteks "vektor-tikus-bulanan" TIDAK di-prefetch di
  // sini karena baru kepakai setelah user klik toggle Bulanan (Box
  // akan fallback fetch sendiri saat itu terjadi). Kedua boks lab
  // (tikus-lab-mingguan & tikus-lab-bulanan) SELALU tampil bersamaan
  // apa pun toggle-nya, jadi keduanya di-prefetch penuh.
  // ============================================================
  const wilayahKerjaAI = wilker && wilker !== "semua" ? wilker : undefined;
  const periodeKeyMingguanDefault = `${tahunEpid}-W1_W${mingguBerjalan}`;
  const periodeKeyBulananDefault = `${tahunEpid}-M1_M${bulanBerjalan}`;

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "vektor-tikus-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "vektor-tikus-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
    { konteks: "tikus-lab-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tikus-lab-mingguan", periodeKey: periodeKeyMingguanDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
    { konteks: "tikus-lab-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "analisis" },
    { konteks: "tikus-lab-bulanan", periodeKey: periodeKeyBulananDefault, wilayahKerja: wilayahKerjaAI, tipe: "prediksi" },
  ];

  const [daftarWilker, ringkasanMingguan, ringkasanBulanan, ujiLabMingguan, ujiLabBulanan, hasilAI] =
    await Promise.all([
      getWilkerRef(),
      getRingkasanVektorTikus(tahun, wilker),
      getRingkasanVektorTikusBulanan(tahun, wilker),
      getUjiLabVektorTikusMingguan(tahun, wilker),
      getUjiLabVektorTikusBulanan(tahun, wilker),
      getBanyakHasilAI(permintaanAI),
    ]);

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
      daftarWilker={daftarWilker}
      dataMingguan={dataMingguan}
      dataBulanan={dataBulanan}
      labMingguan={labMingguan}
      labBulanan={labBulanan}
      sudahLogin={sudahLogin}
      role={role ?? ""}
      tahunBerjalan={tahunEpid}
      mingguBerjalan={mingguBerjalan}
      bulanBerjalan={bulanBerjalan}
      wilkerParam={wilker}
      hasilAI={hasilAI}
    />
  );
}