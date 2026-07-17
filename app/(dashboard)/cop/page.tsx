import { FilterPeriodeWilayah } from "@/components/FilterPeriodeWilayah";
import { TrenChartGanda } from "@/components/TrenChartGanda";
import { DonutRba } from "@/components/cop/DonutRba";
import { RbaBarBulanan, type DataRbaBulanan } from "@/components/cop/RbaBarBulanan";
import { TrenPerWilkerChart, type SeriesWilker } from "@/components/cop/TrenPerWilkerChart";
import { TrenNegaraChart, type SeriesNegara } from "@/components/cop/TrenNegaraChart";
import { generateWarnaNegara } from "@/lib/warnaNegara";
import { PieBreakdown } from "@/components/cop/PieBreakdown";
import { DaftarNegaraKedatangan } from "@/components/cop/DaftarNegaraKedatangan";
import { PanelAnalisisAI } from "@/components/cop/PanelAnalisisAI";
import { BreakdownCard } from "@/components/BreakdownCard";
import { TombolAnalisisAI } from "@/components/TombolAnalisisAI";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import {
  getRingkasanMingguan,
  getRingkasanBulanan,
  getKategoriBreakdown,
  getKegiatanCopEnriched,
} from "@/lib/supabase/queries";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";
import type { Wilayah, KategoriCop, KegiatanCopEnriched, RingkasanMingguanCop, RingkasanBulananCop } from "@/types/database.types";
import PetaNegaraKedatangan from "@/components/cop/PetaNegaraKedatanganClient";

/**
 * resolveWarnaRba
 * ----------------
 * Dipakai HANYA untuk mewarnai teks RBA di tabel "Data Mentah" paling
 * bawah halaman (bukan untuk chart/donut -- itu urusan DonutRba.tsx).
 * Mengenali 2 konvensi teks RBA: kode warna ("Hijau"/"Kuning"/"Merah")
 * atau label deskriptif ("Risiko Rendah"/"Sedang"/"Tinggi").
 */
function resolveWarnaRba(nilai: string): string {
  const n = nilai.toLowerCase();
  if (n.includes("tinggi") || n === "merah") return "var(--color-risiko-merah)";
  if (n.includes("sedang") || n === "kuning") return "var(--color-risiko-kuning)";
  if (n.includes("rendah") || n === "hijau") return "var(--color-risiko-hijau)";
  return "var(--color-muted)";
}

/**
 * normalisasiRba
 * ---------------
 * Mengelompokkan nilai RBA (apa pun konvensi teksnya) ke 1 dari 4
 * kategori kanonik. Dipakai KHUSUS saat membangun data bar chart
 * RBA bulanan (RbaBarBulanan) di bagian bawah -- karena chart itu
 * butuh 4 kolom angka tetap (risikoTinggi/Sedang/Rendah/TidakDiisi),
 * bukan daftar dinamis seperti kategoriData biasa.
 */
function normalisasiRba(nilai: string): "Risiko Tinggi" | "Risiko Sedang" | "Risiko Rendah" | "Tidak Diisi" {
  const n = nilai.toLowerCase();
  if (n.includes("tinggi") || n === "merah") return "Risiko Tinggi";
  if (n.includes("sedang") || n === "kuning") return "Risiko Sedang";
  if (n.includes("rendah") || n === "hijau") return "Risiko Rendah";
  return "Tidak Diisi";
}

/**
 * normalisasiNilaiKategori
 * -------------------------
 * Menyamakan CASING nilai kategori sebelum dijumlahkan, supaya
 * "China", "CHINA", "china" dianggap 1 nilai yang sama (bukan 3 baris
 * terpisah). Dipakai sebagai KEY saat mengelompokkan di Map, sekaligus
 * jadi label tampilan (Title Case). Berlaku untuk SEMUA kategori
 * (Negara Kedatangan, Bendera Kapal, RBA, dll), bukan cuma negara.
 */
function normalisasiNilaiKategori(nilai: string): string {
  const dibersihkan = nilai.trim();
  if (!dibersihkan) return dibersihkan;
  return dibersihkan
    .toLowerCase()
    .split(" ")
    .map((kata) => (kata ? kata.charAt(0).toUpperCase() + kata.slice(1) : kata))
    .join(" ");
}

