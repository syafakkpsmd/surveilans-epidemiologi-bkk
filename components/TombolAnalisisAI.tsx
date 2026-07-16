"use client";

import { useState } from "react";
import Link from "next/link";
import type { PeranUser } from "@/types/database.types";

interface TombolAnalisisAIProps {
  sudahLogin: boolean;
  role: PeranUser | null;
  konteks: string;
  periodeKey: string;
  wilayahKerja?: string;
  metrik?: string;
}

type HasilAnalisis = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dibuatPada?: string;
  dariCache: boolean;
};

export function TombolAnalisisAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
}: TombolAnalisisAIProps) {
  const [modalTerbuka, setModalTerbuka] = useState<"login" | "hasil" | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);

  async function jalankanAnalisis(paksaPerbarui: boolean) {
    setMemuat(true);
    setError(null);
    try {
      const res = await fetch("/api/analisis-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          konteks,
          periode_key: periodeKey,
          wilayah_kerja: wilayahKerja ?? null,
          metrik: metrik ?? null,
          paksaPerbarui,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Analisis AI gagal dijalankan.");
      }
      setHasil(data as HasilAnalisis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis AI gagal dijalankan.");
    } finally {
      setMemuat(false);
    }
  }

  function tanganiKlik() {
    if (!sudahLogin) {
      setModalTerbuka("login");
      return;
    }
    setModalTerbuka("hasil");
    void jalankanAnalisis(false);
  }

  function tutupModal() {
    setModalTerbuka(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={tanganiKlik}
        aria-disabled={!sudahLogin}
        className={
          sudahLogin
            ? "rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            : "rounded-control bg-border px-4 py-2 text-sm font-semibold text-muted cursor-not-allowed"
        }
        title={sudahLogin ? "Jalankan Analisis AI" : "Login untuk mengakses Analisis AI"}
      >
        {sudahLogin ? "Jalankan Analisis AI" : "🔒 Analisis AI"}
      </button>

      {role === "admin" && (
        <Link
          href="/admin/pengaturan-ai"
          className="rounded-control border border-border px-2.5 py-2 text-sm text-muted transition-colors hover:text-ink"
          title="Atur provider AI"
        >
          ⚙ Atur AI
        </Link>
      )}

      {modalTerbuka && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={tutupModal}
        >
          <div
            className="w-full max-w-md rounded-card bg-surface p-6 shadow-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {modalTerbuka === "login" ? (
              <>
                <h3 className="mb-2 text-base font-bold text-ink">Silakan Login</h3>
                <p className="mb-4 text-sm text-muted">
                  Analisis AI hanya tersedia untuk Petugas dan Admin yang sudah login.
                </p>
                <Link
                  href="/login"
                  className="block w-full rounded-control bg-navy px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-teal"
                >
                  Ke Halaman Login
                </Link>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-ink">Analisis AI</h3>
                  <button
                    type="button"
                    onClick={tutupModal}
                    className="text-sm text-muted hover:text-ink"
                    aria-label="Tutup"
                  >
                    ✕
                  </button>
                </div>

                {memuat && (
                  <p className="py-6 text-center text-sm text-muted">Menganalisis data…</p>
                )}

                {!memuat && error && (
                  <div className="mb-3 rounded-control border border-risiko-merah/30 bg-risiko-merah/10 px-3 py-2 text-sm text-risiko-merah">
                    {error}
                  </div>
                )}

                {!memuat && hasil && (
                  <div className="space-y-4">
                    {hasil.dariCache && (
                      <span className="inline-block rounded-pill bg-border/60 px-3 py-1 text-xs font-medium text-muted">
                        Hasil dari cache hari ini
                      </span>
                    )}

                    <Bagian judul="Ringkasan Tren" isi={hasil.ringkasan} />
                    <Bagian judul="Deteksi Anomali" isi={hasil.anomali} />
                    <Bagian judul="Rekomendasi" isi={hasil.rekomendasi} />

                    {hasil.providerDipakai && (
                      <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => void jalankanAnalisis(true)}
                      className="w-full rounded-control border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-bg"
                    >
                      🔄 Perbarui Analisis
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Bagian({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{judul}</h4>
      <p className="text-sm text-ink whitespace-pre-line">{isi}</p>
    </div>
  );
}