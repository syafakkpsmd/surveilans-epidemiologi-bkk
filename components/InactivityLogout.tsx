"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/lib/auth/actions";

const BATAS_WAKTU_MS = 20 * 60 * 1000; // 20 menit
const EVENT_AKTIVITAS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function InactivityLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, BATAS_WAKTU_MS);
    }

    EVENT_AKTIVITAS.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      EVENT_AKTIVITAS.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}