import "server-only";
import { getRingkasanBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, temuanDeret, temuanWilker } from "./_bantu";

const JUDUL = "PHQC";

export const modulPhqc: ModulLaporan = {
  kunci: "phqc",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const baris = (await getRingkasanBulanan("phqc", tahun)).filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
    if (baris.length === 0) return null;

    const kapal = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_kapal);
    const abk = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk));
    const penumpang = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_penumpang);
    const pWni = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_penumpang_wni));
    const pWna = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_penumpang_wna));
    const totalKapal = jumlah(kapal);
    if (totalKapal === 0) return null;

    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      kapal: (b) => b.jumlah_kapal,
      abk: (b) => b.total_abk,
      penumpang: (b) => b.total_penumpang,
    });

    return {
      kunci: "phqc",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Jumlah kapal", nilai: fmtAngka(totalKapal), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kapal[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(kapal[bulanAkhir - 1], kapal[bulanAkhir - 2]) : undefined },
        { label: "Total ABK", nilai: fmtAngka(abk) },
        { label: "Total penumpang", nilai: fmtAngka(jumlah(penumpang)), catatan: `WNI ${fmtAngka(pWni)}, WNA ${fmtAngka(pWna)}` },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Jumlah kapal", nilai: kapal }], satuan: "Jumlah kapal" },
      tabel: {
        kepala: ["Wilayah kerja", "Kapal", "ABK", "Penumpang"],
        kanan: [1, 2, 3],
        lebar: [3, 1, 1, 1.4],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.kapal), fmtAngka(w.nilai.abk), fmtAngka(w.nilai.penumpang)]),
      },
      temuan: [...temuanDeret(kapal, "kapal"), ...temuanWilker(perWilker.map((w) => ({ nama: w.nama, nilai: w.nilai.kapal })), "kapal")],
    };
  },
};
