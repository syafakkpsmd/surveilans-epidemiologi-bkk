"use client";

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

interface FilterPeriodeWilayahProps {
  mode: "mingguan" | "bulanan";
  wilayah: Wilayah | "Semua";
}

/**
 * Filter toggle Mingguan/Bulanan + dropdown wilayah kerja, dipakai
 * bersama oleh halaman COP (Segmen 6) dan PHQC (Segmen 7). Generik
 * total -- tidak ada teks/logika spesifik satu modul.
 */
export function FilterPeriodeWilayah({ mode, wilayah }: FilterPeriodeWilayahProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigasi(modeBaru: "mingguan" | "bulanan", wilayahBaru: Wilayah | "Semua") {
    const params = new URLSearchParams();
    params.set("mode", modeBaru);
    params.set("wilayah", wilayahBaru);
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
    </div>
  );
}