function getWarnaWilayah(wilayah: string): string {
  const palet: Record<string, string> = {
    "Samarinda": "#D62839",    // Teal gelap
    "TanjungSantan": "#2F9E44", // Hijau
    "TanjungLaut": "rgb(145, 2, 240)",   // Kuning/Oranye
    "Lhoktuan": "#0F4C5C",      // Merah
    "Sangatta": "#0f24e3",      // Ungu
    "Sangkulirang": "rgb(234, 212, 12)",  // Oranye terang
  };
  return palet[wilayah] || "#64748b"; // Warna default abu-abu jika tidak ditemukan
}

/**
 * KATEGORI_LIST
 * --------------
 * Daftar SEMUA kategori breakdown yang mau ditampilkan (tiap kategori
 * jadi 1 kartu di halaman). TAMBAH KATEGORI BARU: tinggal tambah 1
 * baris di sini (key harus sesuai nilai kolom `kategori` di view SQL
 * view_mingguan_kategori / view_bulanan_kategori), lalu render
 * `kategoriData.<key>` di JSX sesuai kebutuhan (list, pie, atau
 * bentuk lain).
 */
const KATEGORI_LIST: { key: KategoriCop; label: string }[] = [
  { key: "negara_kedatangan", label: "Negara Kedatangan" },
  { key: "rba", label: "RBA (Risk Based Assessment)" },
  { key: "faktor_risiko", label: "Faktor Risiko" },
  { key: "kelengkapan_dokumen", label: "Kelengkapan Dokumen" },
  { key: "daerah_terjangkit", label: "Daerah Terjangkit" },
  { key: "keberadaan_vektor", label: "Keberadaan Vektor" },
  { key: "bendera_kapal", label: "Bendera Kapal" },
];

/**
 * DAFTAR_WILAYAH & WILAYAH_URUTAN
 * ---------------------------------
 * Urutan tetap 6 wilayah kerja COP (TIDAK termasuk Bandara APT
 * Pranoto -- itu wilker khusus modul Alat Angkut Pesawat).
 * TAMBAH WILAYAH BARU: tambah nama di sini, lalu tambah 1 warna baru
 * yang senada di PALET_WILAYAH (harus urutannya sinkron/sejajar).
 */
const DAFTAR_WILAYAH: Wilayah[] = [
  "Samarinda",
  "TanjungSantan",
  "TanjungLaut",
  "Lhoktuan",
  "Sangatta",
  "Sangkulirang",
];
const WILAYAH_URUTAN = DAFTAR_WILAYAH;

/** Warna garis per wilayah di TrenPerWilkerChart -- urutannya SEJAJAR dengan WILAYAH_URUTAN. */
const PALET_WILAYAH = ["#0F4C5C", "#2F9E44", "#F0A202", "#D62839", "#7C3AED", "#EA580C"];

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * validasiWilayah
 * ----------------
 * Memastikan nilai `?wilayah=` dari URL itu benar-benar salah satu
 * dari 6 wilayah yang valid. Kalau tidak dikenali (typo, wilayah lama
 * yang sudah dihapus, dll), fallback ke "Semua" supaya halaman tidak
 * error/kosong.
 */
function validasiWilayah(nilai: string | undefined): Wilayah | "Semua" {
  if (nilai && (DAFTAR_WILAYAH as string[]).includes(nilai)) return nilai as Wilayah;
  return "Semua";
}

interface TitikTrenCop {
  label: string;
  urutan: number;
  jumlah_kapal: number;
  total_abk: number;
  total_abk_wna: number;
  total_abk_wni: number;
  [key: string]: string | number;
}

