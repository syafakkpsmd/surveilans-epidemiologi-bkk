import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getWilkerRef,
} from "@/lib/supabase/queries";
import {
  getRingkasanPesawatMingguan,
  getRingkasanPesawatBulanan,
} from "@/lib/supabase/queriesPesawat";
import {
  getPenumpangKapalMingguan,
  getPenumpangKapalBulanan,
} from "@/lib/turso/queriesPenumpangKapal";
import {
  getAbkPhqcPerTujuanMingguan,
  getAbkPhqcPerTujuanBulanan,
} from "@/lib/supabase/queriesPhqcTujuan";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import { getBanyakHasilAI, type PermintaanHasilAI } from "@/lib/ai/getBanyakHasilAI";
import AbkCrewPenumpangClient from "./AbkCrewPenumpangClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * jumlahkanPerPeriode
 * ---------------------
 * Menjumlahkan 1 kolom nilai (mis. total_abk) dari banyak baris (yang
 * masing-masing mewakili 1 wilayah_kerja/wilker pada 1 periode),
 * dikelompokkan per nomor periode (minggu_epid atau bulan). Dipakai
 * untuk meratakan data COP/PHQC/Pesawat yang aslinya per-wilayah/
 * wilker jadi 1 angka gabungan per periode.
 */
function jumlahkanPerPeriode(
  rows: Array<Record<string, any>>,
  ambilPeriode: (row: any) => number | undefined | null,
  ambilNilai: (row: any) => number | undefined | null
): Map<number, number> {
  const peta = new Map<number, number>();
  rows.forEach((row) => {
    const periode = ambilPeriode(row);
    if (periode === undefined || periode === null || Number.isNaN(periode)) return;
    const nilai = ambilNilai(row) ?? 0;
    peta.set(periode, (peta.get(periode) ?? 0) + nilai);
  });
  return peta;
}

function ambilPeriodeMingguanPesawat(row: any): number | undefined {
  return row.minggu_epid ?? row.minggu ?? row.minggu_ke ?? undefined;
}
function ambilPeriodeBulananPesawat(row: any): number | undefined {
  if (typeof row.bulan === "number") return row.bulan;
  if (typeof row.bulan === "string" && row.bulan.includes("-")) {
    return parseInt(row.bulan.split("-")[1], 10);
  }
  return row.bulan ? parseInt(row.bulan, 10) : undefined;
}

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export interface TitikGabungan {
  urutan: number;
  label: string;
  name: string;
  abk_kapal: number;
  penumpang_kapal: number;
  crew_pesawat: number;
  penumpang_pesawat: number;
  total: number;
}

function gabungkanEmpatSeri(
  petaAbkKapal: Map<number, number>,
  petaPenumpangKapal: Map<number, number>,
  petaCrewPesawat: Map<number, number>,
  petaPenumpangPesawat: Map<number, number>,
  labelFn: (urutan: number) => string
): TitikGabungan[] {
  const semuaPeriode = new Set<number>([
    ...petaAbkKapal.keys(),
    ...petaPenumpangKapal.keys(),
    ...petaCrewPesawat.keys(),
    ...petaPenumpangPesawat.keys(),
  ]);

  return Array.from(semuaPeriode)
    .sort((a, b) => a - b)
    .map((urutan) => {
      const abk_kapal = petaAbkKapal.get(urutan) ?? 0;
      const penumpang_kapal = petaPenumpangKapal.get(urutan) ?? 0;
      const crew_pesawat = petaCrewPesawat.get(urutan) ?? 0;
      const penumpang_pesawat = petaPenumpangPesawat.get(urutan) ?? 0;
      const label = labelFn(urutan);
      return {
        urutan,
        label,
        name: label,
        abk_kapal,
        penumpang_kapal,
        crew_pesawat,
        penumpang_pesawat,
        total: abk_kapal + penumpang_kapal + crew_pesawat + penumpang_pesawat,
      };
    });
}

/**
 * Titik untuk grafik breakdown Luar Negeri vs Dalam Negeri. Selain 2 angka
 * hasil (luar_negeri, dalam_negeri), tiap titik membawa nilai PER SUMBER DATA
 * supaya client bisa menghitung ulang kedua batang sesuai sumber yang dicentang.
 */
