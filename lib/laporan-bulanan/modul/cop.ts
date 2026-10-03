import "server-only";
import { getKategoriBreakdown, getRingkasanBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, temuanDeret, temuanWilker } from "./_bantu";

const JUDUL = "Pengawasan Kedatangan Kapal dari Luar Negeri";

/**
 * Urutan tampil wilayah kerja di grafik: Samarinda, APT Pranoto, Tanjung Santan,
 * Tanjung Laut, Lhoktuan, Sangatta, Sangkulirang.
 */
const URUTAN_WILKER = ["samarinda", "pranoto", "santan", "tanjunglaut", "lhoktuan", "sangatta", "sangkulirang"];
const WARNA_WILKER = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B", "7A5C99"];
const WARNA_LAIN = "B8A24A";

function urutWilker(nama: string): number {
  const n = nama.toLowerCase().replace(/\s+/g, "");
  const cek = [...URUTAN_WILKER.slice(1), URUTAN_WILKER[0]];
  for (const k of cek) if (n.includes(k)) return URUTAN_WILKER.indexOf(k);
  return URUTAN_WILKER.length;
}

type KategoriLaporan = "rba" | "negara_kedatangan" | "daerah_terjangkit";
interface NilaiJumlah { nilai: string; jumlah: number }

async function ambilKategori(kategori: KategoriLaporan, { tahun, bulanAkhir }: KonteksLaporan): Promise<NilaiJumlah[]> {
  const rows = await getKategoriBreakdown("cop", "bulanan", { tahun, kategori });
  const peta = new Map<string, number>();
  for (const r of rows) {
    const bulan = r.bulan ?? 0;
    if (bulan < 1 || bulan > bulanAkhir) continue;
    const nilai = r.nilai?.trim() || "Tidak diisi";
    peta.set(nilai, (peta.get(nilai) ?? 0) + (r.jumlah ?? 0));
  }
  return [...peta].map(([nilai, jml]) => ({ nilai, jumlah: jml })).sort((a, b) => b.jumlah - a.jumlah);
}

async function aman<T>(p: Promise<T[]>, nama: string): Promise<T[]> {
  try {
    return await p;
  } catch (e) {
    console.error(`[laporan:cop] ${nama} gagal`, e);
    return [];
  }
}

function ringkasRba(data: NilaiJumlah[]): { label: string; nilai: number; warna: string }[] {
  const label = ["Risiko Tinggi", "Risiko Sedang", "Risiko Rendah", "Tidak Diisi"];
  const warna = ["B3362C", "C9781F", "2A7A4B", "94A3B8"];
  const total = [0, 0, 0, 0];
  for (const d of data) {
    const n = d.nilai.toLowerCase();
    const i = n.includes("tinggi") || n === "merah" ? 0 : n.includes("sedang") || n === "kuning" ? 1 : n.includes("rendah") || n === "hijau" ? 2 : 3;
    total[i] += d.jumlah;
  }
  return label
    .map((l, i) => ({ label: l, nilai: total[i], warna: warna[i] }))
    .filter((item) => item.nilai > 0);
}

function statusDaerah(nilai: string): "sehat" | "terjangkit" | "lain" {
  const n = nilai.toLowerCase().trim();
  if (n.includes("tidak") || n.includes("sehat")) return "sehat";
  if (n === "ya" || n.includes("terjangkit") || n.includes("ada")) return "terjangkit";
  return "lain";
}