/**
 * CopPage (Server Component)
 * ----------------------------
 * Halaman utama Dashboard Kegiatan COP. Urutan section dari atas ke
 * bawah (SEMUA section independen -- boleh dihapus/dipindah tanpa
 * merusak section lain, kecuali disebutkan sebaliknya):
 *
 *   1. Header + tombol Analisis AI
 *   2. Filter mode (Mingguan/Bulanan) + wilayah
 *   3. Kartu Ringkasan Total (kapal & ABK, keseluruhan + per wilayah)
 *      -- SELALU pakai data mingguan tahun berjalan, TIDAK terpengaruh
 *      filter wilayah/mode di atas (supaya angkanya stabil jadi acuan).
 *   4. Chart perbandingan antar wilayah (mingguan, checkbox toggle)
 *      -- SELALU mingguan juga, sama seperti section 3.
 *   5. Tren Mingguan/Bulanan gabungan (INI YANG mengikuti filter mode+wilayah)
 *   6. RBA (2 donut kalau mingguan, 1 bar chart kalau bulanan)
 *   7. Negara Kedatangan
 *   8. Daerah Terjangkit + Keberadaan Vektor
 *   9. Faktor Risiko + Kelengkapan Dokumen
 *  10. Bendera Kapal
 *  11. Tabel Data Mentah (audit/verifikasi)
 */
