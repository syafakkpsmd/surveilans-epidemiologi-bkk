import "server-only";
import { getTrenBulananRdtGender } from "@/lib/turso/queriesMigrasiMalaria";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { desimal, jumlah, persenDari } from "./_bantu";

const JUDUL = "Migrasi Malaria";

export const modulMalaria: ModulLaporan = {
  kunci: "malaria",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const tren = await getTrenBulananRdtGender({ tahun, bulanDari: 1, bulanSampai: bulanAkhir });
    const responden = tren.map((t) => t.diperiksa);
    const positif = tren.map((t) => t.positif_rdt);
    const total = jumlah(responden);
    if (total === 0) return null;
    const i = bulanAkhir - 1;
    const totalPositif = jumlah(positif);
    const label = labelBulanan(bulanAkhir);

    return {
      kunci: "malaria",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Responden", nilai: fmtAngka(total), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Positif RDT", nilai: fmtAngka(totalPositif), nada: totalPositif > 0 ? "bad" : "ok" },
        { label: "Positif per responden", nilai: `${desimal(persenDari(totalPositif, total), 1)}%` },
        { label: `Bulan ${BULAN[i]}`, nilai: fmtAngka(responden[i]), catatan: bulanAkhir >= 2 ? fmtPerubahan(responden[i], responden[i - 1]) : undefined },
      ],
      tren: {
        jenis: "batang",
        label,
        seri: [
          { nama: "Responden", nilai: responden, warna: "0A7A78" },
          { nama: "Positif RDT", nilai: positif, warna: "B3362C" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Bulan", "Responden", "Laki-laki", "Perempuan", "Positif RDT"],
        kanan: [1, 2, 3, 4],
        lebar: [1.6, 1.2, 1.2, 1.3, 1.3],
        baris: tren.map((t, k) => [label[k], fmtAngka(t.diperiksa), fmtAngka(t.laki_laki), fmtAngka(t.perempuan), fmtAngka(t.positif_rdt)]),
      },
      temuan: totalPositif > 0 ? [`Ditemukan ${fmtAngka(totalPositif)} hasil RDT positif selama ${labelRentang(tahun, bulanAkhir)}.`] : ["Tidak ditemukan hasil RDT positif pada periode ini."],
    };
  },
};
