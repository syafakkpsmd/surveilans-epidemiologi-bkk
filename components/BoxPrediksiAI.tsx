"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PeranUser } from "@/types/database.types";

interface BoxPrediksiAIProps {
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

const bolehGenerate = (role?: PeranUser | null, wilayahKerja?: string) =>
  (role === "admin" || role === "petugas") && !!wilayahKerja;

export function BoxPrediksiAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
}: BoxPrediksiAIProps) {
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilPrediksi | null>(null);

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

  useEffect(() => {
    void muatHasil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konteks, periodeKey, wilayahKerja, metrik]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">🔮 Prediksi AI</h3>
      </div>

      {memuat && <p className="text-sm text-gray-400">Memuat…</p>}

      {!memuat && error && <p className="text-sm text-risiko-merah">{error}</p>}

      {!memuat && !error && hasil && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {hasil.dibuatPada
              ? `Diperbarui ${new Date(hasil.dibuatPada).toLocaleString("id-ID")}`
              : "Hasil terakhir"}{" "}
            · dapat dilihat siapa saja.
          </p>
          <Bagian judul="Kondisi Saat Ini" isi={hasil.ringkasan} />
          <Bagian judul="Proyeksi Jika Tidak Direspons" isi={hasil.anomali} />
          <Bagian judul="Tindakan yang Perlu Dilakukan" isi={hasil.rekomendasi} />
          {hasil.providerDipakai && (
            <p className="text-xs text-gray-400">Provider: {hasil.providerDipakai}</p>
          )}
        </div>
      )}

      {!memuat && !error && !hasil && (
        <p className="text-sm text-gray-400">Belum ada Prediksi AI untuk periode ini.</p>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        {!memuat && bolehGenerate(role, wilayahKerja) && (
          <button
            type="button"
            onClick={() => void jalankan()}
            className="rounded-control bg-[#6D28D9] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            {hasil ? "🔄 Jalankan Ulang Prediksi" : "🔮 Jalankan Prediksi AI"}
          </button>
        )}

        {!memuat && !bolehGenerate(role, wilayahKerja) && (
          <p className="text-xs text-gray-400">
            {!wilayahKerja ? (
              "Pilih satu Wilayah Kerja tertentu untuk menjalankan prediksi."
            ) : sudahLogin ? (
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
  );
}

function Bagian({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{judul}</h4>
      <p className="whitespace-pre-line text-sm text-gray-700">{isi}</p>
    </div>
  );
}