export interface TitikLuarDalamNegeri {
  urutan: number;
  label: string;
  name: string;
  luar_negeri: number;
  dalam_negeri: number;
  abk_cop: number; // ABK Kapal COP (kedatangan, Luar Negeri)
  abk_phqc_luar: number; // ABK Kapal PHQC tujuan Luar Negeri (keberangkatan)
  abk_phqc_dalam: number; // ABK Kapal PHQC tujuan Dalam Negeri
  penumpang_kapal: number;
  crew_pesawat: number;
  penumpang_pesawat: number;
}

interface SumberLuarDalam {
  abkCop: Map<number, number>;
  abkPhqcLuar: Map<number, number>;
  abkPhqcDalam: Map<number, number>;
  penumpangKapal: Map<number, number>;
  crewPesawat: Map<number, number>;
  penumpangPesawat: Map<number, number>;
}

/**
 * arah "datang": Luar Negeri = ABK COP.
 * arah "berangkat": Luar Negeri = ABK PHQC tujuan Luar Negeri.
 * Dalam Negeri (kedua arah) = ABK PHQC Dalam Negeri + Penumpang Kapal + Crew + Penumpang Pesawat.
 */
function gabungkanLuarDalamPerSumber(
  sumber: SumberLuarDalam,
  arah: "datang" | "berangkat",
  labelFn: (urutan: number) => string
): TitikLuarDalamNegeri[] {
  const semuaPeriode = new Set<number>();
  (Object.values(sumber) as Map<number, number>[]).forEach((peta) =>
    peta.forEach((_nilai, urutan) => semuaPeriode.add(urutan))
  );

  return Array.from(semuaPeriode)
    .sort((a, b) => a - b)
    .map((urutan) => {
      const label = labelFn(urutan);
      const abk_cop = sumber.abkCop.get(urutan) ?? 0;
      const abk_phqc_luar = sumber.abkPhqcLuar.get(urutan) ?? 0;
      const abk_phqc_dalam = sumber.abkPhqcDalam.get(urutan) ?? 0;
      const penumpang_kapal = sumber.penumpangKapal.get(urutan) ?? 0;
      const crew_pesawat = sumber.crewPesawat.get(urutan) ?? 0;
      const penumpang_pesawat = sumber.penumpangPesawat.get(urutan) ?? 0;
      return {
        urutan,
        label,
        name: label,
        luar_negeri: arah === "datang" ? abk_cop : abk_phqc_luar,
        dalam_negeri: abk_phqc_dalam + penumpang_kapal + crew_pesawat + penumpang_pesawat,
        abk_cop,
        abk_phqc_luar,
        abk_phqc_dalam,
        penumpang_kapal,
        crew_pesawat,
        penumpang_pesawat,
      };
    });
}

/** "Pelabuhan Tanjung Santan" -> "tanjungsantan" (dibandingkan dgn enum Wilayah "TanjungSantan"). */
function normalisasiNamaWilker(nama: string): string {
  return nama.replace(/^(pelabuhan|bandara)\s+/i, "").replace(/\s+/g, "").toLowerCase();
}

