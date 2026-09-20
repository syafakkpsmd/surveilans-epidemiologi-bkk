import "server-only";
import { getRingkasanVektorTikusBulanan, getUjiLabVektorTikusBulanan, getWilkerRef } from "@/lib/supabase/queries";
import { fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { desimal, jumlah, jumlahPerBulan, persenDari, petaNamaWilker } from "./_bantu";

const JUDUL = "Vektor Tikus";

/** Kolom view_vektor_tikus_bulanan yang dipakai. */
interface Baris {
  bulan: number;
  kode_wilker: string | null;
  jml_trap_dipasang: number | null;
  jml_trap_tertangkap: number | null;
  rt: number | null;
  rn: number | null;
  mm: number | null;
  jenis_lainnya: number | null;
  total_positif_leptospira: number | null;
  total_positif_pes: number | null;
  total_positif_hantavirus: number | null;
}
interface UjiLab {
  periode: number;
  diuji_lab: number;
}

export const modulTikus: ModulLaporan = {
  kunci: "tikus",
  judul: JUDUL,
  kelompok: "Vektor",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const [ringkasan, lab, wilker] = await Promise.all([getRingkasanVektorTikusBulanan(tahun), getUjiLabVektorTikusBulanan(tahun), getWilkerRef()]);
    const baris = (ringkasan as unknown as Baris[]).filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir).map((b) => ({ ...b, wilayah_kerja: b.kode_wilker }));
    if (baris.length === 0) return null;

    const nama = petaNamaWilker(wilker as unknown as Parameters<typeof petaNamaWilker>[0]);
    const pasang = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_trap_dipasang ?? 0);
    const tangkap = jumlahPerBulan(baris, bulanAkhir, (b) => b.jml_trap_tertangkap ?? 0);
    const totalPasang = jumlah(pasang);
    const totalTangkap = jumlah(tangkap);
    if (totalPasang === 0 && totalTangkap === 0) return null;

    const diuji = jumlah(((lab as unknown as UjiLab[]).filter((u) => u.periode >= 1 && u.periode <= bulanAkhir)).map((u) => u.diuji_lab));
    const lepto = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_positif_leptospira ?? 0));
    const pes = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_positif_pes ?? 0));
    const hanta = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_positif_hantavirus ?? 0));
    const positif = lepto + pes + hanta;

    const spesies = [
      { nama: "RT", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.rt ?? 0)) },
      { nama: "RN", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.rn ?? 0)) },
      { nama: "MM", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.mm ?? 0)) },
      { nama: "Lainnya", nilai: jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jenis_lainnya ?? 0)) },
    ].sort((a, b) => b.nilai - a.nilai);

    const kodeKeNama = (kode: string) => nama.get(kode) ?? kode;
    const perWilkerBernama = new Map<string, { pasang: number; tangkap: number }>();
    for (const b of baris) {
      const k = kodeKeNama(b.kode_wilker ?? "-");
      const x = perWilkerBernama.get(k) ?? { pasang: 0, tangkap: 0 };
      x.pasang += b.jml_trap_dipasang ?? 0;
      x.tangkap += b.jml_trap_tertangkap ?? 0;
      perWilkerBernama.set(k, x);
    }
    const tabel = Array.from(perWilkerBernama, ([w, v]) => ({ w, ...v })).sort((a, b) => b.tangkap - a.tangkap);

    const temuan: string[] = [];
    if (spesies[0].nilai > 0) temuan.push(`Tikus tertangkap terbanyak: ${spesies[0].nama} (${fmtAngka(spesies[0].nilai)} ekor).`);
    if (diuji > 0) {
      temuan.push(
        positif > 0
          ? `Hasil uji laboratorium positif: Leptospira ${fmtAngka(lepto)}, Pes ${fmtAngka(pes)}, Hantavirus ${fmtAngka(hanta)} dari ${fmtAngka(diuji)} sampel diuji.`
          : `Tidak ada hasil uji laboratorium positif (Leptospira, Pes, Hantavirus) dari ${fmtAngka(diuji)} sampel diuji.`,
      );
    }

    return {
      kunci: "tikus",
      judul: JUDUL,
      kelompok: "Vektor",
      kartu: [
        { label: "Trap dipasang", nilai: fmtAngka(totalPasang), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Tikus tertangkap", nilai: fmtAngka(totalTangkap), catatan: `TSI ${desimal(persenDari(totalTangkap, totalPasang), 1)}%` },
        { label: "Diuji laboratorium", nilai: fmtAngka(diuji) },
        { label: "Hasil positif", nilai: fmtAngka(positif), nada: positif > 0 ? "bad" : undefined, catatan: "Leptospira, Pes, Hantavirus" },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [{ nama: "Tikus tertangkap", nilai: tangkap, warna: "0A7A78" }],
        satuan: "Jumlah tikus tertangkap",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Trap dipasang", "Tikus tertangkap", "TSI (%)"],
        kanan: [1, 2, 3],
        lebar: [3, 1.4, 1.6, 1],
        baris: tabel.map((t) => [t.w, fmtAngka(t.pasang), fmtAngka(t.tangkap), desimal(persenDari(t.tangkap, t.pasang), 1)]),
      },
      temuan,
    };
  },
};
