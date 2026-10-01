"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PeranUser } from "@/types/database.types";
import { bolehJalankanAI } from "@/lib/auth/aksesAI";

interface BoxAnalisisAIProps {
  sudahLogin: boolean;
  role: PeranUser | null;
  konteks: string;
  periodeKey: string;
  /** Kosong = analisis keseluruhan (semua wilayah kerja). */
  wilayahKerja?: string;
  metrik?: string;
  /** @deprecated Tidak dipakai lagi: tombol aktif walau wilayah kerja belum dipilih. Dipertahankan supaya pemanggil lama tidak error. */
  wajibWilayahKerja?: boolean;
  /**
   * Hasil yang SUDAH diambil di server (lib/ai/getBanyakHasilAI.ts, dipanggil
   * dari page.tsx lewat Promise.all). Kalau diisi (termasuk `null` = server
   * sudah cek dan belum ada hasil), Box TIDAK fetch GET saat mount.
   * Kalau tidak dioper (undefined, halaman lama), Box fetch GET
   * /api/analisis-ai sendiri saat mount.
   */
  hasilAwal?: HasilAnalisis | null;
}

type HasilAnalisis = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dibuatPada?: string;
};

export function BoxAnalisisAI({
  sudahLogin,
  role,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
  hasilAwal,
}: BoxAnalisisAIProps) {
  const sudahDikasihServer = hasilAwal !== undefined;

  const [memuat, setMemuat] = useState(!sudahDikasihServer);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(hasilAwal ?? null);

  // Tombol aktif untuk admin/petugas/petugas_klinik (lib/auth/aksesAI.ts).
  // Wilayah kerja tidak wajib: kosong = analisis keseluruhan.
  const boleh = bolehJalankanAI(role);

  function bangunQuery() {
    const params = new URLSearchParams({ konteks, periode_key: periodeKey, tipe: "analisis" });
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
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat hasil Analisis AI.");
      setHasil(data.ada ? data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat hasil Analisis AI.");
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

  useEffect(() => {
    if (sudahDikasihServer) return;
    void muatHasil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konteks, periodeKey, wilayahKerja, metrik, sudahDikasihServer]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">📊 Analisis AI</h3>
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
          <Bagian judul="Ringkasan" isi={hasil.ringkasan} />
          <Bagian judul="Perlu Diwaspadai" isi={hasil.anomali} />
          <Bagian judul="Rekomendasi" isi={hasil.rekomendasi} />
          {hasil.providerDipakai && (
            <p className="text-xs text-gray-400">Provider: {hasil.providerDipakai}</p>
          )}
        </div>
      )}

      {!memuat && !error && !hasil && (
        <p className="text-sm text-gray-400">Belum ada Analisis AI untuk periode ini.</p>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        {!memuat && boleh && (
          <button
            type="button"
            onClick={() => void jalankan()}
            className="rounded-control bg-teal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            {hasil ? "🔄 Jalankan Ulang Analisis" : "✨ Jalankan Analisis AI"}
          </button>
        )}

        {!memuat && !boleh && (
          <p className="text-xs text-gray-400">
            {sudahLogin ? (
              "Hanya Petugas/Petugas Klinik/Admin yang dapat menjalankan analisis baru."
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