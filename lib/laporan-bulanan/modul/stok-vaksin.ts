import "server-only";
import { ambilRusak, ambilSatuan, ambilSisaStok, ambilTerbit, JENIS_STOK_LABEL } from "@/lib/klinik/agregasiStok";
import { getStokDenganFilter } from "@/lib/klinik/stok-queries";
import { createClient } from "@/lib/supabase/server";
import { fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, persenDari } from "./_bantu";

const JUDUL = "Stok Vaksin";
/** Jenis stok berupa vaksin fisik (vial); e-ICV dan ICV adalah buku sertifikat. */
const JENIS_VAKSIN = ["mm", "yf", "polio", "flu"];
const URUTAN_JENIS = ["mm", "yf", "polio", "flu", "e-icv", "icv"];

const akhirBulan = (tahun: number, bulan: number): string => new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);

interface Fasilitas {
  nama_klinik: string | null;
  spreadsheet_id: string | null;
}

export const modulStokVaksin: ModulLaporan = {
  kunci: "stok-vaksin",
  judul: JUDUL,
  kelompok: "Klinik Binaan BKK",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("klinik_binaan").select("nama_klinik, spreadsheet_id");
    if (error) throw new Error(`Gagal membaca daftar klinik: ${error.message}`);
    const nama = new Map<string, string>();
    for (const k of (data ?? []) as Fasilitas[]) if (k.spreadsheet_id) nama.set(k.spreadsheet_id, k.nama_klinik ?? "-");
    if (nama.size === 0) return null;

    const baris = await getStokDenganFilter([...nama.keys()], `${tahun}-01-01`, akhirBulan(tahun, bulanAkhir));
    if (baris.length === 0) return null;

    const terbitBulan: Record<string, number[]> = {};
    const rusakBulan: Record<string, number[]> = {};
    const total: Record<string, { terbit: number; rusak: number; sisa: number }> = {};
    const terakhir = new Map<string, { noBaris: number; sisa: number }>(); // per (spreadsheet, jenis): baris terakhir dalam periode
    const rusakKlinik = new Map<string, number>();

    for (const b of baris) {
      const bulan = Number(String(b.tanggal).slice(5, 7));
      if (bulan < 1 || bulan > bulanAkhir) continue;
      const jenis = b.jenisStok;
      const terbit = ambilTerbit(b.data);
      const rusak = ambilRusak(b.data);
      (terbitBulan[jenis] ??= new Array<number>(bulanAkhir).fill(0))[bulan - 1] += terbit;
      (rusakBulan[jenis] ??= new Array<number>(bulanAkhir).fill(0))[bulan - 1] += rusak;
      const t = (total[jenis] ??= { terbit: 0, rusak: 0, sisa: 0 });
      t.terbit += terbit;
      t.rusak += rusak;
      const kunci = `${b.spreadsheetId}|${jenis}`;
      const prev = terakhir.get(kunci);
      if (!prev || b.noBaris >= prev.noBaris) terakhir.set(kunci, { noBaris: b.noBaris, sisa: ambilSisaStok(b.data) });
      if (JENIS_VAKSIN.includes(jenis) && rusak > 0) rusakKlinik.set(nama.get(b.spreadsheetId) ?? "-", (rusakKlinik.get(nama.get(b.spreadsheetId) ?? "-") ?? 0) + rusak);
    }
    for (const [kunci, v] of terakhir) {
      const jenis = kunci.split("|")[1];
      if (total[jenis]) total[jenis].sisa += v.sisa;
    }

    const jenisAda = URUTAN_JENIS.filter((j) => total[j]).concat(Object.keys(total).filter((j) => !URUTAN_JENIS.includes(j)));
    if (jenisAda.length === 0) return null;

    const deretVaksin = (peta: Record<string, number[]>) => Array.from({ length: bulanAkhir }, (_, i) => jumlah(JENIS_VAKSIN.map((j) => peta[j]?.[i] ?? 0)));
    const terbitVaksin = deretVaksin(terbitBulan);
    const rusakVaksin = deretVaksin(rusakBulan);
    const totalTerbitVaksin = jumlah(terbitVaksin);
    const totalRusakVaksin = jumlah(rusakVaksin);
    const dokumen = jumlah(["e-icv", "icv"].map((j) => total[j]?.terbit ?? 0));

    const persenRusak = (j: string) => persenDari(total[j].rusak, total[j].terbit + total[j].rusak);
    const temuan: string[] = [];
    const rusakTertinggi = jenisAda.filter((j) => JENIS_VAKSIN.includes(j) && (persenRusak(j) ?? 0) > 0).sort((a, b) => (persenRusak(b) ?? 0) - (persenRusak(a) ?? 0))[0];
    if (rusakTertinggi) temuan.push(`Tingkat kerusakan tertinggi: ${JENIS_STOK_LABEL[rusakTertinggi] ?? rusakTertinggi} (${fmtPersen(persenRusak(rusakTertinggi))}).`);
    const klinikRusak = Array.from(rusakKlinik, ([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
    if (klinikRusak.length > 0) temuan.push(`Vaksin rusak terbanyak di ${klinikRusak[0].n} (${fmtAngka(klinikRusak[0].v)} vial).`);

    return {
      kunci: "stok-vaksin",
      judul: JUDUL,
      kelompok: "Klinik Binaan BKK",
      kartu: [
        { label: "Vaksin terbit", nilai: fmtAngka(totalTerbitVaksin), catatan: `vial, ${labelRentang(tahun, bulanAkhir)}` },
        { label: "Vaksin rusak", nilai: fmtAngka(totalRusakVaksin), nada: totalRusakVaksin > 0 ? "warn" : "ok", catatan: `${fmtPersen(persenDari(totalRusakVaksin, totalTerbitVaksin + totalRusakVaksin))} dari terbit + rusak` },
        { label: "Dokumen ICV terbit", nilai: fmtAngka(dokumen), catatan: "buku e-ICV dan ICV" },
        { label: "Fasilitas dengan data stok", nilai: fmtAngka(new Set(baris.map((b) => b.spreadsheetId)).size) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Vaksin terbit", nilai: terbitVaksin, warna: "0A7A78" },
          { nama: "Vaksin rusak", nilai: rusakVaksin, warna: "B3362C" },
        ],
        satuan: "Jumlah vial",
      },
      tabel: {
        kepala: ["Jenis stok", "Satuan", "Terbit", "Rusak", "Rusak (%)", "Sisa akhir periode"],
        kanan: [2, 3, 4, 5],
        lebar: [3, 1.1, 1.2, 1.2, 1.3, 2],
        baris: jenisAda.map((j) => [JENIS_STOK_LABEL[j] ?? j, ambilSatuan(j), fmtAngka(total[j].terbit), fmtAngka(total[j].rusak), fmtPersen(persenRusak(j)), fmtAngka(total[j].sisa)]),
      },
      temuan,
      narasi: ["Sisa akhir periode adalah jumlah sisa stok terakhir yang tercatat sampai akhir bulan laporan dari seluruh klinik dan BKK yang datanya tersedia."],
    };
  },
};
