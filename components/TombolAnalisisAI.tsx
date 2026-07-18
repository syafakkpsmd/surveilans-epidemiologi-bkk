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
};

const bolehGenerate = (role: PeranUser | null) => role === "admin" || role === "petugas";

export function TombolAnalisisAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
}: TombolAnalisisAIProps) {
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
  const [sudahDicek, setSudahDicek] = useState(false);

  function bangunQuery() {
    const params = new URLSearchParams({ konteks, periode_key: periodeKey, tipe: "analisis" });
    if (wilayahKerja) params.set("wilayah_kerja", wilayahKerja);
    if (metrik) params.set("metrik", metrik);
    return params.toString();
  }

  // GET -- boleh dipanggil siapa saja, cuma membaca hasil terakhir yang tersimpan.
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

  // POST -- server juga menolak kalau bukan admin/petugas, tombolnya sendiri
  // hanya dirender untuk role yang berhak (lihat bolehGenerate di JSX bawah).
  async function jalankanAnalisis() {
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
    setModalTerbuka(true);
    if (!sudahDicek) void muatHasil();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={tanganiKlik}
        className="rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        title="Lihat Analisis AI"
      >
        📊 Lihat Analisis AI
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
          onClick={() => setModalTerbuka(false)}
        >
          <div
            className="w-full max-w-md rounded-card bg-surface p-6 shadow-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-ink">Analisis AI</h3>
              <button
                type="button"
                onClick={() => setModalTerbuka(false)}
                className="text-sm text-muted hover:text-ink"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {memuat && <p className="py-6 text-center text-sm text-muted">Memuat…</p>}

            {!memuat && error && (
              <div className="mb-3 rounded-control border border-risiko-merah/30 bg-risiko-merah/10 px-3 py-2 text-sm text-risiko-merah">
                {error}
              </div>
            )}

            {!memuat && !error && hasil && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  {hasil.dibuatPada
                    ? `Diperbarui ${new Date(hasil.dibuatPada).toLocaleString("id-ID")}`
                    : "Hasil terakhir"}{" "}
                  · dapat dilihat siapa saja.
                </p>
                <Bagian judul="Ringkasan Tren" isi={hasil.ringkasan} />
                <Bagian judul="Deteksi Anomali" isi={hasil.anomali} />
                <Bagian judul="Rekomendasi" isi={hasil.rekomendasi} />
                {hasil.providerDipakai && (
                  <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
                )}
              </div>
            )}

            {!memuat && !error && !hasil && (
              <p className="py-4 text-sm text-muted">Belum ada Analisis AI untuk periode ini.</p>
            )}

            {!memuat && bolehGenerate(role) && (
              <button
                type="button"
                onClick={() => void jalankanAnalisis()}
                className="mt-4 w-full rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                {hasil ? "🔄 Jalankan Ulang Analisis" : "✨ Jalankan Analisis AI"}
              </button>
            )}

            {!memuat && !bolehGenerate(role) && (
              <p className="mt-4 text-center text-xs text-muted">
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