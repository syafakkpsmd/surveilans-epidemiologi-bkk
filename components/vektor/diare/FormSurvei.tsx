'use client';
// components/vektor/diare/FormSurvei.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AMBANG_MS, LABEL_JENIS, NAMA_WILAYAH, OPSI_WILAYAH, STATUS_TMS, hitungStatus, parseAngka, type Jenis,
} from '@/lib/vektor/diare/config';
import { gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal, keInput, type Baris } from './umum';
import PengaturLokasi, { type AksiLokasi, type LokasiItem } from './PengaturLokasi';

export default function FormSurvei({
  jenis, baris, onSelesai, onBatal, onLokasiBerubah,
}: {
  jenis: Jenis;
  baris: Baris | null; // null = tambah baru
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
  onLokasiBerubah?: () => void; // dipanggil setelah nama lokasi diganti (data di tabel ikut berubah)
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_kegiatan ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? '');
  const [lokasi, setLokasi] = useState(baris?.lokasi ?? '');
  const [nilai, setNilai] = useState(keInput(baris?.nilai));
  const [ket, setKet] = useState(baris?.keterangan ?? '');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const [daftarLokasi, setDaftarLokasi] = useState<LokasiItem[]>([]);
  const [memuatLokasi, setMemuatLokasi] = useState(false);
  const [atur, setAtur] = useState(false);
  const token = useRef(0);

  const angka = parseAngka(nilai);
  const status = angka === null ? null : hitungStatus(angka);

  const muatLokasi = useCallback(async () => {
    if (!wilayah) {
      setDaftarLokasi([]);
      return;
    }
    const t = ++token.current;
    setMemuatLokasi(true);
    try {
      const res = await fetch(`/api/vektor/diare/lokasi?jenis=${jenis}&wilayah=${wilayah}`);
      const j = await res.json();
      if (t === token.current && res.ok) setDaftarLokasi(j.data);
    } catch {
      /* daftar tetap seperti sebelumnya */
    } finally {
      if (t === token.current) setMemuatLokasi(false);
    }
  }, [jenis, wilayah]);

  useEffect(() => {
    muatLokasi();
  }, [muatLokasi]);

  // Samakan huruf besar/kecil dengan nama di daftar supaya pilihan terbaca di dropdown
  useEffect(() => {
    const m = daftarLokasi.find((l) => l.nama.toLowerCase() === lokasi.toLowerCase());
    if (m && m.nama !== lokasi) setLokasi(m.nama);
  }, [daftarLokasi, lokasi]);

  // Lokasi terpilih selalu tampil di dropdown, walau (belum/tidak lagi) ada di daftar
  const opsiLokasi = useMemo(() => {
    const nama = daftarLokasi.map((l) => l.nama);
    if (lokasi && !nama.some((n) => n.toLowerCase() === lokasi.toLowerCase())) nama.unshift(lokasi);
    return nama;
  }, [daftarLokasi, lokasi]);

  function gantiWilayah(v: string) {
    setWilayah(v);
    setLokasi(baris && v === baris.kode_wilker ? baris.lokasi : '');
    setAtur(false);
  }

  function lokasiBerubah(a: AksiLokasi) {
    if (a.tipe === 'tambah' && a.baru) setLokasi(a.baru);
    if (a.tipe === 'ubah' && a.lama && a.baru && lokasi.toLowerCase() === a.lama.toLowerCase()) setLokasi(a.baru);
    muatLokasi();
    if (a.tipe === 'ubah') onLokasiBerubah?.();
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/vektor/diare', {
        method: baris ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: baris?.id, jenis, tanggal, wilayah, lokasi, nilai, keterangan: ket }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai(`${baris ? 'Perubahan' : 'Survei'} tersimpan. Hasil: ${j.hasil}`);
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Tanggal kegiatan</span>
          <input required type="date" className={gayaInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select required className={gayaInput} value={wilayah} onChange={(e) => gantiWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {OPSI_WILAYAH.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
      </div>

      <div className="text-sm">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="lokasi-survei" className="text-slate-700">Lokasi</label>
          <button
            type="button"
            disabled={!wilayah}
            aria-expanded={atur}
            onClick={() => setAtur((v) => !v)}
            className="rounded text-xs text-teal-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:text-slate-400 disabled:no-underline"
          >
            {atur ? 'Tutup pengaturan' : 'Atur lokasi'}
          </button>
        </div>
        <select
          id="lokasi-survei"
          required
          disabled={!wilayah}
          className={gayaInput}
          value={lokasi}
          onChange={(e) => setLokasi(e.target.value)}
        >
          <option value="">
            {!wilayah
              ? 'Pilih wilayah kerja dulu'
              : memuatLokasi
                ? 'Memuat...'
                : opsiLokasi.length
                  ? 'Pilih lokasi'
                  : 'Belum ada lokasi, klik Atur lokasi'}
          </option>
          {opsiLokasi.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {atur && wilayah && (
          <PengaturLokasi jenis={jenis} wilayah={wilayah} wilayahNama={NAMA_WILAYAH[wilayah] ?? wilayah}
            daftar={daftarLokasi} onBerubah={lokasiBerubah} />
        )}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">
          {jenis === 'lalat' ? 'Nilai hasil pengamatan (fly index)' : 'Nilai hasil pengamatan (kepadatan kecoa)'}
        </span>
        <input required inputMode="decimal" className={gayaInput} value={nilai}
          onChange={(e) => setNilai(e.target.value)} placeholder="Mis. 2,2" />
        <span className="mt-1 block text-xs text-slate-600" aria-live="polite">
          {status === null ? (
            <>Nilai ≤ {AMBANG_MS} memenuhi syarat, di atas {AMBANG_MS} tidak memenuhi syarat.</>
          ) : (
            <>Hasil: <strong className={status === STATUS_TMS ? 'text-rose-700' : 'text-emerald-700'}>{status}</strong></>
          )}
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Keterangan (opsional)</span>
        <textarea rows={2} className={gayaInput} value={ket} onChange={(e) => setKet(e.target.value)} />
      </label>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
        <button type="submit" disabled={kirim} className={gayaTombol}>
          {kirim ? 'Menyimpan...' : `Simpan survei ${LABEL_JENIS[jenis].toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}