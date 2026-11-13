import { NAMA_BKK } from '@/lib/konfigurasi/instansi';
import { NAMA_PENGEMBANG, ASAL_PENGEMBANG } from '@/lib/konfigurasi/pengembang';

export function Footer() {
  const tahun = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border bg-surface px-4 py-4 text-center text-xs text-muted">
      <div>{NAMA_BKK} · Ditjen P2, Kementerian Kesehatan RI · {tahun}</div>
      <div className="mt-1">Dikembangkan oleh {NAMA_PENGEMBANG} · {ASAL_PENGEMBANG}</div>
    </footer>
  );
}