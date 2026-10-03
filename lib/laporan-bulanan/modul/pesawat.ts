import "server-only";
import { getKotaPesawatBulanan } from "@/lib/supabase/queries";
import { BULAN, fmtAngka, fmtPerubahan, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { jumlah, jumlahPerBulan, temuanDeret } from "./_bantu";

const JUDUL = "Pengawasan Alat Angkut Pesawat";
const MAKS_KOTA = 8;

export const modulPesawat: ModulLaporan = {
  kunci: "pesawat",
  judul: JUDUL,
  kelompok: "Faktor Risiko",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const [datang, berangkat] = await Promise.all([getKotaPesawatBulanan(tahun, "kedatangan"), getKotaPesawatBulanan(tahun, "keberangkatan")]);
    const dalam = <T extends { bulan: number }>(a: T[]) => a.filter((b) => Number(b.bulan) >= 1 && Number(b.bulan) <= bulanAkhir);
    const d = dalam(datang);
    const k = dalam(berangkat);
    if (d.length + k.length === 0) return null;

    const flightDatang = jumlahPerBulan(d, bulanAkhir, (b) => b.jumlah_penerbangan);
    const flightBerangkat = jumlahPerBulan(k, bulanAkhir, (b) => b.jumlah_penerbangan);
    const flightTotal = flightDatang.map((v, i) => v + flightBerangkat[i]);
    const penumpang = jumlah(jumlahPerBulan(d, bulanAkhir, (b) => b.total_penumpang)) + jumlah(jumlahPerBulan(k, bulanAkhir, (b) => b.total_penumpang));
    const totalFlight = jumlah(flightTotal);
    if (totalFlight === 0) return null;

    // 1. UBAH DI SINI: Pisahkan penumpangan datang dan penumpang berangkat pada Map & fungsi tambah
    const peta = new Map<string, { datang: number; berangkat: number; penumpangDatang: number; penumpangBerangkat: number }>();
    const tambah = (b: { kota: string; jumlah_penerbangan: number; total_penumpang: number }, arah: "datang" | "berangkat") => {
      const x = peta.get(b.kota) ?? { datang: 0, berangkat: 0, penumpangDatang: 0, penumpangBerangkat: 0 };
      x[arah] += Number(b.jumlah_penerbangan) || 0;
      if (arah === "datang") {
        x.penumpangDatang += Number(b.total_penumpang) || 0;
      } else {
        x.penumpangBerangkat += Number(b.total_penumpang) || 0;
      }
      peta.set(b.kota, x);
    };
    d.forEach((b) => tambah(b, "datang"));
    k.forEach((b) => tambah(b, "berangkat"));
    const kota = Array.from(peta, ([nama, v]) => ({ nama, ...v })).sort((a, b) => b.datang + b.berangkat - (a.datang + a.berangkat));

    return {
      kunci: "pesawat",
      judul: JUDUL,
      kelompok: "Faktor Risiko",
      kartu: [
        { label: "Penerbangan", nilai: fmtAngka(totalFlight), catatan: `Berangkat ${fmtAngka(jumlah(flightBerangkat))}, Datang ${fmtAngka(jumlah(flightDatang))}` },
        { label: `Bulan ${BULAN[bulanAkhir - 1]}`, nilai: fmtAngka(flightTotal[bulanAkhir - 1]), catatan: bulanAkhir >= 2 ? fmtPerubahan(flightTotal[bulanAkhir - 1], flightTotal[bulanAkhir - 2]) : undefined },
        { label: "Total penumpang", nilai: fmtAngka(penumpang), catatan: labelRentang(tahun, bulanAkhir) },
      ],
      tren: {
        jenis: "batang",
        label: labelBulanan(bulanAkhir),
        seri: [
          { nama: "Keberangkatan", nilai: flightBerangkat, warna: "C9781F" },          
          { nama: "Kedatangan", nilai: flightDatang, warna: "0A7A78" },
        ],
        satuan: "Jumlah penerbangan",
      },

      // 2. UBAH DI SINI: Konfigurasi tabel disesuaikan menjadi 5 kolom
      tabel: {
        kepala: ["Kota asal/tujuan", "Flight Datang", "Flight Berangkat", "Psg Datang", "Psg Berangkat"],
        kanan: [1, 2, 3, 4], // Kolom indeks 1 sampai 4 diatur rata kanan
        lebar: [2.5, 1.1, 1.1, 1.1, 1.1], // Proporsi lebar 5 kolom
        baris: kota.slice(0, MAKS_KOTA).map((c) => [
          c.nama,
          fmtAngka(c.datang),
          fmtAngka(c.berangkat),
          fmtAngka(c.penumpangDatang),
          fmtAngka(c.penumpangBerangkat),
        ]),
      },

      temuan: [
        ...temuanDeret(flightTotal, "penerbangan"),
        ...(kota.length > 0 ? [`Kota asal/tujuan terbanyak: ${kota[0].nama} (${fmtAngka(kota[0].datang + kota[0].berangkat)} penerbangan).`] : []),
      ],
    };
  },
};