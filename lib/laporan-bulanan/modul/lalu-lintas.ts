import "server-only";
import { getPenumpangKapalMentah } from "@/lib/turso/queriesPenumpangKapal";
import { getAbkKapal, type SumberAbkKapal } from "@/lib/supabase/queriesAbkKapal";
import { getRingkasanPesawatBulanan } from "@/lib/supabase/queriesPesawat";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, Donat, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, temuanDeret } from "./_bantu";

const JUDUL = "Pengawasan Lalu Lintas Orang";
const TAG = "[laporan:lalu-lintas]";

// Bentuk baris sesuai tampilan dashboard Lalu Lintas Orang
type BarisPenumpangKapal = {
  tanggal_tiba: string;
  tanggal_berangkat: string;
  abk_datang: number;
  abk_berangkat: number;
  penumpang_datang: number;
  penumpang_berangkat: number;
};

type BarisAbkKapal = {
  tanggal: string;
  jumlah_abk: number;
};

async function aman<T>(p: Promise<T[]> | T[], nama: string): Promise<T[]> {
  try {
    return await p;
  } catch (e) {
    console.error(`${TAG} ${nama} gagal`, e);
    return [];
  }
}

/** Mengembalikan indeks bulan (0-11) jika tanggal jatuh pada tahun & rentang laporan, selain itu null */
function indeksBulan(nilai: unknown, tahun: number, bulanAkhir: number): number | null {
  const s = String(nilai ?? "").trim();
  if (!s) return null;

  let y: number;
  let m: number;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);

  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
  } else if (dmy) {
    y = Number(dmy[3]);
    m = Number(dmy[2]);
  } else {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    y = d.getFullYear();
    m = d.getMonth() + 1;
  }

  if (y !== tahun || m < 1 || m > bulanAkhir) return null;
  return m - 1;
}

/** Menjumlahkan nilai per bulan (Jan s.d. bulanAkhir) berdasarkan tanggal tiap baris */
function deretPerBulan<T>(
  baris: T[],
  bulanAkhir: number,
  tahun: number,
  ambilTanggal: (b: T) => unknown,
  ambilNilai: (b: T) => unknown
): number[] {
  const hasil = Array.from({ length: bulanAkhir }, () => 0);
  for (const b of baris) {
    const idx = indeksBulan(ambilTanggal(b), tahun, bulanAkhir);
    if (idx === null) continue;
    hasil[idx] += Number(ambilNilai(b)) || 0;
  }
  return hasil;
}

