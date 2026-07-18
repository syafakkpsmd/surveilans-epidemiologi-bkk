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
  dibuatPada?: string;
};

const bolehGenerate = (role: PeranUser | null) => role === "admin" || role === "petugas";

export function PanelAnalisisAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
}: PanelAnalisisAIProps) {
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
  const [sudahDicek, setSudahDicek] = useState(false);

  function bangunQuery() {
    const params = new URLSearchParams({ konteks, periode_key: periodeKey, tipe: "analisis" });
    if (wilayahKerja) params.set("wilayah_kerja", wilayahKerja);
    return params.toString();
  }

  async function muatHasil() {
    setMemuat(true);
    setError(null);
    try {
      const res = await fetch(`/api/analisis-ai?${bangunQuery()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat hasil Analisis AI.");
      setHasil(data.ada ? data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat hasil Analisis AI.");
    } finally {
      setMemuat(false);
      setSudahDicek(true);
    }
  }

  async function jalankan() {
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
          paksaPerbarui: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analisis AI gagal dijalankan.");
      setHasil(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis AI gagal dijalankan.");
    } finally {
      setMemuat(false);
    }
  }

  function tanganiKlik() {
    setTerbuka(true);
    if (!sudahDicek) void muatHasil();
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Analisis AI</span>
        <button
          type="button"
          onClick={tanganiKlik}
          className="rounded-control bg-teal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
        >
          📊 Lihat Analisis AI
        </button>
      </div>

      {terbuka && (
        <div className="mt-3 space-y-3 rounded-control border border-border bg-bg px-4 py-3">
          {memuat && <p className="text-sm text-muted">Memuat…</p>}
          {!memuat && error && <p className="text-sm text-risiko-merah">{error}</p>}

          {!memuat && !error && hasil && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {hasil.dibuatPada
                  ? `Diperbarui ${new Date(hasil.dibuatPada).toLocaleString("id-ID")}`
                  : "Hasil terakhir"}{" "}
                · dapat dilihat siapa saja.
              </p>
              <Bagian judul="Ringkasan" isi={hasil.ringkasan} />
              <Bagian judul="Perlu Diwaspadai" isi={hasil.anomali} />
              <Bagian judul="Rekomendasi" isi={hasil.rekomendasi} />
              {hasil.providerDipakai && (
                <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
              )}
            </div>
          )}

          {!memuat && !error && !hasil && (
            <p className="text-sm text-muted">Belum ada Analisis AI untuk periode ini.</p>
          )}

          {!memuat && bolehGenerate(role) && (
            <button
              type="button"
              onClick={() => void jalankan()}
              className="rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface"
            >
              {hasil ? "🔄 Jalankan Ulang Analisis" : "✨ Jalankan Analisis AI"}
            </button>
          )}

          {!memuat && !bolehGenerate(role) && (
            <p className="text-xs text-muted">
              {sudahLogin ? (
                "Hanya Petugas/Admin yang dapat menjalankan analisis baru."
              ) : (
                <>
                  <Link href="/login" className="font-semibold text-teal hover:underline">
                    Login sebagai Petugas/Admin
                  </Link>{" "}
                  untuk menjalankan analisis baru.
                </>
              )}
            </p>
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