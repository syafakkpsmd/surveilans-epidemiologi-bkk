'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PeranUser } from '@/types/database.types';

interface AnalisisPrediksiMalariaProps {
  role: PeranUser | null;
  sudahLogin: boolean;
  tahun: number;
  kodeWilker?: string;
  labelWilayah?: string;
}

type HasilAnalisis = {
  ringkasan: string;
  anomali: string;
  rekomendasi: string;
  providerDipakai?: string;
  dibuatPada?: string;
};

const bolehGenerate = (role: PeranUser | null) => role === 'admin' || role === 'petugas';

export function AnalisisPrediksiMalaria({
  role,
  sudahLogin,
  tahun,
  kodeWilker,
  labelWilayah,
}: AnalisisPrediksiMalariaProps) {
  const [memuat, setMemuat] = useState(true);
  const [menjalankan, setMenjalankan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);

  function bangunQuery() {
    const params = new URLSearchParams({ tahun: String(tahun) });
    if (kodeWilker) params.set('wilayah_kerja', kodeWilker);
    return params.toString();
  }

  // Muat otomatis begitu komponen tampil -- siapa saja (termasuk tamu) langsung
  // lihat hasil terakhir yang tersimpan, tanpa perlu klik apa pun.
  useEffect(() => {
    let batal = false;
    async function muatHasil() {
      setMemuat(true);
      setError(null);
      try {
        const res = await fetch(`/api/analisis-ai-malaria?${bangunQuery()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Gagal memuat hasil Analisis & Prediksi AI.');
        if (!batal) setHasil(data.ada ? data : null);
      } catch (err) {
        if (!batal) {
          setError(err instanceof Error ? err.message : 'Gagal memuat hasil Analisis & Prediksi AI.');
        }
      } finally {
        if (!batal) setMemuat(false);
      }
    }
    void muatHasil();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, kodeWilker]);

  // POST -- server juga menolak kalau bukan admin/petugas, tombolnya sendiri
  // hanya tampil untuk role yang berhak (lihat bolehGenerate di JSX bawah).
  async function jalankanAnalisis() {
    setMenjalankan(true);
    setError(null);
    try {
      const res = await fetch('/api/analisis-ai-malaria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun,
          wilayah_kerja: kodeWilker ?? null,
          label_wilayah: labelWilayah ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Analisis & Prediksi AI gagal dijalankan.');
      setHasil(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analisis & Prediksi AI gagal dijalankan.');
    } finally {
      setMenjalankan(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">🤖 Analisis &amp; Prediksi AI</h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Box Analisis AI */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">📊 Analisis AI</h3>
          {memuat ? (
            <p className="py-6 text-center text-sm text-gray-400">Memuat…</p>
          ) : hasil ? (
            <div className="space-y-4">
              <Bagian judul="Ringkasan" isi={hasil.ringkasan} />
              <Bagian judul="Anomali / Hal yang Perlu Diwaspadai" isi={hasil.anomali} />
            </div>
          ) : (
            <p className="py-4 text-sm text-gray-400">Belum ada Analisis AI untuk periode ini.</p>
          )}
        </div>

        {/* Box Prediksi AI */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">🔮 Prediksi AI</h3>
          {memuat ? (
            <p className="py-6 text-center text-sm text-gray-400">Memuat…</p>
          ) : hasil ? (
            <Bagian judul="Proyeksi & Rekomendasi Tindak Lanjut" isi={hasil.rekomendasi} />
          ) : (
            <p className="py-4 text-sm text-gray-400">Belum ada Prediksi AI untuk periode ini.</p>
          )}
        </div>
      </div>

      {!memuat && hasil && (
        <p className="text-xs text-gray-400">
          {hasil.dibuatPada ? `Diperbarui ${new Date(hasil.dibuatPada).toLocaleString('id-ID')}` : 'Hasil terakhir'}
          {hasil.providerDipakai ? ` · Provider: ${hasil.providerDipakai}` : ''} · dapat dilihat siapa saja.
        </p>
      )}

      {!memuat && bolehGenerate(role) && (
        <button
          type="button"
          onClick={() => void jalankanAnalisis()}
          disabled={menjalankan}
          className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {menjalankan ? 'Menjalankan…' : hasil ? '🔄 Jalankan Ulang Analisis & Prediksi AI' : '✨ Jalankan Analisis & Prediksi AI'}
        </button>
      )}

      {!memuat && !bolehGenerate(role) && (
        <p className="text-xs text-gray-400">
          {sudahLogin ? (
            'Hanya Petugas/Admin yang dapat menjalankan analisis baru.'
          ) : (
            <>
              <Link href="/login" className="font-semibold text-[#0F4C5C] hover:underline">
                Login sebagai Petugas/Admin
              </Link>{' '}
              untuk menjalankan analisis baru.
            </>
          )}
        </p>
      )}
    </div>
  );
}

function Bagian({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{judul}</h4>
      <p className="whitespace-pre-line text-sm text-[#0F2A38]">{isi}</p>
    </div>
  );
}