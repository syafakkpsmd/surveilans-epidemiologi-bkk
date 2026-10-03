import "server-only";
import { ambilHivRaw, hitungDistribusi, hitungRingkasanHiv } from "@/lib/turso/hiv";
import type { HivRow } from "@/lib/turso/hiv";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { persenDari } from "./_bantu";

const JUDUL = "Surveilans HIV";

const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

export const modulHiv: ModulLaporan = {
  kunci: "hiv",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const semua = await ambilHivRaw(tahun);
    const rows = semua.filter((r) => {
      const b = bulanDari(r.tanggal_kegiatan);
      return b != null && b <= bulanAkhir;
    });
    if (rows.length === 0) return null;

    const ringkas = hitungRingkasanHiv(rows);
    const perWilker = new Map<string, { periksa: number; reaktif: number }>();
    const periksaBulan = new Array<number>(bulanAkhir).fill(0);
    const reaktifBulan = new Array<number>(bulanAkhir).fill(0);
    for (const r of rows) {
      const w = perWilker.get(r.wilayah_kerja) ?? { periksa: 0, reaktif: 0 };
      w.periksa += 1;
      if (r.hasil === "Reaktif") w.reaktif += 1;
      perWilker.set(r.wilayah_kerja, w);
      const b = bulanDari(r.tanggal_kegiatan)!;
      periksaBulan[b - 1] += 1;
      if (r.hasil === "Reaktif") reaktifBulan[b - 1] += 1;
    }
    const tabel = Array.from(perWilker, ([w, v]) => ({ w, ...v })).sort((a, b) => b.periksa - a.periksa);

    const reagen = hitungDistribusi(rows, "jenis_reagen" as keyof HivRow).sort((a, b) => b.jumlah - a.jumlah);
    const i = bulanAkhir - 1;

    const temuan: string[] = [`Hasil reaktif ${fmtAngka(ringkas.jumlahReaktif)} dari ${fmtAngka(ringkas.totalPemeriksaan)} pemeriksaan (${fmtPersen(ringkas.persenReaktif)}).`];
    if (ringkas.hubunganBerisikoYa > 0) temuan.push(`${fmtAngka(ringkas.hubunganBerisikoYa)} orang memiliki riwayat hubungan berisiko (${fmtPersen(persenDari(ringkas.hubunganBerisikoYa, ringkas.totalPemeriksaan))}).`);
    if (tabel.length > 1 && tabel[0].periksa > 0) temuan.push(`Pemeriksaan terbanyak di wilayah kerja ${tabel[0].w} (${fmtAngka(tabel[0].periksa)}).`);

    return {
      kunci: "hiv",
      judul: JUDUL,
      kelompok: "Surveilans",
      kartu: [
        { label: "Total pemeriksaan", nilai: fmtAngka(ringkas.totalPemeriksaan), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Reaktif", nilai: fmtAngka(ringkas.jumlahReaktif), nada: ringkas.jumlahReaktif > 0 ? "warn" : "ok", catatan: fmtPersen(ringkas.persenReaktif) },
        { label: "Kunjungan baru", nilai: fmtAngka(ringkas.kunjunganBaru) },
        { label: `Pemeriksaan ${BULAN[i]}`, nilai: fmtAngka(periksaBulan[i]) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Diperiksa", nilai: periksaBulan, warna: "0A7A78" },
          { nama: "Reaktif", nilai: reaktifBulan, warna: "B3362C" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Diperiksa", "Reaktif", "% Reaktif"],
        kanan: [1, 2, 3],
        lebar: [3, 1.3, 1.3, 1.4],
        baris: tabel.map((t) => [t.w, fmtAngka(t.periksa), fmtAngka(t.reaktif), fmtPersen(persenDari(t.reaktif, t.periksa))]),
      },
      temuan,
      narasi: reagen.length > 0 ? [`Jenis reagen yang paling sering dipakai: ${reagen.map((r) => `${r.label} (${fmtAngka(r.jumlah)})`).join(", ")}.`] : undefined,
    };
  },
};
