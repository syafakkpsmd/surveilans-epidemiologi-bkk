"use client";

// components/TombolPrediksiAI.tsx
//
// CATATAN: ini komponen BARU, generik -- beda dari dua TombolPrediksiAI.tsx
// yang sudah ada sebelumnya (satu stub global-emerging, satu khusus vektor
// yang MEWAJIBKAN wilayahKerja). Dibutuhkan karena konteks non-vektor baru
// (cop-rba, cop-negara-asal, phqc-daerah-asal, phqc-rba-*, penumpang-*,
// pesawat-*) mengizinkan wilayahKerja kosong ("Semua Wilayah Kerja"), sama
// seperti TombolAnalisisAI.
//
// `role` sengaja OPSIONAL (bukan wajib seperti draf pertama saya) --
// ternyata halaman Alat Angkut Pesawat yang sudah ada memanggil
// TombolPrediksiAI TANPA prop role sama sekali. Propnya tidak dipakai
// untuk logika apa pun di komponen ini (beda dari TombolAnalisisAI yang
// pakai role untuk menampilkan link "Atur AI" khusus admin), jadi aman
// dibuat opsional.

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
  dariCache: boolean;
};

export function TombolPrediksiAI({
  sudahLogin,
  konteks,
  periodeKey,
  wilayahKerja,
  metrik,
}: TombolPrediksiAIProps) {
  const [modalTerbuka, setModalTerbuka] = useState<"login" | "hasil" | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilPrediksi | null>(null);

  async function jalankanPrediksi(paksaPerbarui: boolean) {
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
          paksaPerbarui,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Prediksi AI gagal dijalankan.");
      }
      setHasil(data as HasilPrediksi);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediksi AI gagal dijalankan.");
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
    void jalankanPrediksi(false);
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
            ? "rounded-control bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            : "rounded-control bg-border px-4 py-2 text-sm font-semibold text-muted cursor-not-allowed"
        }
        title={sudahLogin ? "Jalankan Prediksi AI" : "Login untuk mengakses Prediksi AI"}
      >
        {sudahLogin ? "🔮 Jalankan Prediksi AI" : "🔒 Prediksi AI"}
      </button>

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
                  Prediksi AI hanya tersedia untuk Petugas dan Admin yang sudah login.
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
                  <h3 className="text-base font-bold text-ink">🔮 Prediksi AI</h3>
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
                  <p className="py-6 text-center text-sm text-muted">Menyusun proyeksi…</p>
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

                    <Bagian judul="Kondisi Saat Ini" isi={hasil.ringkasan} />
                    <Bagian judul="Proyeksi Jika Tidak Direspons" isi={hasil.anomali} />
                    <Bagian judul="Tindakan yang Perlu Dilakukan Sekarang" isi={hasil.rekomendasi} />

                    {hasil.providerDipakai && (
                      <p className="text-xs text-muted">Provider: {hasil.providerDipakai}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => void jalankanPrediksi(true)}
                      className="w-full rounded-control border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-bg"
                    >
                      🔄 Perbarui Prediksi
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