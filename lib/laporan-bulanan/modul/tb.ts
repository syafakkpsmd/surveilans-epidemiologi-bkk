import "server-only";
import {
  DAFTAR_WILKER_TB,
  getTbRawData,
  hitungBreakdownFaktorRisikoTb,
  hitungBreakdownWilkerTb,
  hitungCascadeTb,
  hitungDelayDiagnosisTb,
} from "@/lib/turso/tb";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah } from "./_bantu";

const JUDUL = "Surveilans TB";

/** Bulan kalender (1-12) dari tanggal_pelaksanaan (format YYYY-MM-DD). */
const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

/* ---------- Donat karakteristik peserta ---------- */

interface BarisKarakteristik {
  tanggal_pelaksanaan?: string | null;
  jenis_kelamin?: string | null;
  tanggal_lahir?: string | null;
  pekerjaan?: string | null;
  merokok?: string | null;
  perokok_pasif?: string | null;
}

/** Batas kelompok usia; ubah di sini bila standar Anda berbeda. */
const KELOMPOK_USIA = [
  { label: "0-14 th", min: 0, maks: 14 },
  { label: "15-24 th", min: 15, maks: 24 },
  { label: "25-34 th", min: 25, maks: 34 },
  { label: "35-44 th", min: 35, maks: 44 },
  { label: "45-54 th", min: 45, maks: 54 },
  { label: "55+ th", min: 55, maks: 120 },
];

/** Menerima 2026-03-14 maupun 14/03/2026 (hari/bulan/tahun). */
function tglDari(t: string | null | undefined): Date | null {
  if (!t) return null;
  const s = t.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
}

function umurPada(lahir: string | null | undefined, acuan: string | null | undefined): number | null {
  const l = tglDari(lahir);
  const a = tglDari(acuan);
  if (!l || !a) return null;
  let u = a.getFullYear() - l.getFullYear();
  if (a.getMonth() < l.getMonth() || (a.getMonth() === l.getMonth() && a.getDate() < l.getDate())) u -= 1;
  return u >= 0 && u <= 120 ? u : null;
}

const labelUsia = (u: number | null) => (u == null ? "Tidak diisi" : (KELOMPOK_USIA.find((k) => u >= k.min && u <= k.maks)?.label ?? "Tidak diisi"));

const labelGender = (v: string | null | undefined) => {
  const s = (v ?? "").trim().toLowerCase();
  if (s.startsWith("l")) return "Laki-laki";
  if (s.startsWith("p")) return "Perempuan";
  return "Tidak diisi";
};

const labelYaTidak = (v: string | null | undefined) => {
  const teks = (v ?? "").trim();
  const s = teks.toLowerCase();
  if (!s || s === "-") return "Tidak diisi";
  if (["ya", "y", "iya"].includes(s)) return "Ya";
  if (["tidak", "tdk", "t", "no"].includes(s)) return "Tidak";
  return teks;
};

const labelPekerjaan = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim() || "Tidak diisi";

/** Hitung label menjadi donat. Huruf besar/kecil digabung; urutan dan warna opsional; maks = jumlah irisan sebelum "Lainnya". */
function keDonat(judul: string, label: string[], opsi: { urutan?: string[]; warna?: Record<string, string>; maks?: number } = {}): Donat | null {
  const peta = new Map<string, { label: string; n: number }>();
  for (const l of label) {
    const k = l.toLowerCase();
    const x = peta.get(k);
    if (x) x.n += 1;
    else peta.set(k, { label: l, n: 1 });
  }
  let urut = Array.from(peta.values());
  const urutan = opsi.urutan;
  if (urutan) {
    const idx = (l: string) => {
      const i = urutan.indexOf(l);
      return i < 0 ? 999 : i;
    };
    urut.sort((a, b) => idx(a.label) - idx(b.label) || b.n - a.n);
  } else {
    urut.sort((a, b) => b.n - a.n);
  }
  if (opsi.maks) {
    // "Lainnya" dari data digabung dengan sisa pekerjaan kecil menjadi satu irisan
    const bukanLainnya = urut.filter((x) => x.label.toLowerCase() !== "lainnya");
    const kepala = bukanLainnya.slice(0, opsi.maks);
    const sisa = bukanLainnya.slice(opsi.maks).reduce((s, x) => s + x.n, 0) + urut.filter((x) => x.label.toLowerCase() === "lainnya").reduce((s, x) => s + x.n, 0);
    urut = sisa > 0 ? [...kepala, { label: "Lainnya", n: sisa }] : kepala;
  }
  const irisan = urut.filter((x) => x.n > 0).map((x) => ({ label: x.label, nilai: x.n, warna: opsi.warna?.[x.label] }));
  return irisan.length > 0 ? { judul, irisan } : null;
}

const WARNA_YA_TIDAK = { Ya: "B3362C", Tidak: "0A7A78", "Tidak diisi": "9FB3BB" };

