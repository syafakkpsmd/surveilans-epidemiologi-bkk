import "server-only";
import { getKategoriBreakdown, getRingkasanBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, jumlahPerWilker, temuanDeret, temuanWilker } from "./_bantu";

const JUDUL = "Pengawasan Keberangkatan Kapal";

/**
 * Urutan tampil wilayah kerja di grafik: Samarinda, Tanjung Santan,
 * Tanjung Laut, Lhoktuan, Sangatta, Sangkulirang.
 */
const URUTAN_WILKER = ["samarinda", "santan", "tanjunglaut", "lhoktuan", "sangatta", "sangkulirang"];
const WARNA_WILKER = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B"];
const WARNA_LAIN = "B8A24A";

function urutWilker(nama: string): number {
  const n = nama.toLowerCase().replace(/\s+/g, "");
  for (const k of URUTAN_WILKER) {
    if (n.includes(k)) return URUTAN_WILKER.indexOf(k);
  }
  return URUTAN_WILKER.length;
}

// 1. Ubah "tujuan" menjadi "tujuan_berlayar"
type KategoriLaporan = "rba" | "tujuan_berlayar" | "pelabuhan_tujuan";
interface NilaiJumlah { nilai: string; jumlah: number }

async function ambilKategori(kategori: KategoriLaporan, { tahun, bulanAkhir }: KonteksLaporan): Promise<NilaiJumlah[]> {
  // Casting (kategori as any) jika ingin lebih fleksibel dengan overload queries.ts
  const rows = await getKategoriBreakdown("phqc", "bulanan", { tahun, kategori: kategori as any });
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
    console.error(`[laporan:phqc] ${nama} gagal`, e);
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

function ringkasTujuan(data: NilaiJumlah[]): { label: string; nilai: number; warna: string }[] {
  let dalamNegeri = 0;
  let luarNegeri = 0;
  let lainnya = 0;

  for (const d of data) {
    const n = d.nilai.toLowerCase();
    if (n.includes("dalam") || n.includes("domestik") || n.includes("domestic")) {
      dalamNegeri += d.jumlah;
    } else if (n.includes("luar") || n.includes("internasional") || n.includes("ocean")) {
      luarNegeri += d.jumlah;
    } else {
      lainnya += d.jumlah;
    }
  }

  const hasil = [
    { label: "Dalam Negeri (Domestic)", nilai: dalamNegeri, warna: "0A7A78" },
    { label: "Luar Negeri (Ocean Going)", nilai: luarNegeri, warna: "C9781F" },
  ];
  if (lainnya > 0) {
    hasil.push({ label: "Lainnya / Tidak Diisi", nilai: lainnya, warna: "94A3B8" });
  }

  return hasil.filter((item) => item.nilai > 0);
}

export const modulPhqc: ModulLaporan = {
  kunci: "phqc",
  judul: JUDUL,
  kelompok: "Alat Angkut dan Orang",

  async ambil(konteks: KonteksLaporan): Promise<DataModul | null> {
    const { tahun, bulanAkhir } = konteks;
    
    // 1. Ambil data ringkasan bulanan PHQC
    const baris = (await getRingkasanBulanan("phqc", tahun)).filter((b) => b.bulan >= 1 && b.bulan <= bulanAkhir);
    if (baris.length === 0) return null;

    const kapal = jumlahPerBulan(baris, bulanAkhir, (b) => b.jumlah_kapal);
    const abk = jumlahPerBulan(baris, bulanAkhir, (b) => b.total_abk);
    const totalKapal = jumlah(kapal);
    if (totalKapal === 0) return null;

    // 2. Rekap Wilayah Kerja (Sesuai gambar_5, Penumpang sudah dihapus)
    const perWilker = jumlahPerWilker(baris, bulanAkhir, {
      kapal: (b) => b.jumlah_kapal,
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

    // 3. Ambil data kategori paralel (RBA, Tujuan Berlayar, Pelabuhan Tujuan)
    const [dataRba, dataTujuan, dataPelabuhan] = await Promise.all([
      aman(ambilKategori("rba", konteks), "RBA"),
      aman(ambilKategori("tujuan_berlayar", konteks), "tujuan berlayar"),
      aman(ambilKategori("pelabuhan_tujuan", konteks), "pelabuhan tujuan"),
    ]);

    const irisanRba = ringkasRba(dataRba);
    const irisanTujuan = ringkasTujuan(dataTujuan);
    const topPelabuhan = dataPelabuhan.slice(0, 10);

    // 4. Buat daftar Donat
    const donatList = [];
    if (irisanTujuan.length > 0) {
      donatList.push({ judul: "Tujuan Berlayar", irisan: irisanTujuan });
    }
    if (irisanRba.length > 0) {
      donatList.push({ judul: "Penilaian Risiko (RBA)", irisan: irisanRba });
    }

    // 5. Temuan Otomatis
    const temuan = [
      ...temuanDeret(kapal, "pemeriksaan kapal"),
      ...temuanWilker(perWilker.map((w) => ({ nama: w.nama, nilai: w.nilai.kapal })), "kapal"),
    ];

    return {
      kunci: "phqc",
      judul: JUDUL,
      kelompok: "Alat Angkut dan Orang",

      // Kartu Ringkasan
      kartu: [
        { label: "Jumlah Kapal (PHQC)", nilai: fmtAngka(totalKapal), catatan: labelRentang(tahun, bulanAkhir) },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(kapal[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(kapal[bulanAkhir - 1], kapal[bulanAkhir - 2]) : undefined },
        { label: "Total ABK Diperiksa", nilai: fmtAngka(jumlah(abk)), catatan: "orang ABK" },
        { label: "Rata-rata per bulan", nilai: fmtAngka(Math.round(totalKapal / bulanAkhir)), catatan: "kapal per bulan" },
      ],

      // Grafik Tren
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: seriWilker, satuan: "Jumlah kapal" },

      // Tabel Rincian per Wilayah Kerja
      tabel: {
        judul: "Rincian Pelayanan PHQC per Wilayah Kerja",
        kepala: ["Wilayah Kerja", "Jumlah Kapal", "ABK Diperiksa"],
        kanan: [1, 2],
        lebar: [4, 3, 3],
        baris: perWilker.map((w) => [w.nama, fmtAngka(w.nilai.kapal), fmtAngka(w.nilai.abk)]),
        padat: true,
      },

      // Diagram Donut
      donat: donatList.length > 0 ? donatList : undefined,

      // Grafik Batang Mendatar Pelabuhan Tujuan
      batangMendatar: topPelabuhan.length > 0
        ? [{ judul: "Pelabuhan Tujuan Utama (10 teratas)", item: topPelabuhan.map((p) => ({ label: p.nilai, nilai: p.jumlah })), satuan: "Jumlah kapal" }]
        : undefined,

      temuan,
    };
  },
};