"use client";

import { useState } from "react";
import Link from "next/link";
import type { PeranUser } from "@/types/database.types";

interface PanelAnalisisAIProps {
  sudahLogin: boolean;
  role: PeranUser | null;
  konteks: string;
  periodeKey: string;
  wilayahKerja?: string;
}

type HasilAnalisis = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dariCache: boolean;
};

export function PanelAnalisisAI({
  sudahLogin,
  konteks,
  periodeKey,
  wilayahKerja,
}: PanelAnalisisAIProps) {
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);

  async function jalankan(paksaPerbarui: boolean) {
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
          paksaPerbarui,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analisis AI gagal dijalankan.");
      setHasil(data as HasilAnalisis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis AI gagal dijalankan.");
    } finally {
      setMemuat(false);
    }
  }

  function tanganiKlik() {
    setTerbuka(true);
    if (sudahLogin && !hasil) void jalankan(false);
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Analisis AI</span>
        <button
          type="button"
          onClick={tanganiKlik}
          className={
            sudahLogin
              ? "rounded-control bg-teal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              : "rounded-control bg-border px-3 py-1.5 text-xs font-semibold text-muted cursor-not-allowed"
          }
        >
          {sudahLogin ? "✨ Jalankan Analisis AI" : "🔒 Analisis AI"}
        </button>
      </div>

      {terbuka && !sudahLogin && (
        <div className="mt-3 rounded-control border border-border bg-bg px-4 py-3 text-sm text-muted">
          Silakan{" "}
          <Link href="/login" className="font-semibold text-teal hover:underline">
            login
          </Link>{" "}
          untuk mengakses Analisis AI.
        </div>
      )}

      {terbuka && sudahLogin && (
        <div className="mt-3 space-y-3 rounded-control border border-border bg-bg px-4 py-3">
          {memuat && <p className="text-sm text-muted">Menganalisis data…</p>}
          {!memuat && error && <p className="text-sm text-risiko-merah">{error}</p>}
          {!memuat && hasil && (
            <div className="space-y-3">
              {hasil.dariCache && (
                <span className="inline-block rounded-pill bg-border/60 px-3 py-1 text-xs font-medium text-muted">
                  Hasil dari cache hari ini
                </span>
              )}
              <Bagian judul="Ringkasan" isi={hasil.ringkasan} />
              <Bagian judul="Perlu Diwaspadai" isi={hasil.anomali} />
              <Bagian judul="Rekomendasi" isi={hasil.rekomendasi} />
              {hasil.providerDipakai && (
                <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
              )}
              <button
                type="button"
                onClick={() => void jalankan(true)}
                className="rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface"
              >
                🔄 Perbarui Analisis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Bagian({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{judul}</h4>
      <p className="whitespace-pre-line text-sm text-ink">{isi}</p>
    </div>
  );
}