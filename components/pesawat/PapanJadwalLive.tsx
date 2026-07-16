'use client';

import { useEffect, useState } from 'react';
import type { JadwalRingkasAPT, KategoriStatus } from '@/lib/aptpranoto';
import { DAFTAR_BANDARA } from '@/lib/bandara-live/daftar';

const WARNA_STATUS: Record<KategoriStatus, string> = {
  landed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
  boarding: 'bg-amber-100 text-amber-700',
  ontime: 'bg-blue-100 text-blue-700',
};

function kategoriStatusClient(status: string): KategoriStatus {
  const s = status.toLowerCase();
  if (s.includes('not operating') || s.includes('cancel')) return 'delayed';
  if (s.includes('delay')) return 'delayed';
  if (s.includes('boarding') || s.includes('check in') || s.includes('gate close')) return 'boarding';
  if (s.includes('landed') || s.includes('departured') || s.includes('departed') || s.includes('arrived')) return 'landed';
  return 'ontime';
}

function KartuPenerbangan({ item }: { item: JadwalRingkasAPT }) {
  const kategori = item.kategori ?? kategoriStatusClient(item.status);
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      <img
        src={item.logoMaskapai}
        alt={item.namaMaskapai}
        className="h-8 w-8 shrink-0 rounded object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/png?text=LOGO';
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          {item.kota} <span className="text-gray-400">({item.iata})</span>
        </p>
        <p className="text-xs text-gray-500">
          {item.namaMaskapai} · {item.kodePenerbangan}
          {item.gate ? ` · Gate ${item.gate}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-800">{item.jam}</p>
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${WARNA_STATUS[kategori]}`}>
          {item.status}
        </span>
      </div>
    </div>
  );
}

export default function PapanJadwalLive() {
  const [bandaraDipilih, setBandaraDipilih] = useState('pranoto');
  const [kedatangan, setKedatangan] = useState<JadwalRingkasAPT[]>([]);
  const [keberangkatan, setKeberangkatan] = useState<JadwalRingkasAPT[]>([]);
  const [kataKunci, setKataKunci] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tersedia, setTersedia] = useState(true);

  const metaAktif = DAFTAR_BANDARA.find((b) => b.kode === bandaraDipilih) ?? DAFTAR_BANDARA[0];

  useEffect(() => {
    let batal = false;
    setLoading(true);

    async function muatData() {
      try {
        const res = await fetch(`/api/jadwal-pesawat-live?bandara=${bandaraDipilih}`);
        if (!res.ok) throw new Error('Gagal memuat jadwal live');
        const json = await res.json();
        if (!batal) {
          setKedatangan(json.kedatangan ?? []);
          setKeberangkatan(json.keberangkatan ?? []);
          setTersedia(json.tersedia !== false);
          setError(null);
        }
      } catch (err) {
        if (!batal) setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        if (!batal) setLoading(false);
      }
    }

    muatData();
    // Auto-refresh tiap 60 detik supaya tetap "live"
    const interval = setInterval(muatData, 60_000);
    return () => {
      batal = true;
      clearInterval(interval);
    };
  }, [bandaraDipilih]);

  const q = kataKunci.trim().toLowerCase();
  const kedatanganFiltered = q
    ? kedatangan.filter((i) => i.kota.toLowerCase().includes(q) || i.iata.toLowerCase().includes(q))
    : kedatangan;
  const keberangkatanFiltered = q
    ? keberangkatan.filter((i) => i.kota.toLowerCase().includes(q) || i.iata.toLowerCase().includes(q))
    : keberangkatan;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700">
          🗓️ Jadwal Kedatangan / Keberangkatan (Live)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={bandaraDipilih}
            onChange={(e) => setBandaraDipilih(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          >
            {DAFTAR_BANDARA.map((b) => (
              <option key={b.kode} value={b.kode}>
                {b.nama} — {b.kota} {b.tersedia ? '' : '(segera hadir)'}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Cari kota/bandara..."
            value={kataKunci}
            onChange={(e) => setKataKunci(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm sm:w-56"
          />
        </div>
      </div>

      {loading && <p className="py-8 text-center text-sm text-gray-400">Memuat jadwal...</p>}

      {!loading && !tersedia && (
        <p className="py-8 text-center text-sm text-gray-400">
          Jadwal live untuk {metaAktif.nama} belum tersedia. Menunggu integrasi sumber data.
        </p>
      )}

      {error && (
        <p className="py-8 text-center text-sm text-red-500">
          {error} — coba muat ulang halaman.
        </p>
      )}

      {!loading && tersedia && !error && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Kedatangan
            </h3>
            {kedatanganFiltered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Tidak ada jadwal ditemukan.</p>
            ) : (
              kedatanganFiltered.map((item) => <KartuPenerbangan key={item.id} item={item} />)
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Keberangkatan
            </h3>
            {keberangkatanFiltered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Tidak ada jadwal ditemukan.</p>
            ) : (
              keberangkatanFiltered.map((item) => <KartuPenerbangan key={item.id} item={item} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}