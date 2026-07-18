"use client";

import { useState } from "react";
import Link from "next/link";
import type { PeranUser } from "@/types/database.types";

interface TombolPrediksiAIProps {
  sudahLogin: boolean;
  role?: PeranUser | null;
  konteks: string;
  periodeKey: string;
  wilayahKerja?: string;
  metrik?: string;
}

type HasilPrediksi = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dibuatPada?: string;
};

const bolehGenerate = (role?: PeranUser | null) => role === "admin" || role === "petugas";

export function TombolPrediksiAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
}: TombolPrediksiAIProps) {
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilPrediksi | null>(null);
  const [sudahDicek, setSudahDicek] = useState(false);

  function bangunQuery() {
    const params = new URLSearchParams({ konteks, periode_key: periodeKey, tipe: "prediksi" });
    if (wilayahKerja) params.set("wilayah_kerja", wilayahKerja);
    if (metrik) params.set("metrik", metrik);
    return params.toString();
  }

  async function muatHasil() {
    setMemuat(true);
    setError(null);
    try {
      const res = await fetch(`/api/analisis-ai?${bangunQuery()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat hasil Prediksi AI.");
      setHasil(data.ada ? data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat hasil Prediksi AI.");
    } finally {
      setMemuat(false);
      setSudahDicek(true);
    }
  }

  async function jalankanPrediksi() {
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
          tipe: "prediksi",
          paksaPerbarui: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Prediksi AI gagal dijalankan.");
      setHasil(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediksi AI gagal dijalankan.");
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
        className="rounded-control bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        title="Lihat Prediksi AI"
      >
        🔮 Lihat Prediksi AI
      </button>

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
              <h3 className="text-base font-bold text-ink">🔮 Prediksi AI</h3>
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
                <Bagian judul="Kondisi Saat Ini" isi={hasil.ringkasan} />
                <Bagian judul="Proyeksi Jika Tidak Direspons" isi={hasil.anomali} />
                <Bagian judul="Tindakan yang Perlu Dilakukan Sekarang" isi={hasil.rekomendasi} />
                {hasil.providerDipakai && (
                  <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
                )}
              </div>
            )}

            {!memuat && !error && !hasil && (
              <p className="py-4 text-sm text-muted">Belum ada Prediksi AI untuk periode ini.</p>
            )}

            {!memuat && bolehGenerate(role) && (
              <button
                type="button"
                onClick={() => void jalankanPrediksi()}
                className="mt-4 w-full rounded-control bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                {hasil ? "🔄 Jalankan Ulang Prediksi" : "🔮 Jalankan Prediksi AI"}
              </button>
            )}

            {!memuat && !bolehGenerate(role) && (
              <p className="mt-4 text-center text-xs text-muted">
                {sudahLogin ? (
                  "Hanya Petugas/Admin yang dapat menjalankan prediksi baru."
                ) : (
                  <>
                    <Link href="/login" className="font-semibold text-teal hover:underline">
                      Login sebagai Petugas/Admin
                    </Link>{" "}
                    untuk menjalankan prediksi baru.
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