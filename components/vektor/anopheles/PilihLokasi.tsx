'use client';
// components/vektor/anopheles/PilihLokasi.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NAMA_WILAYAH } from '@/lib/vektor/umum';
import type { Zona } from '@/lib/vektor/anopheles/config';
import { gayaInput } from '@/components/vektor/diare/umum';
import PengaturLokasiZona, { type AksiLokasi, type LokasiItem } from './PengaturLokasiZona';

export default function PilihLokasi({
  wilayah, zona, nilai, onUbah, onLokasiBerubah,
}: {
  wilayah: string;
  zona: Zona | '';
  nilai: string;
  onUbah: (v: string) => void; // harus setter stabil (mis. setState)
  onLokasiBerubah?: () => void; // dipanggil setelah nama lokasi diganti (data di tabel ikut berubah)
}) {
  const [daftar, setDaftar] = useState<LokasiItem[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [atur, setAtur] = useState(false);
  const token = useRef(0);
  const siap = !!wilayah && !!zona;

  const muat = useCallback(async () => {
    const t = ++token.current;
    if (!siap) {
      setDaftar([]);
      return;
    }
    setMemuat(true);
    try {
      const res = await fetch(`/api/vektor/anopheles/lokasi?wilayah=${wilayah}&zona=${zona}`);
      const j = await res.json();
      if (t === token.current && res.ok) setDaftar(j.data);
    } catch {
      /* daftar tetap seperti sebelumnya */
    } finally {
      if (t === token.current) setMemuat(false);
    }
  }, [siap, wilayah, zona]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Samakan huruf besar/kecil dengan nama di daftar supaya pilihan terbaca di dropdown
  useEffect(() => {
    const m = daftar.find((l) => l.nama.toLowerCase() === nilai.toLowerCase());
    if (m && m.nama !== nilai) onUbah(m.nama);
  }, [daftar, nilai, onUbah]);

  // Lokasi terpilih selalu tampil di dropdown, walau (belum/tidak lagi) ada di daftar
  const opsi = useMemo(() => {
    const nama = daftar.map((l) => l.nama);
    if (nilai && !nama.some((n) => n.toLowerCase() === nilai.toLowerCase())) nama.unshift(nilai);
    return nama;
  }, [daftar, nilai]);

  function berubah(a: AksiLokasi) {
    if (a.tipe === 'tambah' && a.baru) onUbah(a.baru);
    if (a.tipe === 'ubah' && a.lama && a.baru && nilai.toLowerCase() === a.lama.toLowerCase()) onUbah(a.baru);
    muat();
    if (a.tipe === 'ubah') onLokasiBerubah?.();
  }

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor="lokasi-survei" className="text-slate-700">Lokasi (opsional)</label>
        <button
          type="button"
          disabled={!siap}
          aria-expanded={atur}
          onClick={() => setAtur((v) => !v)}
          className="rounded text-xs text-teal-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:text-slate-400 disabled:no-underline"
        >
          {atur ? 'Tutup pengaturan' : 'Atur lokasi'}
        </button>
      </div>
      <select id="lokasi-survei" disabled={!siap} className={gayaInput} value={nilai} onChange={(e) => onUbah(e.target.value)}>
        <option value="">
          {!siap ? 'Pilih wilayah kerja dan zona dulu' : memuat ? 'Memuat...' : 'Tanpa lokasi tertentu'}
        </option>
        {opsi.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {atur && siap && (
        <PengaturLokasiZona key={`${wilayah}-${zona}`} wilayah={wilayah} wilayahNama={NAMA_WILAYAH[wilayah] ?? wilayah}
          zona={zona as Zona} daftar={daftar} onBerubah={berubah} />
      )}
    </div>
  );
}