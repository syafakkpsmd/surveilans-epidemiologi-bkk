import "server-only";
import { getRingkasanVektorTikusBulanan, getUjiLabVektorTikusBulanan, getWilkerRef } from "@/lib/supabase/queries";
import { fmtAngka, labelBulanan, labelRentang } from "../periode";
import { desimal, jumlah, jumlahPerBulan, persenDari, petaNamaWilker } from "./_bantu";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { seriDariWilker } from "./_perWilker";

const JUDUL = "Surveilans Vektor Tikus";

type Akum = { pasang: number; tangkap: number; rt: number; rn: number; mm: number; bobotPinjal: number; isiPinjal: number };

/** Rata-rata indeks pinjal tertimbang jumlah survei; null jika tidak ada data. */
function rataIndeksPinjal(rows: { jml_survei?: number | null; index_pinjal_rerata?: number | null }[]): number | null {
  let bobot = 0;
  let isi = 0;
  for (const b of rows) {
    const w = Number(b.jml_survei ?? 0);
    if (b.index_pinjal_rerata == null || !(w > 0)) continue;
    bobot += w;
    isi += Number(b.index_pinjal_rerata) * w;
  }
  return bobot > 0 ? isi / bobot : null;
}

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
  jml_survei: number | null;
  tsi_rerata: number | null;
  index_pinjal_rerata: number | null;
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

    const totalRt = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.rt ?? 0));
    const totalRn = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.rn ?? 0));
    const totalMm = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.mm ?? 0));
    const totalLain = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.jenis_lainnya ?? 0));
    const indeksPinjal = rataIndeksPinjal(baris);
    const tsi = persenDari(totalTangkap, totalPasang);

    const spesies = [
      { nama: "RT", nilai: totalRt },
      { nama: "RN", nilai: totalRn },
      { nama: "MM", nilai: totalMm },
      { nama: "Lainnya", nilai: totalLain },
    ].sort((a, b) => b.nilai - a.nilai);

    // Rekap per wilayah kerja
    const kodeKeNama = (kode: string) => nama.get(kode) ?? kode;
    const perWilkerBernama = new Map<string, Akum>();
    for (const b of baris) {
      const k = kodeKeNama(b.kode_wilker ?? "-");
      const x = perWilkerBernama.get(k) ?? { pasang: 0, tangkap: 0, rt: 0, rn: 0, mm: 0, bobotPinjal: 0, isiPinjal: 0 };
      x.pasang += b.jml_trap_dipasang ?? 0;
      x.tangkap += b.jml_trap_tertangkap ?? 0;
      x.rt += b.rt ?? 0;
      x.rn += b.rn ?? 0;
      x.mm += b.mm ?? 0;
      const w = Number(b.jml_survei ?? 0);
      if (b.index_pinjal_rerata != null && w > 0) {
        x.bobotPinjal += w;
        x.isiPinjal += Number(b.index_pinjal_rerata) * w;
      }
      perWilkerBernama.set(k, x);
    }
    const tabel = Array.from(perWilkerBernama, ([w, v]) => ({ w, ...v })).sort((a, b) => b.tangkap - a.tangkap);

    // Grafik tren per wilayah kerja (batang ditumpuk; bulan tanpa data = kosong)
    const seriWilker = seriDariWilker(
      wilker,
      baris,
      (b) => b.kode_wilker,
      (rows) => {
        const arr: (number | null)[] = Array(bulanAkhir).fill(null);
        for (const b of rows) {
          const k = Number(b.bulan) - 1;
          if (k >= 0 && k < bulanAkhir) arr[k] = (arr[k] ?? 0) + (b.jml_trap_tertangkap ?? 0);
        }
        return arr;
      },
    );

    // Donat: urutan penting, indeks 0 = spesies (atas), indeks 1 = hasil trap (bawah)
    const donat: Donat[] = [];
    if (totalTangkap > 0) {
      donat.push({ judul: "Spesies Tikus Tertangkap", irisan: spesies.filter((s) => s.nilai > 0).map((s) => ({ label: s.nama, nilai: s.nilai })) });
    }
    if (totalPasang > 0) {
      donat.push({
        judul: `Hasil Trap | TSI ${desimal(tsi, 1)}%${indeksPinjal != null ? ` | Indeks Pinjal ${desimal(indeksPinjal, 2)}` : ""}`,
        irisan: [
          { label: "Tertangkap", nilai: totalTangkap, warna: "0A7A78" },
          { label: "Tidak tertangkap", nilai: Math.max(totalPasang - totalTangkap, 0), warna: "9FB3BB" },
        ].filter((s) => s.nilai > 0),
      });
    }

    const temuan: string[] = [];
    if (spesies[0].nilai > 0) temuan.push(`Tikus tertangkap terbanyak: ${spesies[0].nama} (${fmtAngka(spesies[0].nilai)} ekor).`);
    if (tabel[0] && tabel[0].tangkap > 0) temuan.push(`Penangkapan terbanyak di ${tabel[0].w} (${fmtAngka(tabel[0].tangkap)} ekor).`);
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
        { label: "Tikus tertangkap", nilai: fmtAngka(totalTangkap), catatan: `TSI ${desimal(tsi, 1)}%` },
        { label: "Diuji laboratorium", nilai: fmtAngka(diuji) },
        { label: "Hasil positif", nilai: fmtAngka(positif), nada: positif > 0 ? "bad" : undefined, catatan: "Leptospira, Pes, Hantavirus" },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: seriWilker.length > 0 ? seriWilker : [{ nama: "Tikus tertangkap", nilai: tangkap, warna: "0A7A78" }],
        satuan: "Jumlah tikus tertangkap",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Trap", "Tertangkap", "TSI (%)", "RT", "RN", "MM", "Indeks Pinjal"],
        kanan: [1, 2, 3, 4, 5, 6, 7],
        lebar: [2.4, 0.9, 1.3, 1, 0.7, 0.7, 0.7, 1.5],
        baris: [
          ...tabel.map((t) => [
            t.w,
            fmtAngka(t.pasang),
            fmtAngka(t.tangkap),
            desimal(persenDari(t.tangkap, t.pasang), 1),
            fmtAngka(t.rt),
            fmtAngka(t.rn),
            fmtAngka(t.mm),
            t.bobotPinjal > 0 ? desimal(t.isiPinjal / t.bobotPinjal, 2) : "-",
          ]),
          ["Total", fmtAngka(totalPasang), fmtAngka(totalTangkap), desimal(tsi, 1), fmtAngka(totalRt), fmtAngka(totalRn), fmtAngka(totalMm), indeksPinjal != null ? desimal(indeksPinjal, 2) : "-"],
        ],
      },
      donat: donat.length > 0 ? donat : undefined,
      temuan,
    };
  },
};