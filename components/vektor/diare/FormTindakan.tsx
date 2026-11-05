'use client';
// components/vektor/diare/FormTindakan.tsx
import { useMemo, useState } from 'react';
import { LABEL_JENIS, NAMA_WILAYAH, STATUS_MS, STATUS_TMS, type Jenis } from '@/lib/vektor/diare/config';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih, keInput, type Baris } from './umum';

// Saran isian saja; petugas tetap bisa mengetik tindakan lain.
const SARAN: Record<Jenis, string[]> = {
  lalat: ['Spraying', 'Fly trap', 'Perbaikan sanitasi'],
  kecoa: ['Spraying', 'Baiting', 'Perbaikan sanitasi'],
};

const ringkas = (r: Baris) =>
  `${fmtTgl(r.tgl_kegiatan)} · ${NAMA_WILAYAH[r.kode_wilker] ?? r.kode_wilker} · ${r.lokasi} · ${fmtAngka(r.nilai)} (${
    r.hasil_pengamatan === STATUS_TMS ? 'TMS' : 'MS'
  })`;

export default function FormTindakan({
  jenis, baris, pilihan, onSelesai, onBatal,
}: {
  jenis: Jenis;
  baris: Baris | null; // survei yang sudah terpilih (dari tombol pintas)
  pilihan: Baris[]; // survei yang sedang tampil di tabel
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [idPilih, setIdPilih] = useState(baris ? String(baris.id) : '');
  const [tindakan, setTindakan] = useState(baris?.tindakan_pengendalian ?? '');
  const [ins, setIns] = useState(keInput(baris?.insektisida_terpakai_ml));
  const [luas, setLuas] = useState(keInput(baris?.luas_area_semprot_m2));
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const opsi = useMemo(() => {
    const skor = (r: Baris) => (r.hasil_pengamatan === STATUS_TMS && !r.tindakan_pengendalian ? 0 : 1);
    return [...pilihan].sort((a, b) => skor(a) - skor(b));
  }, [pilihan]);

  const terpilih = baris ?? pilihan.find((r) => String(r.id) === idPilih) ?? null;

  function pilih(id: string) {
    setIdPilih(id);
    const r = pilihan.find((x) => String(x.id) === id);
    setTindakan(r?.tindakan_pengendalian ?? '');
    setIns(keInput(r?.insektisida_terpakai_ml));
    setLuas(keInput(r?.luas_area_semprot_m2));
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!idPilih) return setGalat('Pilih survei terlebih dulu');
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/vektor/diare/tindakan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(idPilih), jenis, tindakan, insektisida: ins, luas }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai('Tindakan pengendalian tersimpan');
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  async function kosongkan() {
    if (!idPilih || !window.confirm('Kosongkan tindakan pengendalian pada survei ini?')) return;
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/vektor/diare/tindakan?id=${idPilih}&jenis=${jenis}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setGalat(j.error ?? 'Gagal mengosongkan');
      else onSelesai('Tindakan pengendalian dikosongkan');
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-4">
      {baris ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{ringkas(baris)}</p>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Survei {LABEL_JENIS[jenis].toLowerCase()}</span>
          <select required className={gayaInput} value={idPilih} onChange={(e) => pilih(e.target.value)}>
            <option value="">Pilih survei</option>
            {opsi.map((r) => (
              <option key={r.id} value={r.id}>
                {ringkas(r)}{r.tindakan_pengendalian ? ' · sudah ada tindakan' : ''}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-600">
            Daftar mengikuti filter di halaman. Yang tidak memenuhi syarat dan belum bertindakan ada di atas.
          </span>
        </label>
      )}

      {terpilih?.hasil_pengamatan === STATUS_MS && (
        <p className="text-xs text-slate-600">
          Survei ini memenuhi syarat. Tindakan tetap bisa dicatat, misalnya untuk kegiatan program.
        </p>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Tindakan pengendalian</span>
        <input required list="saran-tindakan" maxLength={120} className={gayaInput} value={tindakan}
          onChange={(e) => setTindakan(e.target.value)} />
        <datalist id="saran-tindakan">{SARAN[jenis].map((s) => <option key={s} value={s} />)}</datalist>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Insektisida terpakai (ml)</span>
          <input inputMode="decimal" className={gayaInput} value={ins} onChange={(e) => setIns(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Luas area penyemprotan (m²)</span>
          <input inputMode="decimal" className={gayaInput} value={luas} onChange={(e) => setLuas(e.target.value)} />
        </label>
      </div>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex flex-wrap justify-between gap-2">
        <div>
          {terpilih?.tindakan_pengendalian && (
            <button type="button" onClick={kosongkan} disabled={kirim}
              className="rounded-md px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
              Kosongkan tindakan
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
          <button type="submit" disabled={kirim} className={gayaTombol}>{kirim ? 'Menyimpan...' : 'Simpan tindakan'}</button>
        </div>
      </div>
    </form>
  );
}