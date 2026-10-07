'use client';

import { useEffect } from 'react';

/**
 * Mendaftarkan service worker (hanya di production) dan meminta SW menyimpan
 * halaman form + aset-nya selagi online. Juga meminta penyimpanan "persisten"
 * supaya data antrian offline tidak mudah dihapus browser.
 */
export default function RegistrasiOffline() {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});

    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (navigator.onLine) reg.active?.postMessage({ tipe: 'simpan-halaman-form' });
      })
      .catch(() => {});
  }, []);

  return null;
}
