import "server-only";
import { ambilHivRaw, hitungDistribusi, hitungRingkasanHiv } from "@/lib/turso/hiv";
import type { HivRow } from "@/lib/turso/hiv";
import { getWilkerRef } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { persenDari } from "./_bantu";
import { KELOMPOK_USIA, WARNA_GENDER, WARNA_YA_TIDAK, keDonat, labelGender, labelTeks, labelUsia, labelYaTidak, umurPada } from "./_donat";
import { seriDariWilker } from "./_perWilker";

const JUDUL = "Surveilans HIV";

const bulanDari = (iso: string | null): number | null => {
  if (!iso || iso.length < 7) return null;
  const b = Number(iso.slice(5, 7));
  return b >= 1 && b <= 12 ? b : null;
};

interface BarisKarakteristik {
  tanggal_kegiatan?: string | null;
  sex?: string | null;
  tanggal_lahir?: string | null;
  status_perkawinan?: string | null;
  hubungan_berisiko?: string | null;
}

export const modulHiv: ModulLaporan = {
  kunci: "hiv",
  judul: JUDUL,
  kelompok: "Surveilans",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const [semua, wilkerRef] = await Promise.all([ambilHivRaw(tahun), getWilkerRef()]);
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

    // Grafik per wilayah kerja (batang berdampingan; bulan tanpa pemeriksaan = kosong).
    // Nama/kode wilayah di data dicocokkan ke daftar wilker supaya warnanya sama dengan grafik lain.
    const daftarWilker = wilkerRef as unknown as { kode: string; nama: string }[];
    const petaKode = new Map<string, string>();
    for (const w of daftarWilker) {
      petaKode.set(w.kode.toLowerCase(), w.kode);
      petaKode.set(w.nama.toLowerCase(), w.kode);
      petaKode.set(w.nama.replace(/^(Pelabuhan|Bandara)\s+/i, "").toLowerCase(), w.kode);
    }
    const kodeDari = (teks: string | null) => petaKode.get((teks ?? "").trim().toLowerCase()) ?? null;
    const seriWilker = seriDariWilker(
      daftarWilker,
      rows,
      (r) => kodeDari(r.wilayah_kerja),
      (rs) => {
        const arr: (number | null)[] = Array(bulanAkhir).fill(null);
        for (const r of rs) {
          const b = bulanDari(r.tanggal_kegiatan);
          if (b != null) arr[b - 1] = (arr[b - 1] ?? 0) + 1;
        }
        return arr;
      },
    );

    // Donat: urutan penting, 0 jenis kelamin, 1 usia, 2 status perkawinan, 3 hubungan berisiko
    const k = rows as unknown as BarisKarakteristik[];
    const donat = [
      keDonat("Jenis Kelamin", k.map((r) => labelGender(r.sex)), { urutan: ["Laki-laki", "Perempuan", "Tidak diisi"], warna: WARNA_GENDER }),
      keDonat("Kelompok Usia", k.map((r) => labelUsia(umurPada(r.tanggal_lahir, r.tanggal_kegiatan))), { urutan: [...KELOMPOK_USIA.map((x) => x.label), "Tidak diisi"] }),
      keDonat("Status Perkawinan", k.map((r) => labelTeks(r.status_perkawinan)), { maks: 5 }),
      keDonat("Hubungan Berisiko", k.map((r) => labelYaTidak(r.hubungan_berisiko)), { urutan: ["Ya", "Tidak", "Tidak diisi"], warna: WARNA_YA_TIDAK }),
    ].filter((d): d is Donat => d !== null);

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
          ...(seriWilker.length > 0
            ? seriWilker
            : [{ nama: "Diperiksa", nilai: periksaBulan, warna: "0A7A78" }]),
          // Reaktif seluruh wilayah; bulan tanpa pemeriksaan = kosong, bukan 0
          { nama: "Reaktif", nilai: reaktifBulan.map((v, k) => (periksaBulan[k] > 0 ? v : null)), warna: "B3362C", garis: true, sumbuKanan: 1 as const },
        ],
        satuan: "Jumlah orang diperiksa",
      },
      tabel: {
        kepala: ["Wilayah kerja", "Diperiksa", "Reaktif", "% Reaktif"],
        kanan: [1, 2, 3],
        lebar: [3, 1.3, 1.3, 1.4],
        baris: tabel.map((t) => [t.w, fmtAngka(t.periksa), fmtAngka(t.reaktif), fmtPersen(persenDari(t.reaktif, t.periksa))]),
      },
      donat: donat.length > 0 ? donat : undefined,
      temuan,
      narasi: reagen.length > 0 ? [`Jenis reagen yang paling sering dipakai: ${reagen.map((r) => `${r.label} (${fmtAngka(r.jumlah)})`).join(", ")}.`] : undefined,
    };
  },
};