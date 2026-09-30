// lib/supabase/queriesPhqcTujuan.ts
//
// Pecahan ABK PHQC (kegiatan_phqc) berdasarkan kolom tujuan_berlayar
// ('Dalam Negeri' / 'Luar Negeri'). Dipakai khusus untuk grafik breakdown
// Luar Negeri vs Dalam Negeri di dashboard Lalu Lintas Orang -- TIDAK
// mengubah angka "Total Keberangkatan" yang sudah ada (itu tetap jumlah
// semua baris PHQC apapun tujuannya).
//
// Agregasi minggu epidemiologi/bulan dihitung di JS (bukan di SQL) supaya
// konsisten dengan hitungMingguEpidemiologi yang sudah dipakai di
// app/(dashboard)/dashboard/abk-crew-penumpang/page.tsx.

import { createClient } from "@/lib/supabase/server";
import { hitungMingguEpidemiologi } from "@/lib/epi-week";

interface BarisAbkPhqc {
  tanggal: string; // yyyy-mm-dd (tgl_keberangkatan)
  tujuan: string; // 'Dalam Negeri' | 'Luar Negeri' | lainnya
  jumlahAbk: number;
}

async function ambilAbkPhqcTahun(tahunKalender: number): Promise<BarisAbkPhqc[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kegiatan_phqc")
    .select("tgl_keberangkatan, jml_abk_wna, jml_abk_wni, tujuan_berlayar")
    .gte("tgl_keberangkatan", `${tahunKalender}-01-01`)
    .lte("tgl_keberangkatan", `${tahunKalender}-12-31`);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    tanggal: String(r.tgl_keberangkatan ?? ""),
    tujuan: String(r.tujuan_berlayar ?? ""),
    jumlahAbk: (Number(r.jml_abk_wna) || 0) + (Number(r.jml_abk_wni) || 0),
  }));
}

function isLuarNegeri(tujuan: string): boolean {
  return tujuan.trim().toLowerCase() === "luar negeri";
}

/**
 * ABK PHQC per minggu epidemiologi, dipecah Dalam Negeri / Luar Negeri.
 * Ambil data 1 tahun kalender sebelum & sesudah karena minggu epid awal/akhir
 * tahun bisa "menyeberang" tahun kalender (pola sama dengan Penumpang Kapal).
 */
export async function getAbkPhqcPerTujuanMingguan(
  tahunEpid: number
): Promise<{ petaDalamNegeri: Map<number, number>; petaLuarNegeri: Map<number, number> }> {
  const baris = [
    ...(await ambilAbkPhqcTahun(tahunEpid - 1)),
    ...(await ambilAbkPhqcTahun(tahunEpid)),
    ...(await ambilAbkPhqcTahun(tahunEpid + 1)),
  ];

  const petaDalamNegeri = new Map<number, number>();
  const petaLuarNegeri = new Map<number, number>();

  baris.forEach((b) => {
    if (!b.tanggal) return;
    const tgl = new Date(b.tanggal + "T00:00:00");
    if (Number.isNaN(tgl.getTime())) return;

    const { tahunEpid: teBaris, mingguEpid } = hitungMingguEpidemiologi(tgl);
    if (teBaris !== tahunEpid) return;

    const peta = isLuarNegeri(b.tujuan) ? petaLuarNegeri : petaDalamNegeri;
    peta.set(mingguEpid, (peta.get(mingguEpid) ?? 0) + b.jumlahAbk);
  });

  return { petaDalamNegeri, petaLuarNegeri };
}

/** ABK PHQC per bulan kalender, dipecah Dalam Negeri / Luar Negeri. */
export async function getAbkPhqcPerTujuanBulanan(
  tahunKalender: number
): Promise<{ petaDalamNegeri: Map<number, number>; petaLuarNegeri: Map<number, number> }> {
  const baris = await ambilAbkPhqcTahun(tahunKalender);

  const petaDalamNegeri = new Map<number, number>();
  const petaLuarNegeri = new Map<number, number>();

  baris.forEach((b) => {
    const bulan = Number(b.tanggal.split("-")[1]);
    if (!bulan) return;
    const peta = isLuarNegeri(b.tujuan) ? petaLuarNegeri : petaDalamNegeri;
    peta.set(bulan, (peta.get(bulan) ?? 0) + b.jumlahAbk);
  });

  return { petaDalamNegeri, petaLuarNegeri };
}