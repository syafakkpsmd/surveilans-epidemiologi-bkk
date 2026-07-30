import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
} from "@/lib/supabase/queries";
import {
  getRingkasanPesawatMingguan,
  getRingkasanPesawatBulanan,
} from "@/lib/supabase/queriesPesawat";
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

/**
 * ambilPeriodeMingguanPesawat / ambilPeriodeBulananPesawat
 * -----------------------------------------------------------
 * ASUMSI nama kolom periode di baris hasil getRingkasanPesawatMingguan/
 * Bulanan -- karena saya belum lihat isi queriesPesawat.ts. Mingguan
 * diasumsikan `minggu_epid` (konvensi yang sama seperti COP/PHQC),
 * dengan fallback ke `minggu`/`minggu_ke`. Bulanan sudah PASTI `bulan`
 * (dikonfirmasi dari tambahLabelBulan() yang sudah dipakai di halaman
 * Pesawat sebelumnya). Kalau grafik Pesawat di dashboard ini kosong,
 * kemungkinan besar asumsi mingguan ini yang salah -- kirim
 * queriesPesawat.ts untuk diperbaiki.
 */
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

export default async function AbkCrewPenumpangPage() {
  const { sudahLogin, role } = await getStatusAkses();
  const roleAI = role === "admin" || role === "petugas" ? role : null;

  const sekarang = new Date();
  const { tahunEpid, mingguEpid: mingguEpidRaw } = hitungMingguEpidemiologi(sekarang);
  const mingguEpidBerjalan = mingguEpidRaw - 1 > 0 ? mingguEpidRaw - 1 : 1;
  const tahunKalender = sekarang.getFullYear();
  const bulanBerjalan = sekarang.getMonth() + 1;

  // ============================================================
  // Dashboard ini WALAUPUN menggabungkan 3 sumber data (COP, PHQC,
  // Pesawat) TIDAK punya konsep 1 wilayah kerja tunggal -- COP/PHQC
  // pakai 6 pelabuhan, Pesawat pakai bandara -- jadi datanya SELALU
  // dijumlahkan lintas semua wilayah/wilker (bukan difilter per satu
  // wilker). Karena itu wajibWilayahKerja={false} di semua Box AI
  // (sama pola dengan modul Global Emerging yang juga tidak berbasis
  // wilayah kerja).
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

  const [
    ringkasanCopMingguan,
    ringkasanCopBulanan,
    ringkasanPhqcMingguan,
    ringkasanPhqcBulanan,
    ringkasanPesawatMingguan,
    ringkasanPesawatBulanan,
    hasilAI,
  ] = await Promise.all([
    getRingkasanMingguan("cop", tahunEpid),
    getRingkasanBulanan("cop", tahunKalender),
    getRingkasanMingguan("phqc", tahunEpid),
    getRingkasanBulanan("phqc", tahunKalender),
    getRingkasanPesawatMingguan({ tahun: tahunEpid }),
    getRingkasanPesawatBulanan({ tahun: tahunKalender }),
    getBanyakHasilAI(permintaanAI),
  ]);

  // ---- KEDATANGAN: ABK Kapal (COP) + Penumpang Kapal (selalu 0, lihat
  // catatan Asumsi 1 di atas file) + Crew & Penumpang Pesawat Datang ----
  const mingguanKedatangan = gabungkanEmpatSeri(
    jumlahkanPerPeriode(ringkasanCopMingguan, (r) => r.minggu_epid, (r) => r.total_abk),
    new Map(), // penumpang kapal kedatangan -- tidak ada data, lihat Asumsi 1
    jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.crew_datang),
    jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.penumpang_datang),
    (u) => `Mg ${u}`
  );
  const bulananKedatangan = gabungkanEmpatSeri(
    jumlahkanPerPeriode(ringkasanCopBulanan, (r) => r.bulan, (r) => r.total_abk),
    new Map(),
    jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.crew_datang),
    jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.penumpang_datang),
    (u) => NAMA_BULAN[u - 1] ?? `Bln ${u}`
  );

  // ---- KEBERANGKATAN: ABK Kapal (PHQC) + Penumpang Kapal (PHQC) +
  // Crew & Penumpang Pesawat Berangkat ----
  const mingguanKeberangkatan = gabungkanEmpatSeri(
    jumlahkanPerPeriode(ringkasanPhqcMingguan, (r) => r.minggu_epid, (r) => r.total_abk),
    jumlahkanPerPeriode(ringkasanPhqcMingguan, (r) => r.minggu_epid, (r: any) => r.total_penumpang),
    jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.crew_berangkat),
    jumlahkanPerPeriode(ringkasanPesawatMingguan, ambilPeriodeMingguanPesawat, (r) => r.penumpang_berangkat),
    (u) => `Mg ${u}`
  );
  const bulananKeberangkatan = gabungkanEmpatSeri(
    jumlahkanPerPeriode(ringkasanPhqcBulanan, (r) => r.bulan, (r) => r.total_abk),
    jumlahkanPerPeriode(ringkasanPhqcBulanan, (r) => r.bulan, (r: any) => r.total_penumpang),
    jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.crew_berangkat),
    jumlahkanPerPeriode(ringkasanPesawatBulanan, ambilPeriodeBulananPesawat, (r) => r.penumpang_berangkat),
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
      hasilAI={hasilAI}
    />
  );
}