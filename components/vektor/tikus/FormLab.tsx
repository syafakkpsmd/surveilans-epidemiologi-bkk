'use client';
// components/vektor/tikus/FormLab.tsx
import { useMemo, useRef, useState } from 'react';
import type { KamusWilker } from '@/lib/wilayah-kerja';

import { PEMERIKSAAN, SPESIES } from '@/lib/vektor/tikus/config';
import { gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal } from '@/components/vektor/diare/umum';
import type { BarisLab } from './tipe';

type Kunci = (typeof PEMERIKSAAN)[number]['kunci'];
const HASIL_KOSONG: Record<Kunci, string> = { leptospira: '', pes: '', hantavirus: '' };

export default function FormLab({
  wk, baris, lokasiSaran, onSelesai, onTersimpan, onBatal,
}: {
  wk: KamusWilker;
  baris: BarisLab | null; // null = tambah baru
  lokasiSaran: string[];
  onSelesai: (pesan: string) => void;
  onTersimpan: () => void; // muat ulang tabel saat "simpan & tambah lagi"
  onBatal: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_periksa ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? '');
  const [nama, setNama] = useState<string>(baris?.nama_tikus ?? '');
  const [lokasi, setLokasi] = useState(baris?.lokasi_pemasangan ?? '');
  const [sampel, setSampel] = useState(baris?.kode_sampel ?? '');
  const [hasil, setHasil] = useState<Record<Kunci, string>>({
    leptospira: baris?.hasil_leptospira ?? '',
    pes: baris?.hasil_pes ?? '',
    hantavirus: baris?.hasil_hantavirus ?? '',
  });
  const [ket, setKet] = useState(baris?.keterangan ?? '');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const namaRef = useRef<HTMLSelectElement>(null);
  const lagi = useRef(false);

  const saran = useMemo(() => lokasiSaran.slice(0, 200), [lokasiSaran]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setPesan(null);
    if (!hasil.leptospira && !hasil.pes && !hasil.hantavirus) {
      return setGalat('Isi minimal satu hasil pemeriksaan (Leptospira, Pes, atau Hantavirus)');
    }
    setKirim(true);
    try {
      const res = await fetch('/api/vektor/tikus/lab', {
        method: baris ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: baris?.id, tanggal, wilayah, nama_tikus: nama, lokasi, kode_sampel: sampel,
          leptospira: hasil.leptospira, pes: hasil.pes, hantavirus: hasil.hantavirus, keterangan: ket,
        }),
      });
      const j = await res.json();
      if (!res.ok) return setGalat(j.error ?? 'Gagal menyimpan');

      if (lagi.current && !baris) {
        // tanggal, wilayah, dan lokasi dipertahankan untuk ekor berikutnya
        setNama('');
        setHasil(HASIL_KOSONG);
        setSampel('');
        setKet('');
        setPesan('Tersimpan. Silakan isi tikus berikutnya.');
        onTersimpan();
        namaRef.current?.focus();
      } else {
        onSelesai(baris ? 'Perubahan hasil lab tersimpan' : 'Hasil lab tersimpan');
      }
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={simpan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Tanggal pemeriksaan</span>
          <input required type="date" className={gayaInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select required className={gayaInput} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Nama tikus</span>
          <select ref={namaRef} required className={gayaInput} value={nama} onChange={(e) => setNama(e.target.value)}>
            <option value="">Pilih nama tikus</option>
            {SPESIES.map((s) => <option key={s.kode} value={s.kode}>{s.nama}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Lokasi pemasangan</span>
          <input required maxLength={120} list="saran-lokasi-lab" className={gayaInput} value={lokasi}
            onChange={(e) => setLokasi(e.target.value)} placeholder="Mis. Gudang, Dermaga, Kantin" />
          <datalist id="saran-lokasi-lab">{saran.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm text-slate-700">Hasil pemeriksaan laboratorium</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {PEMERIKSAAN.map((p) => (
            <label key={p.kunci} className="block text-sm">
              <span className="mb-1 block text-slate-700">{p.label}</span>
              <select className={gayaInput} value={hasil[p.kunci]}
                onChange={(e) => setHasil({ ...hasil, [p.kunci]: e.target.value })}>
                <option value="">Tidak diperiksa</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Kode sampel (opsional)</span>
          <input maxLength={40} className={gayaInput} value={sampel} onChange={(e) => setSampel(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Keterangan (opsional)</span>
          <input maxLength={500} className={gayaInput} value={ket} onChange={(e) => setKet(e.target.value)} />
        </label>
      </div>

      {pesan && <p role="status" className="text-sm text-emerald-700">{pesan}</p>}
      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onBatal} className={gayaTombolPutih}>{pesan ? 'Selesai' : 'Batal'}</button>
        {!baris && (
          <button type="button" disabled={kirim} className={gayaTombolPutih}
            onClick={() => { lagi.current = true; formRef.current?.requestSubmit(); }}>
            Simpan &amp; tambah lagi
          </button>
        )}
        <button type="submit" disabled={kirim} className={gayaTombol} onClick={() => { lagi.current = false; }}>
          {kirim ? 'Menyimpan...' : 'Simpan hasil lab'}
        </button>
      </div>
    </form>
  );
}