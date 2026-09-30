// lib/supabase/queriesAbkKapal.ts
//
// Query mentah (1 baris = 1 kapal, bukan agregat) untuk dashboard Lalu Lintas
// Orang: 4 tabel ABK Kapal --
//   - Kedatangan Luar Negeri : kegiatan_cop (tgl_kedatangan)
//   - Kedatangan Dalam Negeri: kegiatan_phqc, tujuan_berlayar = 'Dalam Negeri'
//     (PHQC tidak punya data arah datang, dipakai ulang sesuai arahan)
//   - Keberangkatan Luar Negeri : kegiatan_phqc, tujuan_berlayar = 'Luar Negeri'
//   - Keberangkatan Dalam Negeri: kegiatan_phqc, tujuan_berlayar = 'Dalam Negeri'
//     (baris SAMA dengan Kedatangan Dalam Negeri -- memang sengaja, satu-satunya
//     sumber data ABK Kapal Dalam Negeri yang ada)
//
// "Hasil Pemeriksaan" bukan kolom di database -- selalu diisi "Memenuhi Syarat".
// "Keterangan" juga bukan kolom di database -- selalu kosong.

import { createClient } from "@/lib/supabase/server";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";

export interface BarisAbkKapal {
  tanggal: string; // yyyy-mm-dd
  nama_kapal: string;
  bendera: string;
  jumlah_abk: number;
  hasil_pemeriksaan: string; // selalu "Memenuhi Syarat"
  keterangan: string; // selalu ""
}

export interface FilterAbkKapal {
  tahun: number;
  granularitas: "mingguan" | "bulanan";
  awal: number;
  akhir: number;
  wilker?: string;
}

export type SumberAbkKapal =
  | "kedatangan-luar-negeri"
  | "kedatangan-dalam-negeri"
  | "keberangkatan-luar-negeri"
  | "keberangkatan-dalam-negeri";

async function ambilBarisCop(tahun: number, wilker?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("kegiatan_cop")
    .select("tgl_kedatangan, nama_kapal, bendera_kapal, jml_abk_wna, jml_abk_wni, wilayah_kerja")
    .gte("tgl_kedatangan", `${tahun}-01-01`)
    .lte("tgl_kedatangan", `${tahun}-12-31`);
  if (wilker) query = query.eq("wilayah_kerja", wilker);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    tanggal: String(r.tgl_kedatangan ?? ""),
    nama_kapal: String(r.nama_kapal ?? ""),
    bendera: String(r.bendera_kapal ?? ""),
    jumlah_abk: (Number(r.jml_abk_wna) || 0) + (Number(r.jml_abk_wni) || 0),
  }));
}

async function ambilBarisPhqc(tahun: number, tujuan: "Dalam Negeri" | "Luar Negeri", wilker?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("kegiatan_phqc")
    .select("tgl_keberangkatan, nama_kapal, bendera, jml_abk_wna, jml_abk_wni, wilayah_kerja, tujuan_berlayar")
    .eq("tujuan_berlayar", tujuan)
    .gte("tgl_keberangkatan", `${tahun}-01-01`)
    .lte("tgl_keberangkatan", `${tahun}-12-31`);
  if (wilker) query = query.eq("wilayah_kerja", wilker);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    tanggal: String(r.tgl_keberangkatan ?? ""),
    nama_kapal: String(r.nama_kapal ?? ""),
    bendera: String(r.bendera ?? ""),
    jumlah_abk: (Number(r.jml_abk_wna) || 0) + (Number(r.jml_abk_wni) || 0),
  }));
}

function filterRentang<T extends { tanggal: string }>(baris: T[], filter: FilterAbkKapal): T[] {
  return baris.filter((b) => {
    if (!b.tanggal) return false;
    const tgl = new Date(b.tanggal + "T00:00:00");
    if (Number.isNaN(tgl.getTime())) return false;

    if (filter.granularitas === "mingguan") {
      const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tgl);
      return tahunEpid === filter.tahun && mingguEpid >= filter.awal && mingguEpid <= filter.akhir;
    }
    const bulan = tgl.getMonth() + 1;
    return tgl.getFullYear() === filter.tahun && bulan >= filter.awal && bulan <= filter.akhir;
  });
}

function lengkapiKolomTetap(baris: { tanggal: string; nama_kapal: string; bendera: string; jumlah_abk: number }[]): BarisAbkKapal[] {
  return baris
    .map((b) => ({ ...b, hasil_pemeriksaan: "Memenuhi Syarat", keterangan: "" }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export async function getAbkKapal(sumber: SumberAbkKapal, filter: FilterAbkKapal): Promise<BarisAbkKapal[]> {
  // Ambil 1 tahun sebelum/sesudah untuk minggu epid yang menyeberang tahun kalender.
  const tahunYangDiambil = filter.granularitas === "mingguan" ? [filter.tahun - 1, filter.tahun, filter.tahun + 1] : [filter.tahun];

  let mentah: { tanggal: string; nama_kapal: string; bendera: string; jumlah_abk: number }[] = [];

  if (sumber === "kedatangan-luar-negeri") {
    const semua = await Promise.all(tahunYangDiambil.map((t) => ambilBarisCop(t, filter.wilker)));
    mentah = semua.flat();
  } else {
    const tujuan = sumber === "keberangkatan-luar-negeri" ? "Luar Negeri" : "Dalam Negeri";
    const semua = await Promise.all(tahunYangDiambil.map((t) => ambilBarisPhqc(t, tujuan, filter.wilker)));
    mentah = semua.flat();
  }

  return lengkapiKolomTetap(filterRentang(mentah, filter));
}

/** Daftar wilayah kerja untuk dropdown filter, per sumber tabel. */
export async function getWilayahKerjaAbkKapal(sumber: SumberAbkKapal): Promise<string[]> {
  const supabase = await createClient();
  const tabel = sumber === "kedatangan-luar-negeri" ? "kegiatan_cop" : "kegiatan_phqc";
  const { data, error } = await supabase.from(tabel).select("wilayah_kerja").not("wilayah_kerja", "is", null);
  if (error) throw error;
  const set = new Set<string>((data ?? []).map((r: any) => String(r.wilayah_kerja)).filter(Boolean));
  return Array.from(set).sort();
}