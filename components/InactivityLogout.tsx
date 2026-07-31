"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/lib/auth/actions";

const BATAS_WAKTU_MS = 20 * 60 * 1000; // 20 menit
const EVENT_AKTIVITAS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const STORAGE_KEY = "lastActivityAt";
const THROTTLE_TULIS_MS = 5000; // jangan tulis ke localStorage lebih sering dari ini

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

    function lakukanLogout() {
      if (sudahLogoutRef.current) return; // cegah panggil logout() dobel
      sudahLogoutRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      localStorage.removeItem(STORAGE_KEY);
      logout();
    }

    // Jadwalkan timer logout berdasarkan sisa waktu dari last activity yang tersimpan,
    // bukan selalu mulai dari 20 menit penuh -- supaya idle yang sudah berjalan
    // (mis. tab background lama) langsung dihitung, bukan direset ulang.
    function jadwalkanTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);

      const lastActivity = ambilLastActivity();
      const sisaWaktu = BATAS_WAKTU_MS - (Date.now() - lastActivity);

      if (sisaWaktu <= 0) {
        lakukanLogout();
        return;
      }

      timerRef.current = setTimeout(lakukanLogout, sisaWaktu);
    }

    // Dipanggil tiap ada aktivitas: update localStorage (throttled) + reset timer.
    function tandaiAktivitas() {
      const now = Date.now();
      if (now - lastWriteRef.current >= THROTTLE_TULIS_MS) {
        tulisLastActivity(now);
        lastWriteRef.current = now;
      }
      jadwalkanTimer();
    }

    // Saat tab kembali terlihat (mis. user balik dari tab/app lain, atau buka
    // ulang browser dengan sesi lama) -- cek ulang, karena setTimeout bisa
    // di-throttle/berhenti total selagi tab tersembunyi.
    function saatTabTerlihatLagi() {
      if (document.visibilityState === "visible") {
        jadwalkanTimer();
      }
    }

    // Inisialisasi: pastikan ada timestamp awal, lalu cek langsung -- ini yang
    // menangani kasus "buka tab baru setelah lama idle di tab lain / browser sempat ditutup".
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