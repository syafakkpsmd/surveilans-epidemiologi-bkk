'use client';
// components/vektor/dbd/FormPengendalianDbd.tsx
import { useEffect, useState } from 'react';
import type { KamusWilker } from '@/lib/wilayah-kerja';

import { AMBANG_ABJ, LITER_KE_DB } from '@/lib/vektor/dbd/config';
import { fmtAngka, fmtTgl, gayaInput, gayaTombol, gayaTombolPutih, keInput } from '@/components/vektor/diare/umum';
import type { BarisDbd } from './tipe';

const keLiter = (v: number | null | undefined) =>
  v == null ? '' : keInput(Math.round((v / LITER_KE_DB) * 10000) / 10000);

const ringkas = (r: BarisDbd, denganWilayah: boolean, wk: KamusWilker) =>
  [
    fmtTgl(r.tgl_survei),
    denganWilayah ? wk.namaPanjangByKode[r.kode_wilker] ?? r.kode_wilker : null,
    r.sub_lokasi ? `${r.zona} · ${r.sub_lokasi}` : r.zona,
    `ABJ ${r.abj == null ? '-' : fmtAngka(r.abj)}%`,
  ].filter(Boolean).join(' · ');

export default function FormPengendalianDbd({
  baris, wilayahAwal, wk, onSelesai, onBatal,
}: {
  baris: BarisDbd | null; // survei yang sudah terpilih (dari tombol pintas di baris)
  wilayahAwal: string; // wilayah yang sedang difilter di halaman ('' = semua)
  wk: KamusWilker;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? wilayahAwal);
  const [mode, setMode] = useState<'perlu' | 'semua'>('perlu');
  const [daftar, setDaftar] = useState<BarisDbd[]>([]);
  const [memuatDaftar, setMemuatDaftar] = useState(false);
  const [idPilih, setIdPilih] = useState(baris ? String(baris.id) : '');
  const [larvasida, setLarvasida] = useState(keInput(baris?.larvasida_gram));
  const [luas, setLuas] = useState(keInput(baris?.luas_wilayah_fogging_ha));
  const [insektisida, setInsektisida] = useState(keLiter(baris?.jml_insektisida_fogging_ml));
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
    const sp = new URLSearchParams({ wilayah, limit: '200' });
    if (mode === 'perlu') sp.set('belum_pengendalian', '1');
    fetch(`/api/vektor/dbd?${sp}`)
      .then(async (res) => ({ ok: res.ok, j: await res.json() }))
      .then(({ ok, j }) => {
        if (batal) return;
        if (ok) setDaftar(j.data as BarisDbd[]);
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
  }, [baris, wilayah, mode]);

  // Yang belum bertindakan dan ABJ-nya di bawah target tampil paling atas
  const skor = (r: BarisDbd) =>
    !r.ada_pengendalian && (r.abj ?? 100) < AMBANG_ABJ ? 0 : !r.ada_pengendalian ? 1 : 2;
  const urut = [...daftar].sort((a, b) => skor(a) - skor(b));
  const terpilih = baris ?? daftar.find((r) => String(r.id) === idPilih) ?? null;

  function kosongkanPilihan() {
    setIdPilih('');
    setLarvasida('');
    setLuas('');
    setInsektisida('');
  }

  function pilih(id: string) {
    setIdPilih(id);
    const r = daftar.find((x) => String(x.id) === id);
    setLarvasida(keInput(r?.larvasida_gram));
    setLuas(keInput(r?.luas_wilayah_fogging_ha));
    setInsektisida(keLiter(r?.jml_insektisida_fogging_ml));
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!idPilih) return setGalat('Pilih survei terlebih dulu');
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/vektor/dbd/pengendalian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(idPilih), larvasida, luas, insektisida }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai('Pengendalian tersimpan');
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  async function kosongkan() {
    if (!idPilih || !window.confirm('Kosongkan pengendalian pada survei ini?')) return;
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/vektor/dbd/pengendalian?id=${idPilih}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setGalat(j.error ?? 'Gagal mengosongkan');
      else onSelesai('Pengendalian dikosongkan');
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-4">
      {baris ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{ringkas(baris, true, wk)}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Wilayah kerja</span>
              <select required className={gayaInput} value={wilayah}
                onChange={(e) => { setWilayah(e.target.value); kosongkanPilihan(); }}>
                <option value="">Pilih wilayah kerja</option>
                {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Tampilkan</span>
              <select className={gayaInput} value={mode}
                onChange={(e) => { setMode(e.target.value as 'perlu' | 'semua'); kosongkanPilihan(); }}>
                <option value="perlu">Belum ada pengendalian</option>
                <option value="semua">Semua survei</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Survei</span>
            <select required disabled={!wilayah || memuatDaftar} className={gayaInput} value={idPilih}
              onChange={(e) => pilih(e.target.value)}>
              <option value="">
                {!wilayah ? 'Pilih wilayah kerja dulu' : memuatDaftar ? 'Memuat...' : urut.length ? 'Pilih survei' : 'Tidak ada survei'}
              </option>
              {urut.map((r) => (
                <option key={r.id} value={r.id}>
                  {ringkas(r, false, wk)}{r.ada_pengendalian ? ' · sudah ada pengendalian' : ''}
                </option>
              ))}
            </select>
            {wilayah && !memuatDaftar && urut.length === 0 && (
              <span className="mt-1 block text-xs text-slate-600">
                {mode === 'perlu'
                  ? 'Semua survei di wilayah ini sudah punya pengendalian. Pilih "Semua survei" untuk mengubahnya.'
                  : 'Belum ada survei di wilayah ini.'}
              </span>
            )}
            {urut.length === 200 && <span className="mt-1 block text-xs text-slate-600">Menampilkan 200 survei terbaru.</span>}
          </label>
        </>
      )}

      {terpilih && terpilih.abj != null && terpilih.abj >= AMBANG_ABJ && !terpilih.ada_pengendalian && (
        <p className="text-xs text-slate-600">
          ABJ survei ini memenuhi target ({AMBANG_ABJ}%). Pengendalian tetap bisa dicatat, misalnya untuk kegiatan rutin.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Larvasida (gram)</span>
          <input inputMode="decimal" className={gayaInput} value={larvasida} onChange={(e) => setLarvasida(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Luas fogging (ha)</span>
          <input inputMode="decimal" className={gayaInput} value={luas} onChange={(e) => setLuas(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Insektisida fogging (liter)</span>
          <input inputMode="decimal" className={gayaInput} value={insektisida} onChange={(e) => setInsektisida(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-slate-600">Isi minimal satu. Penanda pengendalian otomatis menjadi &quot;Ya&quot;.</p>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex flex-wrap justify-between gap-2">
        <div>
          {terpilih?.ada_pengendalian && (
            <button type="button" onClick={kosongkan} disabled={kirim}
              className="rounded-md px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
              Kosongkan pengendalian
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
          <button type="submit" disabled={kirim} className={gayaTombol}>{kirim ? 'Menyimpan...' : 'Simpan pengendalian'}</button>
        </div>
      </div>
    </form>
  );
}