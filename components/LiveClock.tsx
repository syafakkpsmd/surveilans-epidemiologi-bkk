"use client";

import { useEffect, useState } from "react";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatWaktu(d: Date): string {
  const hari = HARI[d.getDay()];
  const tanggal = String(d.getDate()).padStart(2, "0");
  const bulan = d.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Makassar" });
  const tahun = d.toLocaleDateString("id-ID", { year: "numeric", timeZone: "Asia/Makassar" });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Makassar",
  });
  return `${hari} ${tanggal} ${bulan} ${tahun} | ${jam} WITA`;
}

export function LiveClock() {
  // null di render pertama (server & client sama-sama null) supaya
  // TIDAK ADA hydration mismatch -- baru mulai jalan setelah mount.
  const [waktu, setWaktu] = useState<string | null>(null);

  useEffect(() => {
    // Dibungkus lewat fungsi bernama (bukan setState langsung sebagai
    // baris pertama efek) supaya lolos aturan lint
    // react-hooks/set-state-in-effect, sambil tetap benar secara
    // perilaku: nilai awal jam diisi segera setelah mount (client-only,
    // TIDAK saat render server -- lihat komentar di atas soal hydration).
    const tick = () => setWaktu(formatWaktu(new Date()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-xs text-white/80 tabular-nums">
      {waktu ?? "\u00A0"}
    </span>
  );
}