export const modulLaluLintas: ModulLaporan = {
  kunci: "lalu-lintas",
  judul: JUDUL,
  kelompok: "Alat Angkut dan Orang",
  async ambil(konteks: KonteksLaporan): Promise<DataModul | null> {
    const { tahun, bulanAkhir } = konteks;

    // 1. Ambil data dari sumber yang sama dengan dashboard Lalu Lintas Orang
    const filter = {
      tahun,
      granularitas: "bulanan" as const,
      awal: 1,
      akhir: bulanAkhir,
      wilker: undefined,
    };

    const [penumpangKapal, abkDatangLuar, abkDatangDalam, abkBerangkatLuar, abkBerangkatDalam, pesawat] =
      await Promise.all([
        aman(getPenumpangKapalMentah(filter) as Promise<BarisPenumpangKapal[]>, "Penumpang kapal (Turso)"),
        aman(getAbkKapal("kedatangan-luar-negeri" as SumberAbkKapal, filter) as Promise<BarisAbkKapal[]>, "ABK datang luar negeri"),
        aman(getAbkKapal("kedatangan-dalam-negeri" as SumberAbkKapal, filter) as Promise<BarisAbkKapal[]>, "ABK datang dalam negeri"),
        aman(getAbkKapal("keberangkatan-luar-negeri" as SumberAbkKapal, filter) as Promise<BarisAbkKapal[]>, "ABK berangkat luar negeri"),
        aman(getAbkKapal("keberangkatan-dalam-negeri" as SumberAbkKapal, filter) as Promise<BarisAbkKapal[]>, "ABK berangkat dalam negeri"),
        aman(getRingkasanPesawatBulanan({ tahun }), "Pesawat"),
      ]);

    // Filter & normalisasi data pesawat
    const psw = pesawat
      .map((p) => ({
        ...p,
        bulan: Number(String(p.bulan).includes("-") ? String(p.bulan).split("-")[1] : p.bulan),
      }))
      .filter((p) => p.bulan >= 1 && p.bulan <= bulanAkhir);

    // 2. Data Kedatangan (Bulan ke Bulan)
    const abkInterDatang = deretPerBulan(abkDatangLuar, bulanAkhir, tahun, (b) => b.tanggal, (b) => b.jumlah_abk);
    const abkDomestikDatang = deretPerBulan(abkDatangDalam, bulanAkhir, tahun, (b) => b.tanggal, (b) => b.jumlah_abk);
    const totalAbkDatang = abkInterDatang.map((v, idx) => v + abkDomestikDatang[idx]);

    const penumpangKapalDatang = deretPerBulan(
      penumpangKapal, bulanAkhir, tahun, (b) => b.tanggal_tiba, (b) => b.penumpang_datang
    );
    const crewPesawatDatang = jumlahPerBulan(psw, bulanAkhir, (b) => b.crew_datang ?? 0);
    const penumpangPesawatDatang = jumlahPerBulan(psw, bulanAkhir, (b) => b.penumpang_datang ?? 0);

    // 3. Data Keberangkatan (Bulan ke Bulan)
    const abkInterBerangkat = deretPerBulan(abkBerangkatLuar, bulanAkhir, tahun, (b) => b.tanggal, (b) => b.jumlah_abk);
    const abkDomestikBerangkat = deretPerBulan(abkBerangkatDalam, bulanAkhir, tahun, (b) => b.tanggal, (b) => b.jumlah_abk);
    const totalAbkBerangkat = abkInterBerangkat.map((v, idx) => v + abkDomestikBerangkat[idx]);

    const penumpangKapalBerangkat = deretPerBulan(
      penumpangKapal, bulanAkhir, tahun, (b) => b.tanggal_berangkat, (b) => b.penumpang_berangkat
    );
    const crewPesawatBerangkat = jumlahPerBulan(psw, bulanAkhir, (b) => b.crew_berangkat ?? 0);
    const penumpangPesawatBerangkat = jumlahPerBulan(psw, bulanAkhir, (b) => b.penumpang_berangkat ?? 0);

    // Agregasi Total Kedatangan & Keberangkatan per Bulan
    const datang = totalAbkDatang.map(
      (v, idx) => v + penumpangKapalDatang[idx] + crewPesawatDatang[idx] + penumpangPesawatDatang[idx]
    );

    const berangkat = totalAbkBerangkat.map(
      (v, idx) => v + penumpangKapalBerangkat[idx] + crewPesawatBerangkat[idx] + penumpangPesawatBerangkat[idx]
    );

    console.log(`${TAG} baris terbaca`, {
      penumpangKapal: penumpangKapal.length,
      abkDatangLuar: abkDatangLuar.length,
      abkDatangDalam: abkDatangDalam.length,
      abkBerangkatLuar: abkBerangkatLuar.length,
      abkBerangkatDalam: abkBerangkatDalam.length,
      pesawat: psw.length,
    });

    if (jumlah(datang) + jumlah(berangkat) === 0) return null;
    const i = bulanAkhir - 1;

    // 4. Hitung Irisan Donat (Domestik vs Internasional)
    // Penumpang kapal & pesawat tidak punya pemisahan luar/dalam negeri di sumbernya, dihitung Domestik
    const datangInternasional = jumlah(abkInterDatang);
    const datangDomestik =
      jumlah(abkDomestikDatang) +
      jumlah(penumpangKapalDatang) +
      jumlah(crewPesawatDatang) +
      jumlah(penumpangPesawatDatang);

    const berangkatInternasional = jumlah(abkInterBerangkat);
    const berangkatDomestik =
      jumlah(abkDomestikBerangkat) +
      jumlah(penumpangKapalBerangkat) +
      jumlah(crewPesawatBerangkat) +
      jumlah(penumpangPesawatBerangkat);

    // 5. Menyusun Donat Diagram
    const donatList: Donat[] = [];

    if (datangDomestik + datangInternasional > 0) {
      donatList.push({
        judul: "Kedatangan (Domestik vs Internasional)",
        irisan: [
          { label: "Dalam Negeri (Domestik)", nilai: datangDomestik, warna: "0A7A78" },
          { label: "Luar Negeri (Internasional)", nilai: datangInternasional, warna: "C9781F" },
        ].filter((item) => item.nilai > 0),
      });
    }

    if (berangkatDomestik + berangkatInternasional > 0) {
      donatList.push({
        judul: "Keberangkatan (Domestik vs Internasional)",
        irisan: [
          { label: "Dalam Negeri (Domestik)", nilai: berangkatDomestik, warna: "0A7A78" },
          { label: "Luar Negeri (Internasional)", nilai: berangkatInternasional, warna: "C9781F" },
        ].filter((item) => item.nilai > 0),
      });
    }

    // Rincian Komponen untuk Tabel
    const komponen: [string, number[], string][] = [
      ["ABK Kapal", totalAbkDatang, "Kedatangan"],
      ["Penumpang Kapal", penumpangKapalDatang, "Kedatangan"],
      ["Crew Pesawat", crewPesawatDatang, "Kedatangan"],
      ["Penumpang Pesawat", penumpangPesawatDatang, "Kedatangan"],
      ["ABK Kapal", totalAbkBerangkat, "Keberangkatan"],
      ["Penumpang Kapal", penumpangKapalBerangkat, "Keberangkatan"],
      ["Crew Pesawat", crewPesawatBerangkat, "Keberangkatan"],
      ["Penumpang Pesawat", penumpangPesawatBerangkat, "Keberangkatan"],
    ];

    return {
      kunci: "lalu-lintas",
      judul: JUDUL,
      kelompok: "Alat Angkut dan Orang",
      kartu: [
        { label: "Total Kedatangan", nilai: fmtAngka(jumlah(datang)), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Total Keberangkatan", nilai: fmtAngka(jumlah(berangkat)), catatan: labelRentang(tahun, bulanAkhir) },
        {
          label: `Kedatangan ${BULAN[i]}`,
          nilai: fmtAngka(datang[i]),
          catatan: bulanAkhir >= 2 ? fmtPerubahan(datang[i], datang[i - 1]) : undefined,
        },
        {
          label: `Keberangkatan ${BULAN[i]}`,
          nilai: fmtAngka(berangkat[i]),
          catatan: bulanAkhir >= 2 ? fmtPerubahan(berangkat[i], berangkat[i - 1]) : undefined,
        },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Keberangkatan", nilai: berangkat, warna: "C9781F" },
          { nama: "Kedatangan", nilai: datang, warna: "0A7A78" },
        ],
        satuan: "Jumlah orang",
      },
      tabel: {
        kepala: ["Arah", "Komponen", "Total", `Bulan ${BULAN[i]}`],
        kanan: [2, 3],
        lebar: [1.6, 2.6, 1.3, 1.5],
        baris: komponen
          .filter(([, deret]) => jumlah(deret) > 0)
          .map(([nama, deret, arah]) => [
            arah,
            nama,
            fmtAngka(jumlah(deret)),
            fmtAngka(deret[i] ?? 0),
          ]),
      },
      donat: donatList.length > 0 ? donatList : undefined,
      temuan: [
        ...temuanDeret(datang, "orang datang").slice(0, 1),
        ...temuanDeret(berangkat, "orang berangkat").slice(0, 1),
      ],
    };
  },
};