export const modulCop: ModulLaporan = {
  kunci: "cop",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil(konteks: KonteksLaporan): Promise<DataModul | null> {
    const { tahun, bulanAkhir } = konteks;
    const baris = (await getRingkasanBulanan("cop", tahun)).filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
    if (baris.length === 0) return null;

    const kapal = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_kapal);
    const abk = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk);
    const wni = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk_wni));
    const wna = jumlah(jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk_wna));
    const totalKapal = jumlah(kapal);
    if (totalKapal === 0) return null;

    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      kapal: (b) => b.jumlah_kapal,
      wni: (b) => b.total_abk_wni,
      wna: (b) => b.total_abk_wna,
      abk: (b) => b.total_abk,
    });

    const wilkerDari = (b: (typeof baris)[number]) => b.wilayah_kerja;
    const seriWilker = [...new Set(baris.map(wilkerDari))]
      .map((k) => {
        const sub = baris.filter((b) => wilkerDari(b) === k);
        const nama = jumlahPerWilker(sub, bulanAkhir, { kapal: (b) => b.jumlah_kapal })[0]?.nama ?? String(k);
        return { nama, nilai: jumlahPerBulan(sub, bulanAkhir, (b) => b.jumlah_kapal) };
      })
      .filter((s) => jumlah(s.nilai) > 0)
      .map((s) => ({ nama: s.nama, nilai: s.nilai, urut: urutWilker(s.nama) }))
      .sort((a, b) => a.urut - b.urut)
      .map(({ nama, nilai, urut }) => ({ nama, nilai, warna: WARNA_WILKER[urut] ?? WARNA_LAIN }));

    const [dataRba, dataNegara, dataDaerah] = await Promise.all([
      aman(ambilKategori("rba", konteks), "RBA"),
      aman(ambilKategori("negara_kedatangan", konteks), "negara kedatangan"),
      aman(ambilKategori("daerah_terjangkit", konteks), "daerah terjangkit"),
    ]);

    const irisanRba = ringkasRba(dataRba);

    let jmlSehat = 0;
    let jmlTerjangkit = 0;
    let jmlLain = 0;
    for (const d of dataDaerah) {
      const s = statusDaerah(d.nilai);
      if (s === "sehat") jmlSehat += d.jumlah;
      else if (s === "terjangkit") jmlTerjangkit += d.jumlah;
      else jmlLain += d.jumlah;
    }
    const irisanDaerah = [
      { label: "Sehat", nilai: jmlSehat, warna: "2A7A4B" },
      { label: "Terjangkiti", nilai: jmlTerjangkit, warna: "B3362C" },
      { label: "Belum terklasifikasi", nilai: jmlLain, warna: "94A3B8" },
    ].filter((i) => i.nilai > 0);

    const top = dataNegara.slice(0, 10);

    const temuan = [
      ...temuanDeret(kapal, "kapal"),
      ...temuanWilker(perWilker.map((w) => ({ nama: w.nama, nilai: w.nilai.kapal })), "kapal"),
    ];
    if (jmlTerjangkit > 0) {
      const pct = Math.round((jmlTerjangkit / (jmlSehat + jmlTerjangkit)) * 100);
      temuan.push(`${fmtAngka(jmlTerjangkit)} kapal (${pct}%) datang dari daerah terjangkit.`);
    }

    const donatList = [];
    if (irisanRba.length > 0) {
      donatList.push({ judul: "Hasil Risk-Based Assessment (RBA)", irisan: irisanRba });
    }
    if (irisanDaerah.length > 0) {
      donatList.push({ judul: "Status daerah asal kapal", irisan: irisanDaerah });
    }

    return {
      kunci: "cop",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Jumlah kapal (COP)", nilai: fmtAngka(totalKapal), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kapal[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(kapal[bulanAkhir - 1], kapal[bulanAkhir - 2]) : undefined },
        { label: "Total ABK", nilai: fmtAngka(jumlah(abk)), catatan: `WNI ${fmtAngka(wni)}, WNA ${fmtAngka(wna)}` },
        { label: "Rata-rata per bulan", nilai: fmtAngka(Math.round(totalKapal / bulanAkhir)), catatan: "kapal per bulan" },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: seriWilker, satuan: "Jumlah kapal" },
      tabel: {
        kepala: ["Wilayah kerja", "Kapal", "ABK WNI", "ABK WNA", "Total ABK"],
        kanan: [1, 2, 3, 4],
        lebar: [3, 1, 1, 1, 1],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.kapal), fmtAngka(w.nilai.wni), fmtAngka(w.nilai.wna), fmtAngka(w.nilai.abk)]),
        padat: true,
      },
      donat: donatList.length > 0 ? donatList : undefined,
      batangMendatar: top.length > 0
        ? [{ judul: "Negara kedatangan (10 teratas)", item: top.map((n) => ({ label: n.nilai, nilai: n.jumlah })), satuan: "Jumlah kapal" }]
        : undefined,
      temuan,
    };
  },
};