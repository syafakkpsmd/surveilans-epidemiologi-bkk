'use client';
// components/vektor/diare/FormSurvei.tsx
import { useState } from 'react';
import { AMBANG_MS, LABEL_JENIS, OPSI_WILAYAH, STATUS_TMS, hitungStatus, parseAngka, type Jenis } from '@/lib/vektor/diare/config';
import { gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal, keInput, type Baris } from './umum';

export default function FormSurvei({
  jenis, baris, lokasiSaran, onSelesai, onBatal,
}: {
  jenis: Jenis;
  baris: Baris | null; // null = tambah baru
  lokasiSaran: string[];
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_kegiatan ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? '');
  const [lokasi, setLokasi] = useState(baris?.lokasi ?? '');
  const [nilai, setNilai] = useState(keInput(baris?.nilai));
  const [ket, setKet] = useState(baris?.keterangan ?? '');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const angka = parseAngka(nilai);
  const status = angka === null ? null : hitungStatus(angka);

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
          <select required className={gayaInput} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {OPSI_WILAYAH.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Lokasi</span>
        <input required maxLength={120} list="saran-lokasi" className={gayaInput} value={lokasi}
          onChange={(e) => setLokasi(e.target.value)} placeholder="Mis. Terminal, Kantin, TPA" />
        <datalist id="saran-lokasi">{lokasiSaran.map((l) => <option key={l} value={l} />)}</datalist>
      </label>

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