export const modulTb: ModulLaporan = {
  kunci: "tb",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const semua = await getTbRawData(tahun);
    const rows = semua.filter((r) => {
      const b = bulanDari(r.tanggal_pelaksanaan);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const cascade = hitungCascadeTb(rows);
    const perWilker = hitungBreakdownWilkerTb(rows).filter((w) => DAFTAR_WILKER_TB.includes(w.wilayahKerja as (typeof DAFTAR_WILKER_TB)[number]));
    const faktor = hitungBreakdownFaktorRisikoTb(rows).filter((f) => f.totalDiskrining > 0).slice(0, 5);
    const delay = hitungDelayDiagnosisTb(rows);

    // Deret skrining per bulan, untuk grafik dan kartu "bulan ini".
    const skriningBulan = new Array<number>(bulanAkhir).fill(0);
    const terkonfirmasiBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) {
      const b = bulanDari(r.tanggal_pelaksanaan)!;
      skriningBulan[b - 1] += 1;
      if ((r.terkonfirmasi_tbc ?? "").trim().toLowerCase() === "ya") terkonfirmasiBulan[b - 1] += 1;
    }

    // Donat karakteristik peserta. Urutan penting: 0 jenis kelamin, 1 usia (di kanan tabel); 2 merokok, 3 perokok pasif, 4 pekerjaan (slide visual).
    const k = rows as unknown as BarisKarakteristik[];
    const donat = [
      keDonat("Jenis Kelamin", k.map((r) => labelGender(r.jenis_kelamin)), {
        urutan: ["Laki-laki", "Perempuan", "Tidak diisi"],
        warna: { "Laki-laki": "3F6FB5", Perempuan: "D98C8C", "Tidak diisi": "9FB3BB" },
      }),
      keDonat("Kelompok Usia", k.map((r) => labelUsia(umurPada(r.tanggal_lahir, r.tanggal_pelaksanaan))), {
        urutan: [...KELOMPOK_USIA.map((x) => x.label), "Tidak diisi"],
      }),
      keDonat("Merokok", k.map((r) => labelYaTidak(r.merokok)), { urutan: ["Ya", "Tidak", "Tidak diisi"], warna: WARNA_YA_TIDAK }),
      keDonat("Perokok Pasif", k.map((r) => labelYaTidak(r.perokok_pasif)), { urutan: ["Ya", "Tidak", "Tidak diisi"], warna: WARNA_YA_TIDAK }),
      keDonat("Pekerjaan", k.map((r) => labelPekerjaan(r.pekerjaan)), { maks: 6 }),
    ].filter((d): d is Donat => d !== null);

    const temuan: string[] = [
      `Case Detection Rate ${fmtPersen(cascade.caseDetectionRate, 2)} (${fmtAngka(cascade.totalTerkonfirmasi)} terkonfirmasi dari ${fmtAngka(cascade.totalSkrining)} skrining); yield dari terduga ${fmtPersen(cascade.yieldRateTerduga, 1)}.`,
    ];
    if (faktor.length > 0) temuan.push(`Yield tertinggi pada kelompok ${faktor[0].faktor} (${fmtPersen(faktor[0].yieldPersen, 1)}, ${fmtAngka(faktor[0].totalTerkonfirmasi)} dari ${fmtAngka(faktor[0].totalDiskrining)} diskrining).`);
    if (delay.jumlahKasusDihitung > 0) temuan.push(`Rata-rata waktu skrining sampai hasil diagnosis ${desimal1(delay.rataRataHari)} hari (median ${fmtAngka(delay.medianHari)}, maksimal ${fmtAngka(delay.maksimalHari)} hari), dari ${fmtAngka(delay.jumlahKasusDihitung)} kasus dengan tanggal hasil tercatat.`);
    const wilkerTerbanyak = [...perWilker].sort((a, b) => b.totalSkrining - a.totalSkrining)[0];
    if (wilkerTerbanyak && wilkerTerbanyak.totalSkrining > 0) temuan.push(`Skrining terbanyak di wilayah kerja ${wilkerTerbanyak.wilayahKerja} (${fmtAngka(wilkerTerbanyak.totalSkrining)}).`);

    return {
      kunci: "tb",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total skrining", nilai: fmtAngka(cascade.totalSkrining), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Terduga TBC", nilai: fmtAngka(cascade.totalTerduga), catatan: `${fmtAngka(cascade.totalDiperiksa)} sudah diperiksa` },
        { label: "Terkonfirmasi TBC", nilai: fmtAngka(cascade.totalTerkonfirmasi), nada: cascade.totalTerkonfirmasi > 0 ? "bad" : "ok" },
        { label: `Skrining ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(skriningBulan[bulanAkhir - 1]) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Skrining", nilai: skriningBulan, warna: "6B8E9B" },
          { nama: "Terkonfirmasi", nilai: terkonfirmasiBulan, warna: "B3362C" },
        ],
        satuan: "Jumlah peserta",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Skrining", "Terduga", "Terkonfirmasi"],
        kanan: [1, 2, 3],
        lebar: [2.4, 1.1, 1, 1.7],
        baris: perWilker.map((w) => [w.wilayahKerja, fmtAngka(w.totalSkrining), fmtAngka(w.totalTerduga), fmtAngka(w.totalTerkonfirmasi)]),
      },
      donat: donat.length > 0 ? donat : undefined,
      temuan,
      narasi: [
        "Skrining mencakup peserta dari seluruh Indonesia (kabupaten/kota asal peserta), sementara wilayah kerja menunjukkan BKK yang melaksanakan skrining. Case Detection Rate dan yield rate dihitung dari data periode laporan, bukan kumulatif sejak awal program.",
      ],
    };
  },
};

function desimal1(n: number): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}