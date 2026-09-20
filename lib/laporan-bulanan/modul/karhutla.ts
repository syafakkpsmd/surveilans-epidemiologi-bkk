import "server-only";
import { ambilPerbandinganIspaHotspot } from "@/lib/supabase/queries-karhutla-server";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { desimal, jumlah } from "./_bantu";

const JUDUL = "ISPA Karhutla";

export const modulKarhutla: ModulLaporan = {
  kunci: "karhutla",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    // Fungsi yang sama dengan grafik "Kasus ISPA vs Titik Panas" di halaman Karhutla, mode bulanan.
    const titik = await ambilPerbandinganIspaHotspot({ granularitas: "bulanan", tahun, periodeAwal: 1, periodeAkhir: bulanAkhir });
    const ispa = titik.map((t) => t.totalKasusIspa);
    const anak = titik.map((t) => t.totalKasusAnak);
    const dewasa = titik.map((t) => t.totalKasusDewasa);
    const hotspot = titik.map((t) => t.jumlahHotspot);
    const pm25 = titik.map((t) => t.pm25Rerata);
    if (jumlah(ispa) + jumlah(hotspot) === 0 && pm25.every((v) => v == null)) return null;

    const i = bulanAkhir - 1;
    const pmAda = pm25.filter((v): v is number => v != null);
    const pmRata = pmAda.length ? pmAda.reduce((s, v) => s + v, 0) / pmAda.length : null;
    const label = labelBulanan(bulanAkhir);
    const temuan: string[] = [];
    const maksIspa = Math.max(...ispa);
    if (maksIspa > 0) temuan.push(`Kasus ISPA terbanyak pada bulan ${BULAN[ispa.indexOf(maksIspa)]} (${fmtAngka(maksIspa)} kasus).`);
    const maksHot = Math.max(...hotspot);
    if (maksHot > 0) temuan.push(`Titik panas terbanyak pada bulan ${BULAN[hotspot.indexOf(maksHot)]} (${fmtAngka(maksHot)} titik).`);

    return {
      kunci: "karhutla",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Kasus ISPA", nilai: fmtAngka(jumlah(ispa)), catatan: `Anak ${fmtAngka(jumlah(anak))}, dewasa ${fmtAngka(jumlah(dewasa))}` },
        { label: "Titik panas (Kaltim)", nilai: fmtAngka(jumlah(hotspot)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "PM2.5 rata-rata", nilai: pmRata == null ? "-" : `${desimal(pmRata, 1)} µg/m³` },
        { label: `Kasus ISPA ${BULAN[i]}`, nilai: fmtAngka(ispa[i]), catatan: `${fmtAngka(hotspot[i])} titik panas` },
      ],
      tren: { jenis: "batang", label, seri: [{ nama: "Kasus ISPA", nilai: ispa, warna: "B3362C" }], satuan: "Jumlah kasus ISPA" },
      tabel: {
        kepala: ["Bulan", "Kasus ISPA", "Anak", "Dewasa", "PM2.5 (µg/m³)", "Titik panas"],
        kanan: [1, 2, 3, 4, 5],
        lebar: [1.4, 1.3, 1, 1.1, 1.6, 1.4],
        baris: label.map((nama, k) => [nama, fmtAngka(ispa[k]), fmtAngka(anak[k]), fmtAngka(dewasa[k]), pm25[k] == null ? "-" : desimal(pm25[k], 1), fmtAngka(hotspot[k])]),
      },
      temuan,
    };
  },
};
