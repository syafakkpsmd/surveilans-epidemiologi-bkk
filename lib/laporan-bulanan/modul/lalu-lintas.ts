import "server-only";
import { getRingkasanBulanan } from "@/lib/supabase/queries";
import { getRingkasanPesawatBulanan } from "@/lib/supabase/queriesPesawat";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, temuanDeret } from "./_bantu";

const JUDUL = "Lalu Lintas Orang";

export const modulLaluLintas: ModulLaporan = {
  kunci: "lalu-lintas",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const [cop, phqc, pesawat] = await Promise.all([getRingkasanBulanan("cop", tahun), getRingkasanBulanan("phqc", tahun), getRingkasanPesawatBulanan({ tahun })]);
    const dalam = <T extends { bulan: number }>(a: T[]) => a.filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    // Bulan pesawat berformat 'YYYY-MM'; diubah menjadi angka bulan seperti di halaman Lalu Lintas Orang.
    const psw = pesawat.map((p) => ({ ...p, bulan: Number(String(p.bulan).split("-")[1]) })).filter((p) => p.bulan >= 1 && p.bulan <= bulanAkhir);

    // Sama dengan halaman: kedatangan = ABK kapal (COP) + crew dan penumpang pesawat datang.
    const abkDatang = jumlahPerBulan(dalam(cop), bulanAkhir, (b) => b.total_abk);
    const crewDatang = jumlahPerBulan(psw, bulanAkhir, (b) => b.crew_datang);
    const penumpangDatang = jumlahPerBulan(psw, bulanAkhir, (b) => b.penumpang_datang);
    // Keberangkatan = ABK dan penumpang kapal (PHQC) + crew dan penumpang pesawat berangkat.
    const abkBerangkat = jumlahPerBulan(dalam(phqc), bulanAkhir, (b) => b.total_abk);
    const penumpangKapal = jumlahPerBulan(dalam(phqc), bulanAkhir, (b) => b.total_penumpang);
    const crewBerangkat = jumlahPerBulan(psw, bulanAkhir, (b) => b.crew_berangkat);
    const penumpangBerangkat = jumlahPerBulan(psw, bulanAkhir, (b) => b.penumpang_berangkat);

    const datang = abkDatang.map((v, i) => v + crewDatang[i] + penumpangDatang[i]);
    const berangkat = abkBerangkat.map((v, i) => v + penumpangKapal[i] + crewBerangkat[i] + penumpangBerangkat[i]);
    if (jumlah(datang) + jumlah(berangkat) === 0) return null;
    const i = bulanAkhir - 1;

    const komponen: [string, number[], string][] = [
      ["ABK kapal", abkDatang, "Kedatangan"],
      ["Crew pesawat", crewDatang, "Kedatangan"],
      ["Penumpang pesawat", penumpangDatang, "Kedatangan"],
      ["ABK kapal", abkBerangkat, "Keberangkatan"],
      ["Penumpang kapal", penumpangKapal, "Keberangkatan"],
      ["Crew pesawat", crewBerangkat, "Keberangkatan"],
      ["Penumpang pesawat", penumpangBerangkat, "Keberangkatan"],
    ];

    return {
      kunci: "lalu-lintas",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Kedatangan", nilai: fmtAngka(jumlah(datang)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Keberangkatan", nilai: fmtAngka(jumlah(berangkat)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Kedatangan ${BULAN[i]}`, nilai: fmtAngka(datang[i]), catatan: bulanAkhir >= 2 ? fmtPerubahan(datang[i], datang[i - 1]) : undefined },
        { label: `Keberangkatan ${BULAN[i]}`, nilai: fmtAngka(berangkat[i]), catatan: bulanAkhir >= 2 ? fmtPerubahan(berangkat[i], berangkat[i - 1]) : undefined },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Kedatangan", nilai: datang, warna: "0A7A78" },
          { nama: "Keberangkatan", nilai: berangkat, warna: "C9781F" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Arah", "Komponen", "Total", `Bulan ${BULAN[i]}`],
        kanan: [2, 3],
        lebar: [1.6, 2.6, 1.3, 1.5],
        baris: komponen.map(([nama, deret, arah]) => [arah, nama, fmtAngka(jumlah(deret)), fmtAngka(deret[i])]),
      },
      temuan: [...temuanDeret(datang, "orang datang").slice(0, 1), ...temuanDeret(berangkat, "orang berangkat").slice(0, 1)],
    };
  },
};
