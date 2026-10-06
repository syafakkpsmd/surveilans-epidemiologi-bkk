"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";

/** Satu SUMBER DATA = satu checkbox. `key` = nama kolom di data. */
type SumberItem = {
  key: string;
  label: string;
  warna: string;
};

/**
 * Satu seri HASIL yang digambar = jumlah dari sumber-sumber (yang dicentang)
 * di daftar `sumber`. `awalan` (opsional) ditambahkan di depan key sumber
 * saat membaca kolom data, mis. awalan "datang_" + sumber "abk_kapal"
 * membaca kolom `datang_abk_kapal`.
 */
type SeriesHasil = {
  key: string;
  label: string;
  warna: string;
  sumber: string[];
  awalan?: string;
};

type TrenChartPilihanSeriProps = {
  data: any[];
  /** Daftar checkbox (sumber data). */
  sumberList: SumberItem[];
  /**
   * Kalau kosong: tiap sumber yang dicentang digambar sebagai serinya sendiri.
   * Kalau diisi: yang digambar adalah seri-seri hasil ini (dijumlahkan dari
   * sumber yang dicentang). Seri yang semua sumbernya tidak dicentang disembunyikan.
   */
  seriesHasil?: SeriesHasil[];
  tipeChart?: "line" | "bar";
  tampilkanNilai?: boolean;
  pesanKosong?: string;
};

const AWALAN_HASIL = "__hasil_";

/**
 * Pembungkus TrenChartLine dengan checkbox SUMBER DATA yang diletakkan DI
 * BAWAH grafik. Kondisi "data kosong" ditangani di sini supaya state centang
 * tidak hilang saat rentang periode berubah.
 */
export default function TrenChartPilihanSeri({
  data,
  sumberList,
  seriesHasil,
  tipeChart = "line",
  tampilkanNilai = false,
  pesanKosong = "Belum ada data untuk rentang ini.",
}: TrenChartPilihanSeriProps) {
  const [dipilih, setDipilih] = useState<Set<string>>(() => new Set(sumberList.map((s) => s.key)));

  const toggle = (key: string) =>
    setDipilih((lama) => {
      const baru = new Set(lama);
      if (baru.has(key)) baru.delete(key);
      else baru.add(key);
      return baru;
    });

  const semuaDipilih = sumberList.every((s) => dipilih.has(s.key));

  const { dataTampil, seriesGambar } = useMemo(() => {
    if (!seriesHasil) {
      return {
        dataTampil: data,
        seriesGambar: sumberList.filter((s) => dipilih.has(s.key)),
      };
    }

    const aktif = seriesHasil.filter((h) => h.sumber.some((k) => dipilih.has(k)));
    const hitung = data.map((d) => {
      const baris: Record<string, any> = { ...d };
      aktif.forEach((h) => {
        baris[AWALAN_HASIL + h.key] = h.sumber
          .filter((k) => dipilih.has(k))
          .reduce((jumlah, k) => jumlah + (Number(d[(h.awalan ?? "") + k]) || 0), 0);
      });
      return baris;
    });
    return {
      dataTampil: hitung,
      seriesGambar: aktif.map((h) => ({ key: AWALAN_HASIL + h.key, label: h.label, warna: h.warna })),
    };
  }, [data, sumberList, seriesHasil, dipilih]);

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">{pesanKosong}</p>
      ) : seriesGambar.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Centang minimal satu sumber data untuk menampilkan grafik.
        </p>
      ) : (
        <TrenChartLine
          data={dataTampil}
          tipeChart={tipeChart}
          tampilkanNilai={tampilkanNilai}
          seriesList={seriesGambar}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
        <span className="font-semibold text-gray-500">Sumber data:</span>
        {sumberList.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-1.5 text-gray-700">
            <input
              type="checkbox"
              checked={dipilih.has(s.key)}
              onChange={() => toggle(s.key)}
              className="h-3.5 w-3.5 cursor-pointer"
              style={{ accentColor: s.warna }}
            />
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.warna }} />
            {s.label}
          </label>
        ))}
        <button
          type="button"
          onClick={() => setDipilih(new Set(semuaDipilih ? [] : sumberList.map((s) => s.key)))}
          className="ml-auto font-semibold text-[#0F4C5C] hover:underline"
        >
          {semuaDipilih ? "Kosongkan" : "Pilih semua"}
        </button>
      </div>
    </div>
  );
}