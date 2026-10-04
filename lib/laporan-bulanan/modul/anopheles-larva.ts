import "server-only";
import {
  getTrenLarva,
  getMacamTempatPerindukan,
  getKeadaanTempatPerindukan,
} from "@/lib/supabase/queries";
import { BULAN, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { deretDariLabel, desimal, jumlah } from "./_bantu";
import { seriPerWilker } from "./_perWilker";

const JUDUL = "Surveilans Vektor Larva Anopheles";
const fmtAngka = (n: number) => new Intl.NumberFormat("id-ID").format(n);

interface BarisBulanLarva {
  bulanLabel: string;
  cidukan?: number;
  larva?: number;
  suhu?: number;
}

interface ItemDistribusi {
  name?: string;
  label?: string;
  value?: number;
  jumlah?: number;
}

const KUNCI_LABEL = ["name", "label", "nama", "kategori", "macam", "keadaan", "kondisi"];
const KUNCI_NILAI = ["value", "jumlah", "total", "count", "nilai"];

/** Ubah hasil query distribusi menjadi Donat; null jika tidak ada data > 0. */
function susunDonat(judul: string, raw: unknown): Donat | null {
  const daftar = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
  const irisan = daftar
    .map((it) => {
      const entri = Object.entries(it);
      const kunciLabel =
        KUNCI_LABEL.find((k) => typeof it[k] === "string") ??
        entri.find(([k, v]) => typeof v === "string" && !/^(warna|color|fill)$/i.test(k))?.[0];
      const kunciNilai =
        KUNCI_NILAI.find((k) => it[k] != null && Number.isFinite(Number(it[k]))) ??
        entri.find(([, v]) => typeof v === "number")?.[0];
      return {
        label: String((kunciLabel && it[kunciLabel]) ?? "").trim() || "Lainnya",
        nilai: Number((kunciNilai && it[kunciNilai]) ?? 0),
      };
    })
    .filter((x) => Number.isFinite(x.nilai) && x.nilai > 0)
    .sort((a, b) => b.nilai - a.nilai);
  return irisan.length > 0 ? { judul, irisan } : null;
}

/** Persentase perubahan; null jika pembanding 0 / tidak ada. */
function persenPerubahan(sekarang: number, sebelum: number | undefined): number | null {
  if (sebelum == null || sebelum <= 0) return null;
  return ((sekarang - sebelum) / sebelum) * 100;
}

export const modulAnophelesLarva: ModulLaporan = {
  kunci: "anopheles-larva",
  judul: JUDUL,
  kelompok: "Vektor",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const gagal = (nama: string) => (e: unknown) => {
      console.error(`[laporan] anopheles-larva: gagal ambil ${nama}`, e);
      return [];
    };

    const [barisRaw, macamRaw, keadaanRaw] = await Promise.all([
      getTrenLarva(tahun, undefined, "bulanan").catch(gagal("tren larva")),
      getMacamTempatPerindukan(tahun, undefined).catch(gagal("macam tempat perindukan")),
      getKeadaanTempatPerindukan(tahun, undefined).catch(gagal("keadaan tempat perindukan")),
    ]);

    const baris = barisRaw as unknown as BarisBulanLarva[];
    if (!baris || baris.length === 0) return null;

    const ambil = (f: (b: BarisBulanLarva) => number): number[] =>
      deretDariLabel(baris, tahun, bulanAkhir, (b) => b.bulanLabel, f, 0).map(
        (v) => v ?? 0,
      );

    const cidukan = ambil((b) => b.cidukan ?? 0);
    const larva = ambil((b) => b.larva ?? 0);
    const suhu = ambil((b) => b.suhu ?? 0);

    const totalLarva = jumlah(larva);
    const totalCidukan = jumlah(cidukan);
    if (totalLarva + totalCidukan === 0) return null;

    const i = bulanAkhir - 1;
    const label = labelBulanan(bulanAkhir);
    // Larva per wilayah kerja. Bulan tanpa survei (cidukan 0) = null, survei tanpa larva = 0.
    const seriWilker = await seriPerWilker(
      (kode) => getTrenLarva(tahun, kode, "bulanan").then((r) => r as unknown as BarisBulanLarva[]),
      (rows) =>
        deretDariLabel(rows, tahun, bulanAkhir, (b) => b.bulanLabel, (b) => ((b.cidukan ?? 0) > 0 ? (b.larva ?? 0) : null), null),
    );
    const totalWilker = seriWilker
      .map((s) => ({ nama: s.nama, total: jumlah(s.nilai.map((v) => v ?? 0)) }))
      .sort((a, b) => b.total - a.total);

    const suhuAda = suhu.filter((v) => v > 0);
    const rataSuhu = suhuAda.length ? jumlah(suhuAda) / suhuAda.length : null;
    const minSuhu = suhuAda.length ? Math.min(...suhuAda) : null;
    const maksSuhu = suhuAda.length ? Math.max(...suhuAda) : null;

    const maksLarva = Math.max(...larva);
    const ubahLarva = persenPerubahan(larva[i], larva[i - 1]);

    // Donat tempat perindukan
    const donat = [
      susunDonat("Macam Tempat Perindukan", macamRaw),
      susunDonat("Keadaan Tempat Perindukan", keadaanRaw),
    ].filter((d): d is Donat => d !== null);

    // Temuan
    const temuan: string[] = [];
    if (maksLarva > 0) {
      temuan.push(
        `Puncak penemuan larva Anopheles terjadi pada bulan ${
          BULAN[larva.indexOf(maksLarva)]
        } dengan ${fmtAngka(maksLarva)} ekor larva.`,
      );
    }
        if (totalWilker[0] && totalWilker[0].total > 0) {
      temuan.push(`Larva terbanyak ditemukan di ${totalWilker[0].nama} (${fmtAngka(totalWilker[0].total)} ekor).`);
    }
    if (ubahLarva != null) {
      temuan.push(
        `Larva pada ${BULAN[i]} ${ubahLarva >= 0 ? "naik" : "turun"} ${desimal(
          Math.abs(ubahLarva),
          1,
        )}% dibanding ${BULAN[i - 1]}.`,
      );
    }
    if (totalCidukan > 0) {
      temuan.push(
        `Kepadatan larva rata-rata ${desimal(
          totalLarva / totalCidukan,
          2,
        )} larva per cidukan (${labelRentang(tahun, bulanAkhir)}).`,
      );
    }
    const dominan = donat[0]?.irisan[0];
    const totalDominan = donat[0] ? jumlah(donat[0].irisan.map((x) => x.nilai)) : 0;
    if (dominan && totalDominan > 0) {
      temuan.push(
        `Tempat perindukan terbanyak: ${dominan.label} (${desimal(
          (dominan.nilai / totalDominan) * 100,
          1,
        )}% dari seluruh tempat perindukan yang disurvei).`,
      );
    }

    return {
      kunci: "anopheles-larva",
      judul: JUDUL,
      kelompok: "Vektor",
      kartu: [
        {
          label: "Total Cidukan",
          nilai: fmtAngka(totalCidukan),
          catatan: labelRentang(tahun, bulanAkhir),
        },
        {
          label: "Total Larva Ditemukan",
          nilai: fmtAngka(totalLarva),
          catatan: labelRentang(tahun, bulanAkhir),
        },
        {
          label: `Larva ${BULAN[i]}`,
          nilai: fmtAngka(larva[i]),
          catatan: `Cidukan: ${fmtAngka(cidukan[i])}`,
        },
        {
          label: "Suhu Rata-Rata Air",
          nilai: rataSuhu == null ? "-" : `${desimal(rataSuhu, 1)} °C`,
          catatan:
            minSuhu != null && maksSuhu != null
              ? `Kisaran ${desimal(minSuhu, 1)}–${desimal(maksSuhu, 1)} °C`
              : undefined,
        },
      ],
      tren: {
        jenis: "batang",
        label,
        seri: [
          ...(seriWilker.length > 0
            ? seriWilker
            : [{ nama: "Jumlah Larva", nilai: larva, warna: "DC2626" }]),
          { nama: "Suhu (°C)", nilai: suhu.map((v) => (v > 0 ? v : null)), warna: "E11D48", garis: true, sumbuKanan: 1 as const },
        ],
        satuan: "Jumlah larva",
      },
      tabel: {
        kepala: ["Bulan", "Jumlah Cidukan", "Jumlah Larva", "Suhu (°C)"],
        kanan: [1, 2, 3],
        lebar: [1.6, 1.5, 1.5, 1.2],
        baris: [
          ...label.map((namaBulan, k) => [
            namaBulan,
            fmtAngka(cidukan[k]),
            fmtAngka(larva[k]),
            suhu[k] > 0 ? desimal(suhu[k], 1) : "-",
          ]),
          [
            "Total / rata-rata",
            fmtAngka(totalCidukan),
            fmtAngka(totalLarva),
            rataSuhu == null ? "-" : desimal(rataSuhu, 1),
          ],
        ],
      },
      donat: donat.length > 0 ? donat : undefined,
      temuan,
    };
  },
};