export default async function CopPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; wilayah?: string }>;
}) {
  const sp = await searchParams;
  const mode: "mingguan" | "bulanan" = sp.mode === "bulanan" ? "bulanan" : "mingguan";
  const wilayah = validasiWilayah(sp.wilayah);

  const { sudahLogin, role } = await getStatusAkses();

  const sekarang = new Date();
  const { tahunEpid: tahunEpidSaatIni, mingguEpid: mingguEpidSaatIni } =
    hitungMingguEpidemiologi(sekarang);

  const tahun = mode === "mingguan" ? tahunEpidSaatIni : sekarang.getFullYear();

  const periodeKey =
    mode === "mingguan"
      ? `${tahunEpidSaatIni}-W${mingguEpidSaatIni}`
      : `${sekarang.getFullYear()}-${sekarang.getMonth() + 1}`;

  const wilayahKerjaAi = wilayah === "Semua" ? undefined : wilayah;

  let errorMuat: string | null = null;
  let trenData: TitikTrenCop[] = [];
  const kategoriData: Record<KategoriCop, { nilai: string; jumlah: number }[]> = {
    negara_kedatangan: [],
    rba: [],
    faktor_risiko: [],
    kelengkapan_dokumen: [],
    daerah_terjangkit: [],
    keberadaan_vektor: [],
    bendera_kapal: [],
  };
  let dataMentah: KegiatanCopEnriched[] = [];
  let kategoriRbaMingguIni: { nilai: string; jumlah: number }[] = [];
  let dataRbaBulanan: DataRbaBulanan[] = [];
  let trenNegaraData: Array<Record<string, string | number>> = [];
  let seriesNegara: SeriesNegara[] = [];

  /**
   * ringkasanMingguanSemuaWilker
   * ------------------------------
   * SUMBER DATA TUNGGAL untuk Kartu Ringkasan Total (section 3) dan
   * chart perbandingan antar wilayah (section 4). Sengaja SELALU
   * mingguan & SELALU tahun epid berjalan (`tahunEpidSaatIni`),
   * TIDAK memakai variabel `tahun`/`mode` di atas -- supaya angkanya
   * tidak berubah-ubah saat user pindah tab Mingguan/Bulanan atau
   * ganti filter wilayah. Ini best sesuai desain: 2 section itu
   * "berdiri sendiri" di luar filter mode+wilayah.
   */
  let ringkasanMingguanSemuaWilker: RingkasanMingguanCop[] = [];
  let ringkasanBulananSemuaWilker: RingkasanBulananCop[] = [];

  try {
    // Ambil sumber data section 3 & 4 di awal, sebelum cabang mode di bawah.
    // Dijalankan PARALEL (Promise.all) karena dua query ini independen satu
    // sama lain -- sebelumnya berurutan, menambah waktu tunggu tanpa perlu.
    [ringkasanMingguanSemuaWilker, ringkasanBulananSemuaWilker] = await Promise.all([
      getRingkasanMingguan("cop", tahunEpidSaatIni),
      getRingkasanBulanan("cop", sekarang.getFullYear()),
    ]);

    if (mode === "mingguan") {
      const ringkasan = await getRingkasanMingguan("cop", tahun);
      const terfilter =
        wilayah === "Semua" ? ringkasan : ringkasan.filter((r) => r.wilayah_kerja === wilayah);

      const peta = new Map<number, TitikTrenCop>();
      terfilter.forEach((r) => {
        const existing = peta.get(r.minggu_epid) ?? {
          label: `Mg ${r.minggu_epid}`,
          urutan: r.minggu_epid,
          jumlah_kapal: 0,
          total_abk: 0,
          total_abk_wna: 0,
          total_abk_wni: 0,
        };
        existing.jumlah_kapal += r.jumlah_kapal;
        existing.total_abk += r.total_abk;
        existing.total_abk_wna += r.total_abk_wna;
        existing.total_abk_wni += r.total_abk_wni;
        peta.set(r.minggu_epid, existing);
      });
      trenData = Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
    } else {
      const ringkasan = await getRingkasanBulanan("cop", tahun);
      const terfilter =
        wilayah === "Semua" ? ringkasan : ringkasan.filter((r) => r.wilayah_kerja === wilayah);

      const peta = new Map<number, TitikTrenCop>();
      terfilter.forEach((r) => {
        const existing = peta.get(r.bulan) ?? {
          label: NAMA_BULAN[r.bulan - 1],
          urutan: r.bulan,
          jumlah_kapal: 0,
          total_abk: 0,
          total_abk_wna: 0,
          total_abk_wni: 0,
        };
        existing.jumlah_kapal += r.jumlah_kapal;
        existing.total_abk += r.total_abk;
        existing.total_abk_wna += r.total_abk_wna;
        existing.total_abk_wni += r.total_abk_wni;
        peta.set(r.bulan, existing);
      });
      trenData = Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
    }

    // <<<<<<<<<<<<<<< TEMPEL KODE TREN NEGARA DI SINI >>>>>>>>>>>>>>>
    const petaTrenNegara = new Map<number, Record<string, string | number>>();
const totalPerNegara = new Map<string, number>();

if (mode === "mingguan") {
  const rowsNegaraTren = await getKategoriBreakdown("cop", "mingguan", {
    tahun_epid: tahun,
    wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
    kategori: "negara_kedatangan",
  });

  rowsNegaraTren.forEach((r) => {
    const negara = normalisasiNilaiKategori(r.nilai);
    if (!negara) return;
    const urutan = r.minggu_epid;
    const label = `Mg ${urutan}`;
    const existing = petaTrenNegara.get(urutan) ?? { label, urutan };
    existing[negara] = ((existing[negara] as number) ?? 0) + r.jumlah;
    petaTrenNegara.set(urutan, existing);
    totalPerNegara.set(negara, (totalPerNegara.get(negara) ?? 0) + r.jumlah);
  });
} else {
  const rowsNegaraTren = await getKategoriBreakdown("cop", "bulanan", {
    tahun,
    wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
    kategori: "negara_kedatangan",
  });

  rowsNegaraTren.forEach((r) => {
    const negara = normalisasiNilaiKategori(r.nilai);
    if (!negara) return;
    const urutan = r.bulan;
    const label = NAMA_BULAN[urutan - 1];
    const existing = petaTrenNegara.get(urutan) ?? { label, urutan };
    existing[negara] = ((existing[negara] as number) ?? 0) + r.jumlah;
    petaTrenNegara.set(urutan, existing);
    totalPerNegara.set(negara, (totalPerNegara.get(negara) ?? 0) + r.jumlah);
  });
}

trenNegaraData = Array.from(petaTrenNegara.values()).sort(
  (a, b) => (a.urutan as number) - (b.urutan as number)
);

seriesNegara = Array.from(totalPerNegara.entries())
  .sort((a, b) => b[1] - a[1])
  .map(([negara, total], i) => ({
    key: negara,
    label: negara,
    warna: generateWarnaNegara(i),
    total,
  }));
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// Ambil SEMUA kategori di KATEGORI_LIST secara PARALEL (Promise.all),
    // bukan satu-satu berurutan seperti sebelumnya -- ini yang paling
    // besar dampaknya ke waktu loading (7 kategori x 1-2 detik/query
    // berurutan bisa jadi 10-15 detik sendiri kalau tidak diparalelkan).
    const hasilSemuaKategori = await Promise.all(
      KATEGORI_LIST.map((k) =>
        mode === "mingguan"
          ? getKategoriBreakdown("cop", "mingguan", {
              tahun_epid: tahun,
              wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
              kategori: k.key,
            })
          : getKategoriBreakdown("cop", "bulanan", {
              tahun,
              wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
              kategori: k.key,
            })
      )
    );

    KATEGORI_LIST.forEach((k, idx) => {
      const rows = hasilSemuaKategori[idx];
      const peta = new Map<string, number>();
      rows.forEach((r) => {
        const nilaiNormal = normalisasiNilaiKategori(r.nilai);
        peta.set(nilaiNormal, (peta.get(nilaiNormal) ?? 0) + r.jumlah);
      });
      kategoriData[k.key] = Array.from(peta.entries())
        .map(([nilai, jumlah]) => ({ nilai, jumlah }))
        .sort((a, b) => b.jumlah - a.jumlah);
    });

    // Query TAMBAHAN khusus RBA minggu berjalan (mode mingguan saja).
    // Beda dari kategoriData.rba di atas yang totalnya 1 TAHUN penuh.
    if (mode === "mingguan") {
      const rowsMingguIni = await getKategoriBreakdown("cop", "mingguan", {
        tahun_epid: tahun,
        minggu_epid: mingguEpidSaatIni,
        wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
        kategori: "rba",
      });
      const peta = new Map<string, number>();
      rowsMingguIni.forEach((r) => {
        const nilaiNormal = normalisasiNilaiKategori(r.nilai);
        peta.set(nilaiNormal, (peta.get(nilaiNormal) ?? 0) + r.jumlah);
      });
      kategoriRbaMingguIni = Array.from(peta.entries())
        .map(([nilai, jumlah]) => ({ nilai, jumlah }))
        .sort((a, b) => b.jumlah - a.jumlah);
    }

    // Query TAMBAHAN khusus RBA per-bulan (mode bulanan saja), untuk
    // bar chart Jan-Des -- tanpa filter `bulan` supaya dapat semua
    // bulan sekaligus, lalu dikelompokkan manual per bulan di bawah.
    if (mode === "bulanan") {
      const rowsSemuaBulan = await getKategoriBreakdown("cop", "bulanan", {
        tahun,
        wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
        kategori: "rba",
      });

      dataRbaBulanan = NAMA_BULAN.map((label, idx) => {
        const bulanKe = idx + 1;
        const rowsBulanIni = rowsSemuaBulan.filter((r) => r.bulan === bulanKe);

        const agregat: DataRbaBulanan = {
          bulanLabel: label,
          risikoTinggi: 0,
          risikoSedang: 0,
          risikoRendah: 0,
          tidakDiisi: 0,
        };

        rowsBulanIni.forEach((r) => {
          const kategori = normalisasiRba(r.nilai);
          if (kategori === "Risiko Tinggi") agregat.risikoTinggi += r.jumlah;
          else if (kategori === "Risiko Sedang") agregat.risikoSedang += r.jumlah;
          else if (kategori === "Risiko Rendah") agregat.risikoRendah += r.jumlah;
          else agregat.tidakDiisi += r.jumlah;
        });

        return agregat;
      });
    }

    dataMentah = await getKegiatanCopEnriched({
      wilayah_kerja: wilayah === "Semua" ? undefined : wilayah,
      limit: 50,
    });
  } catch (err) {
    errorMuat = err instanceof Error ? err.message : "Gagal mengambil data COP.";
  }

  // ============================================================
  // KARTU RINGKASAN TOTAL (section 3) -- dihitung dari
  // ringkasanMingguanSemuaWilker (SELALU mingguan tahun epid
  // berjalan, tidak ikut filter wilayah/mode di atas).
  // ============================================================
  const totalKapalKeseluruhan = ringkasanMingguanSemuaWilker.reduce((a, r) => a + r.jumlah_kapal, 0);
  const totalAbkKeseluruhan = ringkasanMingguanSemuaWilker.reduce((a, r) => a + r.total_abk, 0);

  const kapalPerWilayah = WILAYAH_URUTAN.map((w) => ({
    wilayah: w,
    jumlah: ringkasanMingguanSemuaWilker
      .filter((r) => r.wilayah_kerja === w)
      .reduce((a, r) => a + r.jumlah_kapal, 0),
  })).sort((a, b) => b.jumlah - a.jumlah); // <-- urut tertinggi ke terendah
  const abkPerWilayah = WILAYAH_URUTAN.map((w) => ({
    wilayah: w,
    jumlah: ringkasanMingguanSemuaWilker
      .filter((r) => r.wilayah_kerja === w)
      .reduce((a, r) => a + r.total_abk, 0),
  })).sort((a, b) => b.jumlah - a.jumlah); // <-- urut tertinggi ke terendah
  const maxKapalPerWilayah = Math.max(1, ...kapalPerWilayah.map((w) => w.jumlah));
  const maxAbkPerWilayah = Math.max(1, ...abkPerWilayah.map((w) => w.jumlah));

  // ============================================================
  // DATA CHART PERBANDINGAN ANTAR WILAYAH (section 4) -- 1 baris
  // per minggu epid, kolomnya = jumlah_kapal per wilayah (dipakai
  // sebagai dataKey oleh TrenPerWilkerChart, 1 kolom = 1 garis).
  // ============================================================
  const petaTrenWilker = new Map<number, Record<string, number | string>>();
  ringkasanMingguanSemuaWilker.forEach((r) => {
    const existing = petaTrenWilker.get(r.minggu_epid) ?? {
      label: `Mg ${r.minggu_epid}`,
      urutan: r.minggu_epid,
    };
    existing[r.wilayah_kerja] = ((existing[r.wilayah_kerja] as number) ?? 0) + r.jumlah_kapal;
    petaTrenWilker.set(r.minggu_epid, existing);
  });
  const dataTrenPerWilker = Array.from(petaTrenWilker.values()).sort(
    (a, b) => (a.urutan as number) - (b.urutan as number)
  );

  const seriesWilker: SeriesWilker[] = WILAYAH_URUTAN.map((w, i) => ({
    key: w,
    label: w,
    warna: PALET_WILAYAH[i],
  }));

// ============================================================
  // DATA CHART PERBANDINGAN ANTAR WILAYAH -- VERSI BULANAN.
  // Sumbernya ringkasanBulananSemuaWilker (tahun kalender berjalan),
  // dikelompokkan per bulan, kolomnya = jumlah_kapal per wilayah --
  // sama persis pola dataTrenPerWilker di atas, cuma per bulan.
  // ============================================================
  const petaTrenWilkerBulanan = new Map<number, Record<string, number | string>>();
  ringkasanBulananSemuaWilker.forEach((r) => {
    const existing = petaTrenWilkerBulanan.get(r.bulan) ?? {
      label: NAMA_BULAN[r.bulan - 1],
      urutan: r.bulan,
    };
    existing[r.wilayah_kerja] = ((existing[r.wilayah_kerja] as number) ?? 0) + r.jumlah_kapal;
    petaTrenWilkerBulanan.set(r.bulan, existing);
  });
  const dataTrenPerWilkerBulanan = Array.from(petaTrenWilkerBulanan.values()).sort(
    (a, b) => (a.urutan as number) - (b.urutan as number)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            BKK Kelas I Samarinda
          </p>
          <h1 className="text-2xl font-bold text-ink">Dashboard Kegiatan COP</h1>
        </div>
        <TombolAnalisisAI
          sudahLogin={sudahLogin}
          role={role}
          konteks={`cop-${mode}`}
          periodeKey={periodeKey}
          wilayahKerja={wilayahKerjaAi}
        />
      </div>

      <FilterPeriodeWilayah mode={mode} wilayah={wilayah} />

      {errorMuat && (
        <div className="rounded-card border border-risiko-merah/30 bg-surface p-6 text-sm text-risiko-merah">
          Gagal memuat data: {errorMuat}
        </div>
      )}

      {!errorMuat && (
        <>
          {/* ============================================================
              SECTION 3 -- KARTU RINGKASAN TOTAL
              TAMBAH KARTU BARU: tinggal duplikasi 1 blok <div> KPI di
              bawah, dan/atau tambah 1 kolom baru di grid breakdown.
             ============================================================ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Total Kapal Keseluruhan (Tahun {tahunEpidSaatIni})
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">{totalKapalKeseluruhan}</p>
            </div>
            <div className="rounded-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Total ABK Keseluruhan (Tahun {tahunEpidSaatIni})
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">{totalAbkKeseluruhan}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Kapal per Wilayah Kerja (Tahun {tahunEpidSaatIni})
              </h2>
              <div className="space-y-3">
                {kapalPerWilayah.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{w.wilayah}</span>
                      <span className="font-semibold text-ink">{w.jumlah}</span>
                    </div>
                    {/* Ganti bagian ini di dalam map kapalPerWilayah */}
                    <div className="h-4 rounded-full bg-slate-200">
                      <div
                        className="h-4 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(w.jumlah / maxKapalPerWilayah) * 100}%`,
                          backgroundColor: getWarnaWilayah(w.wilayah) // Memanggil fungsi warna
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                ABK per Wilayah Kerja (Tahun {tahunEpidSaatIni})
              </h2>
              <div className="space-y-3">
                {abkPerWilayah.map((w) => (
                  <div key={w.wilayah}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{w.wilayah}</span>
                      <span className="font-semibold text-ink">{w.jumlah}</span>
                    </div>
                    
                    {/* Kontainer latar belakang lebih tebal */}
                    <div className="h-4 rounded-full bg-slate-200"> 
                      <div
                        className="h-4 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(w.jumlah / maxAbkPerWilayah) * 100}%`,
                          backgroundColor: getWarnaWilayah(w.wilayah) // Warna otomatis sesuai wilayah
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 4 -- CHART PERBANDINGAN MINGGUAN ANTAR WILAYAH
              Full width, checkbox toggle per wilayah. SELALU mingguan,
              tidak ikut filter mode Mingguan/Bulanan di atas.
             ============================================================ */}
          <div className="rounded-card bg-surface p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">
              Perbandingan Kedatangan Kapal {mode === "mingguan" ? "Mingguan" : "Bulanan"} — 6 Wilayah Kerja
            </h2>
            <p className="mb-4 text-xs text-muted">
              Centang/hilangkan centang untuk membandingkan wilayah tertentu saja.
            </p>
            <TrenPerWilkerChart
              data={mode === "mingguan" ? dataTrenPerWilker : dataTrenPerWilkerBulanan}
              seriesList={seriesWilker}
              tipe={mode === "mingguan" ? "garis" : "batang"}
            />
          </div>

          {/* ============================================================
              SECTION 5 -- TREN GABUNGAN (mengikuti filter mode+wilayah)
             ============================================================ */}
          <div className="rounded-card bg-surface p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
              Tren {mode === "mingguan" ? "Mingguan" : "Bulanan"} Tahun {tahun}
            </h2>
            {trenData.length === 0 ? (
              <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>
            ) : (
              <TrenChartGanda
                data={trenData}
                tipe={mode === "mingguan" ? "garis" : "batang"}
                seriAbk={[
                  { dataKey: "total_abk_wna", nama: "ABK WNA", warna: "#2F9E44" },
                  { dataKey: "total_abk_wni", nama: "ABK WNI", warna: "#5B7083" },
                ]}
                seriKapalTotal={[
                  { dataKey: "total_abk", nama: "Total ABK", warna: "#D97706", sumbu: "kiri" },
                  { dataKey: "jumlah_kapal", nama: "Jumlah Kapal", warna: "#0F4C5C", sumbu: "kanan" },
                ]}
              />
            )}
          </div>

            {/* ============================================================
              SECTION 5B -- TREN NEGARA KEDATANGAN (ikut mode+wilayah,
              sama seperti Section 5 di atas)
             ============================================================ */}
          <div className="rounded-card bg-surface p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">
              Tren {mode === "mingguan" ? "Mingguan" : "Bulanan"} Negara Kedatangan — Tahun {tahun}
            </h2>
            <p className="mb-4 text-xs text-muted">
              Pilih beberapa negara untuk membandingkan, atau 1 negara saja untuk melihat trennya sendiri.
            </p>
            {trenNegaraData.length === 0 ? (
              <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>
            ) : (
              <TrenNegaraChart
  data={trenNegaraData}
  seriesList={seriesNegara}
  tipe={mode === "mingguan" ? "garis" : "batang"}
/>
            )}
          </div>

          {/* ============================================================
              SECTION 6 -- RBA: 2 donut kalau mingguan, 1 bar chart
              kalau bulanan.
             ============================================================ */}
          {mode === "mingguan" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  RBA — Minggu Epidemiologi ke-{mingguEpidSaatIni}
                </h3>
                <DonutRba data={kategoriRbaMingguIni} />
              </div>
              <div className="rounded-card bg-surface p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                  RBA — Total Tahun {tahun}
                </h3>
                <DonutRba data={kategoriData.rba} />
                <PanelAnalisisAI
                  sudahLogin={sudahLogin}
                  role={role}
                  konteks="cop-rba"
                  periodeKey={periodeKey}
                  wilayahKerja={wilayahKerjaAi}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                RBA — Tren Bulanan Tahun {tahun} (Jan–Des)
              </h3>
              <RbaBarBulanan data={dataRbaBulanan} />
              <PanelAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks="cop-rba"
                periodeKey={periodeKey}
                wilayahKerja={wilayahKerjaAi}
              />
            </div>
          )}

          {/* SECTION 7 & 10: Disandingkan */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
              Negara Kedatangan
            </h3>
            <DaftarNegaraKedatangan data={kategoriData.negara_kedatangan} />
            <PanelAnalisisAI
              sudahLogin={sudahLogin}
              role={role}
              konteks="cop-negara-asal"
              periodeKey={periodeKey}
              wilayahKerja={wilayahKerjaAi}
            />
          </div>
          <div className="rounded-card bg-surface p-6">
            <BreakdownCard judul="Bendera Kapal" data={kategoriData.bendera_kapal} />
          </div>
        </div>

          {/* SECTION 8 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Daerah Terjangkit
              </h3>
              <PieBreakdown data={kategoriData.daerah_terjangkit} skema="terjangkit" />
            </div>
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Keberadaan Vektor
              </h3>
              <PieBreakdown data={kategoriData.keberadaan_vektor} skema="vektor" />
            </div>
          </div>

          {/* SECTION 9 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Faktor Risiko
              </h3>
              <PieBreakdown data={kategoriData.faktor_risiko} skema="faktor-risiko" />
              <PanelAnalisisAI
                sudahLogin={sudahLogin}
                role={role}
                konteks="cop-faktor-risiko"
                periodeKey={periodeKey}
                wilayahKerja={wilayahKerjaAi}
              />
            </div>
            <div className="rounded-card bg-surface p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
                Kelengkapan Dokumen
              </h3>
              <PieBreakdown data={kategoriData.kelengkapan_dokumen} skema="kelengkapan" />
            </div>
          </div>

         {/* ============================================================
              SECTION 10B -- PETA SEBARAN NEGARA KEDATANGAN
             ============================================================ */}
          <div className="rounded-card bg-surface p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
              Peta Sebaran Negara Kedatangan
            </h3>
            <PetaNegaraKedatangan data={kategoriData.negara_kedatangan} />
          </div>

          {/* SECTION 11 */}
          <details className="rounded-card bg-surface p-6"></details>

          {/* SECTION 11 */}
          <details className="rounded-card bg-surface p-6">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-muted">
              Data Mentah (50 Terbaru) — untuk Verifikasi/Audit
            </summary>
            <div className="mt-4 overflow-x-auto">
              {dataMentah.length === 0 ? (
                <p className="text-sm text-muted">Tidak ada data.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 pr-4">Tanggal</th>
                      <th className="py-2 pr-4">Wilayah</th>
                      <th className="py-2 pr-4">Nama Kapal</th>
                      <th className="py-2 pr-4">Bendera</th>
                      <th className="py-2 pr-4">Negara</th>
                      <th className="py-2 pr-4">ABK</th>
                      <th className="py-2 pr-4">RBA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataMentah.map((k, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4">{k.tgl_kedatangan}</td>
                        <td className="py-2 pr-4">{k.wilayah_kerja}</td>
                        <td className="py-2 pr-4">{k.nama_kapal}</td>
                        <td className="py-2 pr-4">{k.bendera_kapal}</td>
                        <td className="py-2 pr-4">{k.negara_kedatangan}</td>
                        <td className="py-2 pr-4">{k.total_abk}</td>
                        <td className="py-2 pr-4" style={{ color: resolveWarnaRba(k.rba) }}>
                          {k.rba}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}