export default async function AbkCrewPenumpangPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string }>;
}) {
  const { wilker: wilkerParam } = await searchParams;
  const { sudahLogin, role } = await getStatusAkses();
  const roleAI = role === "admin" || role === "petugas" ? role : null;

  const sekarang = new Date();
  const { tahunEpid, mingguEpid: mingguEpidRaw } = hitungMingguEpidemiologi(sekarang);
  const mingguEpidBerjalan = mingguEpidRaw - 1 > 0 ? mingguEpidRaw - 1 : 1;
  const tahunKalender = sekarang.getFullYear();
  const bulanBerjalan = sekarang.getMonth() + 1;

  // ============================================================
  // Dashboard ini menggabungkan beberapa sumber data (COP, PHQC, Pesawat,
  // Penumpang Kapal di Turso) dan TIDAK punya konsep 1 wilayah kerja
  // tunggal -- jadi datanya SELALU dijumlahkan lintas semua wilayah/wilker.
  //
  // Breakdown Luar Negeri vs Dalam Negeri (grafik baru) memakai kolom
  // tujuan_berlayar di kegiatan_phqc (PHQC). Ini TIDAK mengubah angka
  // "Total Kedatangan"/"Total Keberangkatan" yang sudah ada -- itu tetap
  // dihitung sama seperti sebelumnya. Untuk kedatangan, PHQC tidak punya
  // data arah datang (PHQC cuma keberangkatan), jadi angka ABK PHQC
  // "Dalam Negeri" dipakai ulang sebagai proksi ABK Dalam Negeri yang
  // datang juga (sesuai arahan pengguna), TANPA menambah "Total Kedatangan".
  // ============================================================
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: "abk-crew-penumpang-kedatangan-mingguan", periodeKey: `${tahunEpid}-W${mingguEpidBerjalan}`, tipe: "analisis" },
    { konteks: "abk-crew-penumpang-kedatangan-mingguan", periodeKey: `${tahunEpid}-W${mingguEpidBerjalan}`, tipe: "prediksi" },
    { konteks: "abk-crew-penumpang-kedatangan-bulanan", periodeKey: `${tahunKalender}-${bulanBerjalan}`, tipe: "analisis" },
    { konteks: "abk-crew-penumpang-kedatangan-bulanan", periodeKey: `${tahunKalender}-${bulanBerjalan}`, tipe: "prediksi" },
    { konteks: "abk-crew-penumpang-keberangkatan-mingguan", periodeKey: `${tahunEpid}-W${mingguEpidBerjalan}`, tipe: "analisis" },
    { konteks: "abk-crew-penumpang-keberangkatan-mingguan", periodeKey: `${tahunEpid}-W${mingguEpidBerjalan}`, tipe: "prediksi" },
    { konteks: "abk-crew-penumpang-keberangkatan-bulanan", periodeKey: `${tahunKalender}-${bulanBerjalan}`, tipe: "analisis" },
    { konteks: "abk-crew-penumpang-keberangkatan-bulanan", periodeKey: `${tahunKalender}-${bulanBerjalan}`, tipe: "prediksi" },
  ];

  // ---- FILTER WILAYAH KERJA (?wilker=WK01..WK07) ----
  // Kode wilker divalidasi ke wilker_ref, lalu diterjemahkan ke nilai yang
  // dipakai tiap sumber: Pesawat pakai kode_wilker langsung; COP/PHQC/Turso
  // pakai nama wilayah tanpa spasi (mis. "TanjungSantan").
  const daftarWilker = await getWilkerRef();
  const wilkerTerpilih = wilkerParam ? daftarWilker.find((w) => w.kode === wilkerParam) : undefined;
  const kodeWilker = wilkerTerpilih?.kode;
  const namaWilayah = wilkerTerpilih
    ? wilkerTerpilih.nama.replace(/^(pelabuhan|bandara)\s+/i, "").replace(/\s+/g, "")
    : undefined;
  const cocokWilayah = (r: { wilayah_kerja?: string | null }) =>
    !namaWilayah || normalisasiNamaWilker(String(r.wilayah_kerja ?? "")) === normalisasiNamaWilker(namaWilayah);

  const [
    ringkasanCopMingguanSemua,
    ringkasanCopBulananSemua,
    ringkasanPhqcMingguanSemua,
    ringkasanPhqcBulananSemua,
    ringkasanPesawatMingguan,
    ringkasanPesawatBulanan,
    penumpangKapalMingguan,
    penumpangKapalBulanan,
    abkPhqcTujuanMingguan,
    abkPhqcTujuanBulanan,
    hasilAI,
  ] = await Promise.all([
    getRingkasanMingguan("cop", tahunEpid),
    getRingkasanBulanan("cop", tahunKalender),
    getRingkasanMingguan("phqc", tahunEpid),
    getRingkasanBulanan("phqc", tahunKalender),
    getRingkasanPesawatMingguan({ tahun: tahunEpid, kodeWilker }),
    getRingkasanPesawatBulanan({ tahun: tahunKalender, kodeWilker }),
    getPenumpangKapalMingguan(tahunEpid, namaWilayah),
    getPenumpangKapalBulanan(tahunKalender, namaWilayah),
    getAbkPhqcPerTujuanMingguan(tahunEpid, namaWilayah),
    getAbkPhqcPerTujuanBulanan(tahunKalender, namaWilayah),
    getBanyakHasilAI(permintaanAI),
  ]);

  // View COP/PHQC sudah per wilayah_kerja -> cukup disaring di sini.
  const ringkasanCopMingguan = ringkasanCopMingguanSemua.filter(cocokWilayah);
  const ringkasanCopBulanan = ringkasanCopBulananSemua.filter(cocokWilayah);
  const ringkasanPhqcMingguan = ringkasanPhqcMingguanSemua.filter(cocokWilayah);
  const ringkasanPhqcBulanan = ringkasanPhqcBulananSemua.filter(cocokWilayah);

  // ---- Peta komponen mingguan/bulanan yang dipakai ulang untuk total DAN breakdown ----
  const petaAbkCopMingguan = jumlahkanPerPeriode(ringkasanCopMingguan, (r) => r.minggu_epid, (r) => r.total_abk);
  const petaAbkCopBulanan = jumlahkanPerPeriode(ringkasanCopBulanan, (r) => r.bulan, (r) => r.total_abk);
  const petaAbkPhqcMingguan = jumlahkanPerPeriode(ringkasanPhqcMingguan, (r) => r.minggu_epid, (r) => r.total_abk);
  const petaAbkPhqcBulanan = jumlahkanPerPeriode(ringkasanPhqcBulanan, (r) => r.bulan, (r) => r.total_abk);
  const petaCrewDatangMingguan = jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.crew_datang);
  const petaCrewDatangBulanan = jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.crew_datang);
  const petaPenumpangPesawatDatangMingguan = jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.penumpang_datang);
  const petaPenumpangPesawatDatangBulanan = jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.penumpang_datang);
  const petaCrewBerangkatMingguan = jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.crew_berangkat);
  const petaCrewBerangkatBulanan = jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.crew_berangkat);
  const petaPenumpangPesawatBerangkatMingguan = jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.penumpang_berangkat);
  const petaPenumpangPesawatBerangkatBulanan = jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.penumpang_berangkat);

  // ---- KEDATANGAN: ABK Kapal (COP) + Penumpang Kapal (Turso) + Crew & Penumpang Pesawat Datang ----
  const mingguanKedatangan = gabungkanEmpatSeri(
    petaAbkCopMingguan,
    penumpangKapalMingguan.petaDatang,
    petaCrewDatangMingguan,
    petaPenumpangPesawatDatangMingguan,
    (u) => `Mg ${u}`
  );
  const bulananKedatangan = gabungkanEmpatSeri(
    petaAbkCopBulanan,
    penumpangKapalBulanan.petaDatang,
    petaCrewDatangBulanan,
    petaPenumpangPesawatDatangBulanan,
    (u) => NAMA_BULAN[u - 1] ?? `Bln ${u}`
  );

  // ---- KEBERANGKATAN: ABK Kapal (PHQC) + Penumpang Kapal (Turso) + Crew & Penumpang Pesawat Berangkat ----
  const mingguanKeberangkatan = gabungkanEmpatSeri(
    petaAbkPhqcMingguan,
    penumpangKapalMingguan.petaBerangkat,
    petaCrewBerangkatMingguan,
    petaPenumpangPesawatBerangkatMingguan,
    (u) => `Mg ${u}`
  );
  const bulananKeberangkatan = gabungkanEmpatSeri(
    petaAbkPhqcBulanan,
    penumpangKapalBulanan.petaBerangkat,
    petaCrewBerangkatBulanan,
    petaPenumpangPesawatBerangkatBulanan,
    (u) => NAMA_BULAN[u - 1] ?? `Bln ${u}`
  );

  // ---- BREAKDOWN KEDATANGAN Luar Negeri vs Dalam Negeri ----
  // Luar Negeri = ABK COP. Dalam Negeri = ABK PHQC "Dalam Negeri" (dipakai ulang,
  // PHQC tidak punya data arah datang) + Penumpang Kapal Datang + Crew & Penumpang
  // Pesawat Datang. Nilai per sumber ikut dikirim untuk checkbox di client.
  const kosong = new Map<number, number>();
  const mingguanKedatanganLuarDalam = gabungkanLuarDalamPerSumber(
    {
      abkCop: petaAbkCopMingguan,
      abkPhqcLuar: kosong,
      abkPhqcDalam: abkPhqcTujuanMingguan.petaDalamNegeri,
      penumpangKapal: penumpangKapalMingguan.petaDatang,
      crewPesawat: petaCrewDatangMingguan,
      penumpangPesawat: petaPenumpangPesawatDatangMingguan,
    },
    "datang",
    (u) => `Mg ${u}`
  );
  const bulananKedatanganLuarDalam = gabungkanLuarDalamPerSumber(
    {
      abkCop: petaAbkCopBulanan,
      abkPhqcLuar: kosong,
      abkPhqcDalam: abkPhqcTujuanBulanan.petaDalamNegeri,
      penumpangKapal: penumpangKapalBulanan.petaDatang,
      crewPesawat: petaCrewDatangBulanan,
      penumpangPesawat: petaPenumpangPesawatDatangBulanan,
    },
    "datang",
    (u) => NAMA_BULAN[u - 1] ?? `Bln ${u}`
  );

  // ---- BREAKDOWN KEBERANGKATAN Luar Negeri vs Dalam Negeri ----
  // Luar Negeri = ABK PHQC tujuan "Luar Negeri". Dalam Negeri = ABK PHQC "Dalam
  // Negeri" + Penumpang Kapal Berangkat + Crew & Penumpang Pesawat Berangkat.
  const mingguanKeberangkatanLuarDalam = gabungkanLuarDalamPerSumber(
    {
      abkCop: kosong,
      abkPhqcLuar: abkPhqcTujuanMingguan.petaLuarNegeri,
      abkPhqcDalam: abkPhqcTujuanMingguan.petaDalamNegeri,
      penumpangKapal: penumpangKapalMingguan.petaBerangkat,
      crewPesawat: petaCrewBerangkatMingguan,
      penumpangPesawat: petaPenumpangPesawatBerangkatMingguan,
    },
    "berangkat",
    (u) => `Mg ${u}`
  );
  const bulananKeberangkatanLuarDalam = gabungkanLuarDalamPerSumber(
    {
      abkCop: kosong,
      abkPhqcLuar: abkPhqcTujuanBulanan.petaLuarNegeri,
      abkPhqcDalam: abkPhqcTujuanBulanan.petaDalamNegeri,
      penumpangKapal: penumpangKapalBulanan.petaBerangkat,
      crewPesawat: petaCrewBerangkatBulanan,
      penumpangPesawat: petaPenumpangPesawatBerangkatBulanan,
    },
    "berangkat",
    (u) => NAMA_BULAN[u - 1] ?? `Bln ${u}`
  );

  return (
    <AbkCrewPenumpangClient
      role={roleAI}
      sudahLogin={sudahLogin}
      tahunEpid={tahunEpid}
      tahunKalender={tahunKalender}
      mingguEpidBerjalan={mingguEpidBerjalan}
      bulanBerjalan={bulanBerjalan}
      mingguanKedatangan={mingguanKedatangan}
      bulananKedatangan={bulananKedatangan}
      mingguanKeberangkatan={mingguanKeberangkatan}
      bulananKeberangkatan={bulananKeberangkatan}
      mingguanKedatanganLuarDalam={mingguanKedatanganLuarDalam}
      bulananKedatanganLuarDalam={bulananKedatanganLuarDalam}
      mingguanKeberangkatanLuarDalam={mingguanKeberangkatanLuarDalam}
      bulananKeberangkatanLuarDalam={bulananKeberangkatanLuarDalam}
      hasilAI={hasilAI}
      daftarWilker={daftarWilker}
      namaWilkerTerpilih={wilkerTerpilih?.nama ?? null}
    />
  );
}