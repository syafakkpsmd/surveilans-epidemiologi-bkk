import {
  getRingkasanTppBulanan,
  getRingkasanTppMingguan,
  getDaftarWilayahKerjaSanitasi,
  getDetailPemeriksaanTpp,
} from "@/lib/supabase/queries";
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
    getDaftarWilayahKerjaSanitasi(),
    getRingkasanTppBulanan(tahun, wilayah),
    getRingkasanTppMingguan(tahun, wilayah),
    getDetailPemeriksaanTpp(tahun, wilayah),
  ]);

  const bulanBerjalan = new Date().getMonth() + 1;

  // Untuk TAMPILAN saja: minggu epid dimundurkan 1 minggu dari minggu
  // berjalan sebenarnya. Sengaja TIDAK memakai getMingguEpidSaatIni()
  // dari lib/epi-week.ts supaya fungsi yang sinkron dengan SQL
  // mmwr_week (dipakai view Supabase) tidak ikut berubah. Digeser
  // lewat tanggal (bukan `mingguEpid - 1` manual) supaya pergantian
  // tahun & minggu ke-52/53 tetap ditangani benar oleh logika yang
  // sama seperti fungsi intinya.
  const tanggalMundurSatuMinggu = new Date();
  tanggalMundurSatuMinggu.setDate(tanggalMundurSatuMinggu.getDate() - 7);
  const { tahunEpid: tahunEpidBerjalan, mingguEpid: mingguEpidBerjalan } =
    hitungMingguEpidemiologi(tanggalMundurSatuMinggu);

  // ============================================================
  // BATCH-FETCH HASIL AI (state AWAL saja) -- meniru pola halaman
  // pesawat, TAPI granularitas/wilayah di TPP adalah state CLIENT
  // (toggle mingguan/bulanan, dropdown wilayah), bukan searchParams.
  // Server tidak tahu kombinasi apa yang akan dipilih user setelah
  // halaman dimuat -- jadi di sini kita hanya prefetch untuk state
  // default saat landing pertama kali (granularitas "mingguan",
  // wilayah = dari URL atau "semua", periode = minggu/bulan terakhir
  // yang tersedia di data -- SAMA seperti default appliedMingguAkhir/
  // appliedBulanAkhir di TppClient).
  //
  // Begitu user ganti granularitas/wilayah/rentang di client, kunci
  // yang dicari TppClient tidak lagi cocok dengan yang di-prefetch
  // di sini -- Box otomatis fallback fetch sendiri (perilaku bawaan
  // BoxAnalisisAI/BoxPrediksiAI lewat hasilAwal undefined). Ini
  // trade-off yang disengaja: request pertama page load selalu cepat,
  // interaksi berikutnya tetap seperti sebelumnya (fetch GET biasa).
  //
  // Karena periode default bergantung pada dataMingguan/dataBulanan,
  // pemanggilan ini HARUS setelah Promise.all data utama di atas --
  // tidak bisa digabung sekaligus seperti di halaman pesawat.
  // ============================================================
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
      hasilAI={hasilAI}
    />
  );
}