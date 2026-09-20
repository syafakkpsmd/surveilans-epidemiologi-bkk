import "server-only";
import { getRingkasanBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, temuanDeret, temuanWilker } from "./_bantu";

const JUDUL = "Certificate of Pratique (COP)";

export const modulCop: ModulLaporan = {
  kunci: "cop",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = (await getRingkasanBulanan("cop", tahun)).filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
    if (baris.length === 0) return null;

    const kapal = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_kapal);
    const abk = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk);
    const wni = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk_wni));
    const wna = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk_wna));
    const totalKapal = jumlah(kapal);
    if (totalKapal === 0) return null;

    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      kapal: (b) => b.jumlah_kapal,
      wni: (b) => b.total_abk_wni,
      wna: (b) => b.total_abk_wna,
      abk: (b) => b.total_abk,
    });

    return {
      kunci: "cop",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Jumlah kapal (COP)", nilai: fmtAngka(totalKapal), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kapal[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(kapal[bulanAkhir - 1], kapal[bulanAkhir - 2]) : undefined },
        { label: "Total ABK", nilai: fmtAngka(jumlah(abk)), catatan: `WNI ${fmtAngka(wni)}, WNA ${fmtAngka(wna)}` },
        { label: "Rata-rata per bulan", nilai: fmtAngka(Math.round(totalKapal / bulanAkhir)), catatan: "kapal per bulan" },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Jumlah kapal", nilai: kapal }], satuan: "Jumlah kapal" },
      tabel: {
        kepala: ["Wilayah kerja", "Kapal", "ABK WNI", "ABK WNA", "Total ABK"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1, 1, 1, 1],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.kapal), fmtAngka(w.nilai.wni), fmtAngka(w.nilai.wna), fmtAngka(w.nilai.abk)]),
      },
      temuan: [...temuanDeret(kapal, "kapal"), ...temuanWilker(perWilker.map((w) => ({ nama: w.nama, nilai: w.nilai.kapal })), "kapal")],
    };
  },
};
