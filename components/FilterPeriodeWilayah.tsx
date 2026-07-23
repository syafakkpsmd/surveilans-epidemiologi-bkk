"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Wilayah } from "@/types/database.types";

const DAFTAR_WILAYAH: Wilayah[] = [
  "Samarinda",
  "TanjungSantan",
  "TanjungLaut",
  "Lhoktuan",
  "Sangatta",
  "Sangkulirang",
];

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const DAFTAR_MINGGU = Array.from({ length: 53 }, (_, i) => i + 1);

interface FilterPeriodeWilayahProps {
  mode: "mingguan" | "bulanan";
  wilayah: Wilayah | "Semua";

  /**
   * Filter rentang minggu/bulan -- OPSIONAL. Kalau tidak diisi (mis.
   * halaman PHQC yang belum pakai fitur ini), picker rentang tidak
   * dirender sama sekali dan perilaku komponen ini PERSIS seperti
   * sebelumnya (hanya toggle mode + dropdown wilayah).
   *
   * Pemanggil (page.tsx) bertanggung jawab menghitung nilai default
   * awal/akhir (mis. minggu-1 s.d. minggu epid berjalan) dan membaca
   * balik query param `minggu_awal`/`minggu_akhir`/`bulan_awal`/
   * `bulan_akhir` dari searchParams.
   */
  tampilkanRentang?: boolean;
  mingguAwal?: number;
  mingguAkhir?: number;
  bulanAwal?: number;
  bulanAkhir?: number;
}

/**
 * Filter toggle Mingguan/Bulanan + dropdown wilayah kerja, dipakai
 * bersama oleh halaman COP (Segmen 6) dan PHQC (Segmen 7). Sejak
 * penambahan filter rentang minggu/bulan (opsional lewat
 * tampilkanRentang), komponen ini TETAP generik -- tidak ada teks
 * spesifik satu modul, hanya field rentang yang bisa dinyalakan per
 * pemanggil.
 */
export function FilterPeriodeWilayah({
  mode,
  wilayah,
  tampilkanRentang = false,
  mingguAwal,
  mingguAkhir,
  bulanAwal,
  bulanAkhir,
}: FilterPeriodeWilayahProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State sementara untuk pilihan rentang, sebelum tombol "Terapkan"
  // ditekan -- supaya ganti dropdown minggu/bulan tidak langsung
  // navigasi per klik (sama pola dengan TppClient/TtuClient/PabClient).
  const [tempMingguAwal, setTempMingguAwal] = useState<number>(mingguAwal ?? 1);
  const [tempMingguAkhir, setTempMingguAkhir] = useState<number>(mingguAkhir ?? 1);
  const [tempBulanAwal, setTempBulanAwal] = useState<number>(bulanAwal ?? 1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState<number>(bulanAkhir ?? 1);

  // Sinkronkan ulang state sementara kalau nilai dari URL berubah
  // (mis. setelah navigasi selesai, atau load pertama kali).
  useEffect(() => {
    if (mingguAwal !== undefined) setTempMingguAwal(mingguAwal);
    if (mingguAkhir !== undefined) setTempMingguAkhir(mingguAkhir);
  }, [mingguAwal, mingguAkhir]);

  useEffect(() => {
    if (bulanAwal !== undefined) setTempBulanAwal(bulanAwal);
    if (bulanAkhir !== undefined) setTempBulanAkhir(bulanAkhir);
  }, [bulanAwal, bulanAkhir]);

  function bangunParams(
    modeBaru: "mingguan" | "bulanan",
    wilayahBaru: Wilayah | "Semua",
    override?: { mingguAwal?: number; mingguAkhir?: number; bulanAwal?: number; bulanAkhir?: number }
  ) {
    const params = new URLSearchParams();
    params.set("mode", modeBaru);
    params.set("wilayah", wilayahBaru);

    if (tampilkanRentang) {
      const mgAwal = override?.mingguAwal ?? mingguAwal;
      const mgAkhir = override?.mingguAkhir ?? mingguAkhir;
      const blAwal = override?.bulanAwal ?? bulanAwal;
      const blAkhir = override?.bulanAkhir ?? bulanAkhir;

      if (mgAwal !== undefined) params.set("minggu_awal", String(mgAwal));
      if (mgAkhir !== undefined) params.set("minggu_akhir", String(mgAkhir));
      if (blAwal !== undefined) params.set("bulan_awal", String(blAwal));
      if (blAkhir !== undefined) params.set("bulan_akhir", String(blAkhir));
    }

    return params;
  }

  function navigasi(modeBaru: "mingguan" | "bulanan", wilayahBaru: Wilayah | "Semua") {
    const params = bangunParams(modeBaru, wilayahBaru);
    router.push(`${pathname}?${params.toString()}`);
  }

  function terapkanRentang() {
    const params = bangunParams(mode, wilayah, {
      mingguAwal: tempMingguAwal,
      mingguAkhir: tempMingguAkhir,
      bulanAwal: tempBulanAwal,
      bulanAkhir: tempBulanAkhir,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigasi("mingguan", wilayah)}
          className={
            mode === "mingguan"
              ? "rounded-pill bg-navy px-4 py-1.5 text-sm font-semibold text-white"
              : "rounded-pill border border-border px-4 py-1.5 text-sm font-semibold text-ink"
          }
        >
          Mingguan
        </button>
        <button
          type="button"
          onClick={() => navigasi("bulanan", wilayah)}
          className={
            mode === "bulanan"
              ? "rounded-pill bg-navy px-4 py-1.5 text-sm font-semibold text-white"
              : "rounded-pill border border-border px-4 py-1.5 text-sm font-semibold text-ink"
          }
        >
          Bulanan
        </button>
      </div>

      <select
        value={wilayah}
        onChange={(e) => navigasi(mode, e.target.value as Wilayah | "Semua")}
        className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-ink"
      >
        <option value="Semua">Semua Wilayah</option>
        {DAFTAR_WILAYAH.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>

      {tampilkanRentang && (
        <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-2 py-1.5">
          {mode === "mingguan" ? (
            <>
              <span className="text-xs font-medium text-muted">Mg</span>
              <select
                value={tempMingguAwal}
                onChange={(e) => setTempMingguAwal(Number(e.target.value))}
                className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                {DAFTAR_MINGGU.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-xs text-muted">s/d</span>
              <select
                value={tempMingguAkhir}
                onChange={(e) => setTempMingguAkhir(Number(e.target.value))}
                className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                {DAFTAR_MINGGU.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select
                value={tempBulanAwal}
                onChange={(e) => setTempBulanAwal(Number(e.target.value))}
                className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                {NAMA_BULAN.map((b, idx) => (
                  <option key={b} value={idx + 1}>{b}</option>
                ))}
              </select>
              <span className="text-xs text-muted">s/d</span>
              <select
                value={tempBulanAkhir}
                onChange={(e) => setTempBulanAkhir(Number(e.target.value))}
                className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                {NAMA_BULAN.map((b, idx) => (
                  <option key={b} value={idx + 1}>{b}</option>
                ))}
              </select>
            </>
          )}

          <button
            type="button"
            onClick={terapkanRentang}
            className="rounded-control bg-navy px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
          >
            Terapkan
          </button>
        </div>
      )}
    </div>
  );
}