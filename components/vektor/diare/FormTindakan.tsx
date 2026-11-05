'use client';
// components/vektor/diare/FormTindakan.tsx
import { useEffect, useState } from 'react';
import { LABEL_JENIS, NAMA_WILAYAH, OPSI_WILAYAH, STATUS_MS, STATUS_TMS, type Jenis } from '@/lib/vektor/diare/config';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih, keInput, type Baris } from './umum';

// Saran isian saja; petugas tetap bisa mengetik tindakan lain.
const SARAN: Record<Jenis, string[]> = {
  lalat: ['Spraying', 'Fly trap', 'Perbaikan sanitasi'],
  kecoa: ['Spraying', 'Baiting', 'Perbaikan sanitasi'],
};

const ringkas = (r: Baris, denganWilayah: boolean) =>
  [
    fmtTgl(r.tgl_kegiatan),
    denganWilayah ? NAMA_WILAYAH[r.kode_wilker] ?? r.kode_wilker : null,
    r.lokasi,
    `${fmtAngka(r.nilai)} (${r.hasil_pengamatan === STATUS_TMS ? 'TMS' : 'MS'})`,
  ].filter(Boolean).join(' · ');

export default function FormTindakan({
  jenis, baris, wilayahAwal, onSelesai, onBatal,
}: {
  jenis: Jenis;
  baris: Baris | null; // survei yang sudah terpilih (dari tombol pintas di baris)
  wilayahAwal: string; // wilayah yang sedang difilter di halaman ('' = semua)
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? wilayahAwal);
  const [mode, setMode] = useState<'perlu' | 'semua'>('perlu');
  const [daftar, setDaftar] = useState<Baris[]>([]);
  const [memuatDaftar, setMemuatDaftar] = useState(false);
  const [idPilih, setIdPilih] = useState(baris ? String(baris.id) : '');
  
  // State Tanggal Kegiatan Tindakan (Default: tanggal survei atau hari ini YYYY-MM-DD)
  const [tglTindakan, setTglTindakan] = useState(
    baris?.tgl_kegiatan 
      ? new Date(baris.tgl_kegiatan).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  
  const [tindakan, setTindakan] = useState(baris?.tindakan_pengendalian ?? '');
  const [ins, setIns] = useState(keInput(baris?.insektisida_terpakai_ml));
  const [luas, setLuas] = useState(keInput(baris?.luas_area_semprot_m2));
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Muat daftar survei untuk wilayah yang dipilih langsung dari database
  useEffect(() => {
    if (baris || !wilayah) {
      setDaftar([]);
      return;
    }
    let batal = false;
    setMemuatDaftar(true);
    setGalat(null);
    const sp = new URLSearchParams({ jenis, wilayah, limit: '200' });
    if (mode === 'perlu') {
      sp.set('hasil', 'tms');
      sp.set('tanpa_tindakan', '1');
    }
    fetch(`/api/vektor/diare?${sp}`)
      .then(async (res) => ({ ok: res.ok, j: await res.json() }))
      .then(({ ok, j }) => {
        if (batal) return;
        if (ok) setDaftar(j.data as Baris[]);
        else {
          setDaftar([]);
          setGalat(j.error ?? 'Daftar survei gagal dimuat');
        }
      })
      .catch(() => {
        if (!batal) setGalat('Tidak bisa terhubung ke server');
      })
      .finally(() => {
        if (!batal) setMemuatDaftar(false);
      });
    return () => {
      batal = true;
    };
  }, [baris, wilayah, mode, jenis]);

  const urut = mode === 'semua'
    ? [...daftar].sort((a, b) => {
        const skor = (r: Baris) => (r.hasil_pengamatan === STATUS_TMS && !r.tindakan_pengendalian ? 0 : 1);
        return skor(a) - skor(b);
      })
    : daftar;

  const terpilih = baris ?? daftar.find((r) => String(r.id) === idPilih) ?? null;

  function kosongkanPilihan() {
    setIdPilih('');
    setTindakan('');
    setIns('');
    setLuas('');
  }

  function pilih(id: string) {
    setIdPilih(id);
    const r = daftar.find((x) => String(x.id) === id);
    setTindakan(r?.tindakan_pengendalian ?? '');
    setIns(keInput(r?.insektisida_terpakai_ml));
    setLuas(keInput(r?.luas_area_semprot_m2));
    if (r?.tgl_kegiatan) {
      setTglTindakan(new Date(r.tgl_kegiatan).toISOString().split('T')[0]);
    }
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
        body: JSON.stringify({
          id: Number(idPilih),
          jenis,
          tgl_tindakan: tglTindakan, // <-- Mengirimkan tanggal tindakan ke API
          tindakan,
          insektisida: ins,
          luas
        }),
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
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{ringkas(baris, true)}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Wilayah kerja</span>
              <select required className={gayaInput} value={wilayah}
                onChange={(e) => { setWilayah(e.target.value); kosongkanPilihan(); }}>
                <option value="">Pilih wilayah kerja</option>
                {OPSI_WILAYAH.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Tampilkan</span>
              <select className={gayaInput} value={mode}
                onChange={(e) => { setMode(e.target.value as 'perlu' | 'semua'); kosongkanPilihan(); }}>
                <option value="perlu">Perlu tindakan (TMS, belum bertindakan)</option>
                <option value="semua">Semua survei (termasuk memenuhi syarat)</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Survei {LABEL_JENIS[jenis].toLowerCase()}</span>
            <select required disabled={!wilayah || memuatDaftar} className={gayaInput} value={idPilih}
              onChange={(e) => pilih(e.target.value)}>
              <option value="">
                {!wilayah ? 'Pilih wilayah kerja dulu' : memuatDaftar ? 'Memuat...' : urut.length ? 'Pilih survei' : 'Tidak ada survei'}
              </option>
              {urut.map((r) => (
                <option key={r.id} value={r.id}>
                  {ringkas(r, false)}{r.tindakan_pengendalian ? ' · sudah ada tindakan' : ''}
                </option>
              ))}
            </select>
            {wilayah && !memuatDaftar && urut.length === 0 && (
              <span className="mt-1 block text-xs text-slate-600">
                {mode === 'perlu'
                  ? 'Tidak ada survei yang perlu tindakan di wilayah ini. Pilih "Semua survei" untuk mencatat tindakan pada survei yang memenuhi syarat.'
                  : 'Belum ada survei di wilayah ini.'}
              </span>
            )}
            {urut.length === 200 && (
              <span className="mt-1 block text-xs text-slate-600">Menampilkan 200 survei terbaru.</span>
            )}
          </label>
        </>
      )}

      {terpilih?.hasil_pengamatan === STATUS_MS && (
        <p className="text-xs text-slate-600">
          Survei ini memenuhi syarat. Tindakan tetap bisa dicatat, misalnya untuk kegiatan program.
        </p>
      )}

      {/* INPUT TANGGAL KEGIATAN TINDAKAN */}
      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Tanggal kegiatan tindakan</span>
        <input
          type="date"
          required
          className={gayaInput}
          value={tglTindakan}
          onChange={(e) => setTglTindakan(e.target.value)}
        />
      </label>

      {/* FIELD TINDAKAN PENGENDALIAN */}
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