"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/lib/auth/actions";

const BATAS_WAKTU_MS = 10 * 60 * 1000;
const EVENT_AKTIVITAS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const STORAGE_KEY = "lastActivityAt";
const THROTTLE_TULIS_MS = 5000;

export function InactivityLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWriteRef = useRef(0);
  const sudahLogoutRef = useRef(false);

  useEffect(() => {
    function ambilLastActivity(): number {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : Date.now();
    }

    function tulisLastActivity(ts: number) {
      localStorage.setItem(STORAGE_KEY, String(ts));
    }

    // === GANTI FUNGSI INI (tambah `async`) ===
    async function lakukanLogout() {
      if (sudahLogoutRef.current) return;
      sudahLogoutRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      localStorage.removeItem(STORAGE_KEY);
      try {
        await logout();
      } catch {
        // redirect() dari server action memang throw secara internal, ini normal
      } finally {
        window.location.href = "/login";
      }
    }
    // === SAMPAI SINI ===

    function jadwalkanTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      const lastActivity = ambilLastActivity();
      const sisaWaktu = BATAS_WAKTU_MS - (Date.now() - lastActivity);

      if (sisaWaktu <= 0) {
        lakukanLogout(); // tetap boleh dipanggil tanpa await di sini
        return;
      }
      timerRef.current = setTimeout(lakukanLogout, sisaWaktu); // setTimeout terima callback async, tidak masalah
    }

    function tandaiAktivitas() {
      const now = Date.now();
      if (now - lastWriteRef.current >= THROTTLE_TULIS_MS) {
        tulisLastActivity(now);
        lastWriteRef.current = now;
      }
      jadwalkanTimer();
    }

    function saatTabTerlihatLagi() {
      if (document.visibilityState === "visible") {
        jadwalkanTimer();
      }
    }

    if (!localStorage.getItem(STORAGE_KEY)) {
      tulisLastActivity(Date.now());
    }
    jadwalkanTimer();

    EVENT_AKTIVITAS.forEach((event) => window.addEventListener(event, tandaiAktivitas));
    document.addEventListener("visibilitychange", saatTabTerlihatLagi);

    return () => {
      EVENT_AKTIVITAS.forEach((event) => window.removeEventListener(event, tandaiAktivitas));
      document.removeEventListener("visibilitychange", saatTabTerlihatLagi);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}