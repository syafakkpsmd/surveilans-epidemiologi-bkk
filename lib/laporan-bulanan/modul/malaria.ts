import "server-only";
import { getDonatPekerjaanMigrasiMalaria, getDonatUsiaMigrasiMalaria, getTrenBulananRdtGender } from "@/lib/turso/queriesMigrasiMalaria";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { desimal, jumlah, persenDari } from "./_bantu";
import { seriPerWilker } from "./_perWilker";

const JUDUL = "Surveilans Migrasi Malaria";

/** Urutan kelompok usia pada donat; label harus sama dengan hasil query getDonatUsiaMigrasiMalaria. */
const URUTAN_USIA = ["0-14 th", "15-24 th", "25-34 th", "35-44 th", "45-54 th", "55+ th", "Tidak diisi"];

function keDonatUsia(rows: { label: string; jumlah: number }[]): Donat | null {
  const irisan = URUTAN_USIA.map((l) => ({ label: l, nilai: rows.find((r) => r.label === l)?.jumlah ?? 0 })).filter((x) => x.nilai > 0);
  return irisan.length > 0 ? { judul: "Kelompok Usia Responden", irisan } : null;
}

/** Enam pekerjaan terbanyak, sisanya digabung menjadi "Lainnya". */
function keDonatPekerjaan(rows: { label: string; jumlah: number }[], maks = 6): Donat | null {
  const urut = rows.filter((r) => r.jumlah > 0).sort((a, b) => b.jumlah - a.jumlah);
  const sisa = urut.slice(maks).reduce((s, r) => s + r.jumlah, 0);
  const irisan = [...urut.slice(0, maks).map((r) => ({ label: r.label, nilai: r.jumlah })), ...(sisa > 0 ? [{ label: "Lainnya", nilai: sisa }] : [])];
  return irisan.length > 0 ? { judul: "Pekerjaan Responden", irisan } : null;
}

export const modulMalaria: ModulLaporan = {
  kunci: "malaria",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const periode = { tahun, bulanDari: 1, bulanSampai: bulanAkhir };
    const [tren, usiaRows, kerjaRows] = await Promise.all([
      getTrenBulananRdtGender(periode),
      getDonatUsiaMigrasiMalaria(periode).catch((e: unknown) => {
        console.error("[laporan] malaria: gagal ambil donat usia", e);
        return [];
      }),
      getDonatPekerjaanMigrasiMalaria(periode).catch((e: unknown) => {
        console.error("[laporan] malaria: gagal ambil donat pekerjaan", e);
        return [];
      }),
    ]);
    const responden = tren.map((t) => t.diperiksa);
    const positif = tren.map((t) => t.positif_rdt);
    const total = jumlah(responden);
    if (total === 0) return null;
    const i = bulanAkhir - 1;
    const totalPositif = jumlah(positif);
    const label = labelBulanan(bulanAkhir);

    // Grafik per wilayah kerja (batang ditumpuk). Bulan tanpa responden = kosong.
    const seriWilker = await seriPerWilker(
      (kode) => getTrenBulananRdtGender({ ...periode, kodeWilker: kode }),
      (rows) => Array.from({ length: bulanAkhir }, (_, k) => ((rows[k]?.diperiksa ?? 0) > 0 ? rows[k].diperiksa : null)),
    );
    const totalWilker = seriWilker
      .map((s) => ({ nama: s.nama, total: jumlah(s.nilai.map((v) => v ?? 0)) }))
      .sort((a, b) => b.total - a.total);

    // Donat: indeks 0 = usia (atas), indeks 1 = pekerjaan (bawah)
    const donat = [keDonatUsia(usiaRows), keDonatPekerjaan(kerjaRows)].filter((d): d is Donat => d !== null);

    const temuan: string[] = [
      totalPositif > 0
        ? `Ditemukan ${fmtAngka(totalPositif)} hasil RDT positif selama ${labelRentang(tahun, bulanAkhir)}.`
        : "Tidak ditemukan hasil RDT positif pada periode ini.",
    ];
    if (totalWilker[0] && totalWilker[0].total > 0) temuan.push(`Responden terbanyak di ${totalWilker[0].nama} (${fmtAngka(totalWilker[0].total)} orang).`);

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
        seri:
          seriWilker.length > 0
            ? seriWilker
            : [
                { nama: "Responden", nilai: responden, warna: "0A7A78" },
                { nama: "Positif RDT", nilai: positif, warna: "B3362C" },
              ],
        satuan: "Jumlah responden",
      },
      tabel: {
        kepala: ["Bulan", "Responden", "Laki-laki", "Perempuan", "Positif RDT"],
        kanan: [1, 2, 3, 4],
        lebar: [1.6, 1.2, 1.2, 1.3, 1.3],
        baris: tren.map((t, k) => [label[k], fmtAngka(t.diperiksa), fmtAngka(t.laki_laki), fmtAngka(t.perempuan), fmtAngka(t.positif_rdt)]),
      },
      donat: donat.length > 0 ? donat : undefined,
      temuan,
    };
  },
};