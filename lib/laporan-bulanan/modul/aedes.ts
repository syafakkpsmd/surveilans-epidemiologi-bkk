import "server-only";
import { getRingkasanVektorAktivitasBulanan, getRingkasanVektorDbdBulanan } from "@/lib/supabase/queriesVektorBreakdown";
import { BULAN, fmtAngka, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal, indeksBulanDariLabel, jumlah } from "./_bantu";
import { getWilkerRef } from "@/lib/supabase/queries";
import { seriPerWilker } from "./_perWilker";

const BATAS_HI = 1; // standar: HI tidak boleh lebih dari 1%
const WARNA_WILKER = ["0A7A78", "C9781F", "10293A", "6B8E9B", "2A7A4B", "7A5C99", "3F6FB5"]; // tanpa merah, agar tidak sama dengan garis ambang
const WARNA_AMBANG = "DC2626";
const namaPendek = (n: string) => n.replace(/^(Pelabuhan|Bandara)\s+/i, "");
const JUDUL = "Surveilans Vektor Aedes (DBD)";

export const modulAedes: ModulLaporan = {
  kunci: "aedes",
  judul: JUDUL,
  kelompok: "Vektor",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const bulanDari = `${tahun}-01`;
    const bulanSampai = `${tahun}-${String(bulanAkhir).padStart(2, "0")}`;
    const [indeks, aktivitas] = await Promise.all([
      getRingkasanVektorDbdBulanan({ tahun, bulanDari, bulanSampai }),
      getRingkasanVektorAktivitasBulanan({ tahun, bulanDari, bulanSampai }),
    ]);
    // HI per wilayah kerja (7 wilker aktif: WK01 sampai WK07)
    const daftarWilker = (await getWilkerRef().catch(() => [])).filter((w) => w.kode <= "WK07");
    const hiPerWilker = await Promise.all(
      daftarWilker.map(async (w) => {
        const rows = await getRingkasanVektorDbdBulanan({ tahun, bulanDari, bulanSampai, kodeWilker: w.kode }).catch(() => []);
        const nilai = deretDariLabel(rows, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.hi_rerata, null);
        return { nama: namaPendek(w.nama), nilai };
      }),
    );
    if (indeks.length === 0 && aktivitas.length === 0) return null;
    const seriWilker = await seriPerWilker(
      (kode) => getRingkasanVektorDbdBulanan({ tahun, bulanDari, bulanSampai, kodeWilker: kode }),
      (rows) => deretDariLabel(rows, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.hi_rerata, null),
    );

    // HI, CI, BI, ABJ: rata-rata nilai survei per bulan. Bulan tanpa survei = null.
    const hi = deretDariLabel(indeks, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.hi_rerata, null);
    const ci = deretDariLabel(indeks, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.ci_rerata, null);
    const abj = deretDariLabel(indeks, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.abj_rerata, null);
    const bi = deretDariLabel(indeks, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.bi_rerata, null);

    const rumah = deretDariLabel(aktivitas, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.rumah_diperiksa, 0) as number[];
    const rumahPos = deretDariLabel(aktivitas, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.rumah_positif, 0) as number[];
    const kontainer = deretDariLabel(aktivitas, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.container_diperiksa, 0) as number[];
    const kontainerPos = deretDariLabel(aktivitas, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => b.container_positif, 0) as number[];
    const larvasida = jumlah(aktivitas.filter((b) => indeksBulanDariLabel(b.bulanLabel, tahun) != null).map((b) => b.larvasida_gram));
    const fogHa = jumlah(aktivitas.filter((b) => indeksBulanDariLabel(b.bulanLabel, tahun) != null).map((b) => b.luas_wilayah_fogging_ha));
    const fogMl = jumlah(aktivitas.filter((b) => indeksBulanDariLabel(b.bulanLabel, tahun) != null).map((b) => b.jml_insektisida_fogging_ml));

    const i = bulanAkhir - 1;
    const label = labelBulanan(bulanAkhir);
    const temuan: string[] = [];
    const hiAda = hi.filter((v): v is number => v != null);
    if (hiAda.length >= 2) {
      const maks = Math.max(...hiAda);
      temuan.push(`HI tertinggi pada bulan ${BULAN[hi.indexOf(maks)]} (${desimal(maks)}%).`);
    }
    if (larvasida > 0 || fogHa > 0) {
      temuan.push(`Pengendalian: larvasida ${fmtAngka(larvasida)} gram; fogging ${desimal(fogHa)} ha dengan ${fmtAngka(fogMl)} ml insektisida.`);
    }
    const lewat = seriWilker
    .map((s) => ({ nama: s.nama, bulan: s.nilai.flatMap((v, k) => (v != null && v > BATAS_HI ? [BULAN[k].slice(0, 3)] : [])) }))
    .filter((x) => x.bulan.length > 0);
    const temuanAmbang =
      lewat.length > 0
        ? [`HI melebihi standar ${BATAS_HI}% (perlu tindakan): ${lewat.map((x) => `${x.nama} (${x.bulan.join(", ")})`).join("; ")}.`]
        : seriWilker.length > 0
          ? [`HI seluruh wilayah kerja tidak melebihi standar ${BATAS_HI}% sepanjang periode.`]
          : [];

    return {
      kunci: "aedes",
      judul: JUDUL,
      kelompok: "Vektor",
      kartu: [
        { label: "Rumah diperiksa", nilai: fmtAngka(jumlah(rumah)), catatan: `${fmtAngka(jumlah(rumahPos))} positif jentik` },
        { label: "Kontainer diperiksa", nilai: fmtAngka(jumlah(kontainer)), catatan: `${fmtAngka(jumlah(kontainerPos))} positif` },
        { label: `HI ${BULAN[i]}`, nilai: hi[i] == null ? "-" : `${desimal(hi[i])}%`, catatan: `CI ${ci[i] == null ? "-" : `${desimal(ci[i])}%`}`, nada: (hi[i] ?? 0) > BATAS_HI ? "bad" : undefined },
        { label: `ABJ ${BULAN[i]}`, nilai: abj[i] == null ? "-" : `${desimal(abj[i])}%`, catatan: labelRentang(tahun, bulanAkhir) },
      ],
      tren: {
        jenis: "batang",
        label,
        seri:
          seriWilker.length > 0
            ? seriWilker.map((s, k) => ({ nama: s.nama, nilai: s.nilai, warna: WARNA_WILKER[k % WARNA_WILKER.length] }))
            : [{ nama: "HI (%)", nilai: hi, warna: "E11D48" }],
        satuan: "HI (%)",
        garisAmbang: { nilai: BATAS_HI, label: `Batas standar ${BATAS_HI}%`, warna: WARNA_AMBANG },
      },
      tabel: {
        kepala: ["Bulan", "Rumah diperiksa", "Rumah positif", "Kontainer diperiksa", "Kontainer positif", "HI (%)", "CI (%)", "ABJ (%)"],
        kanan: [1, 2, 3, 4, 5, 6, 7],
        lebar: [1.4, 1.4, 1.3, 1.6, 1.5, 1, 1, 1],
        baris: label.map((nama, k) => [
          nama,
          fmtAngka(rumah[k]),
          fmtAngka(rumahPos[k]),
          fmtAngka(kontainer[k]),
          fmtAngka(kontainerPos[k]),
          hi[k] == null ? "-" : desimal(hi[k]),
          ci[k] == null ? "-" : desimal(ci[k]),
          abj[k] == null ? "-" : desimal(abj[k]),
        ]),
      },
            temuan: [...temuanAmbang, ...temuan, ...(bi[i] != null ? [`BI bulan ${BULAN[i]}: ${desimal(bi[i])}.`] : [])],
    };
  },
};