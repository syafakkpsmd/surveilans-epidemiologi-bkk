'use client';
// components/vektor/tikus/FormSurveiTikus.tsx
import { useState } from 'react';
import { parseAngka } from '@/lib/vektor/umum';
import { hitungIndexPinjal, hitungTsi } from '@/lib/vektor/tikus/config';
import { fmtAngka, gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal, keInput } from '@/components/vektor/diare/umum';
import type { BarisSurvei } from './tipe';

const n = (s: string) => parseAngka(s) ?? 0;

export default function FormSurveiTikus({
  baris, onSelesai, onBatal,
}: {
  baris: BarisSurvei | null; // null = tambah baru
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_survei ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? '');
  const [dipasang, setDipasang] = useState(keInput(baris?.jml_trap_dipasang));
  const [rt, setRt] = useState(keInput(baris?.rt));
  const [rn, setRn] = useState(keInput(baris?.rn));
  const [mm, setMm] = useState(keInput(baris?.mm));
  const [lainnya, setLainnya] = useState(keInput(baris?.jenis_lainnya));
  const [pinjal, setPinjal] = useState(keInput(baris?.jml_pinjal_ditemukan));
  const [ket, setKet] = useState(baris?.keterangan ?? '');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const tertangkap = n(rt) + n(rn) + n(mm) + n(lainnya);
  const dp = parseAngka(dipasang);
  const lebih = dp !== null && tertangkap > dp;
  const tsi = dp && dp > 0 ? hitungTsi(tertangkap, dp) : null;
  const indeks = hitungIndexPinjal(n(pinjal), tertangkap);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/vektor/tikus', {
        method: baris ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: baris?.id, tanggal, wilayah, dipasang, rt, rn, mm, lainnya, pinjal, keterangan: ket,
        }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai(`${baris ? 'Perubahan' : 'Survei'} tersimpan. Tertangkap ${j.tertangkap}, success trap ${fmtAngka(j.tsi)}%`);
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  const angkaInput = (
    label: string, nilai: string, set: (v: string) => void, opsi?: { wajib?: boolean; min?: number }
  ) => (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      <input type="number" inputMode="numeric" step={1} min={opsi?.min ?? 0} required={opsi?.wajib}
        className={gayaInput} value={nilai} placeholder="0" onChange={(e) => set(e.target.value)} />
    </label>
  );

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
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
      </div>

      {angkaInput('Jumlah perangkap dipasang', dipasang, setDipasang, { wajib: true, min: 1 })}

      <fieldset>
        <legend className="mb-1 text-sm text-slate-700">Jenis tikus tertangkap</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {angkaInput('RT', rt, setRt)}
          {angkaInput('RN', rn, setRn)}
          {angkaInput('MM', mm, setMm)}
          {angkaInput('Jenis lainnya', lainnya, setLainnya)}
        </div>
      </fieldset>

      {angkaInput('Jumlah pinjal ditemukan', pinjal, setPinjal)}

      <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">
        Tertangkap: <strong>{tertangkap}</strong>
        {' · '}Success trap: <strong>{tsi === null ? '-' : `${fmtAngka(tsi)}%`}</strong>
        {' · '}Indeks pinjal: <strong>{indeks === null ? '-' : fmtAngka(indeks)}</strong>
        {lebih && (
          <span className="mt-1 block text-rose-700">
            Tikus tertangkap ({tertangkap}) melebihi perangkap dipasang ({dp}). Periksa angkanya.
          </span>
        )}
      </p>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Keterangan (opsional)</span>
        <textarea rows={2} className={gayaInput} value={ket} onChange={(e) => setKet(e.target.value)} />
      </label>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
        <button type="submit" disabled={kirim} className={gayaTombol}>{kirim ? 'Menyimpan...' : 'Simpan survei'}</button>
      </div>
    </form>
  );
}