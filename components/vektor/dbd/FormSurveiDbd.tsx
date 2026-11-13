'use client';
// components/vektor/dbd/FormSurveiDbd.tsx
import { useEffect, useRef, useState } from 'react';
import type { KamusWilker } from '@/lib/wilayah-kerja';
import { parseAngka } from '@/lib/vektor/umum';
import { AMBANG_ABJ, ZONA, hitungIndeks, type Zona } from '@/lib/vektor/dbd/config';
import { kunciSub } from '@/lib/vektor/dbd/sublokasi';
import { fmtAngka, gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal, keInput } from '@/components/vektor/diare/umum';
import type { BarisDbd } from './tipe';

function Bilangan({ label, nilai, set }: { label: string; nilai: string; set: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      <input required type="number" inputMode="numeric" step={1} min={0} className={gayaInput}
        value={nilai} placeholder="0" onChange={(e) => set(e.target.value)} />
    </label>
  );
}

const bulat = (s: string) => {
  const n = parseAngka(s);
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
};

export default function FormSurveiDbd({
  baris, wilayahAwal = '', wk, onSelesai, onBatal,
}: {
  baris: BarisDbd | null; // null = tambah baru
  wilayahAwal?: string;
  wk: KamusWilker;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_survei ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? wilayahAwal);
  const [zona, setZona] = useState<Zona | ''>(baris?.zona ?? '');
  const [sub, setSub] = useState(baris?.sub_lokasi ?? '');
  const [rumah, setRumah] = useState(keInput(baris?.jml_rumah_diperiksa));
  const [rPos, setRPos] = useState(keInput(baris?.jml_positif_jentik));
  const [cont, setCont] = useState(keInput(baris?.container_diperiksa));
  const [cPos, setCPos] = useState(keInput(baris?.container_positif));
  const [hujan, setHujan] = useState(keInput(baris?.curah_hujan_mm));
  const [saran, setSaran] = useState<string[]>([]);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const token = useRef(0);

    // Saran sub lokasi: nama yang sudah ada di wilayah + zona ini (Perimeter: pelabuhan/terminal, Buffer: RT)
  useEffect(() => {
    const t = ++token.current;
    if (!wilayah) {
      setSaran([]);
      return;
    }
    fetch(`/api/vektor/dbd/sublokasi?wilayah=${wilayah}${zona ? `&zona=${zona}` : ''}`)
      .then(async (res) => ({ ok: res.ok, j: await res.json() }))
      .then(({ ok, j }) => {
        if (t === token.current && ok) setSaran(j.data);
      })
      .catch(() => {});
  }, [wilayah, zona]);

  const petunjukSub =
    zona === 'Buffer' ? { label: 'Sub lokasi (RT / kelurahan)', contoh: 'Mis. RT 01, RT 02, RT 03' }
    : zona === 'Perimeter' ? { label: 'Sub lokasi (pelabuhan / terminal)', contoh: 'Mis. Pelabuhan Umum, TPK Palaran' }
    : { label: 'Sub lokasi (opsional)', contoh: 'Pilih zona terlebih dahulu' };

  const nR = bulat(rumah);
  const nRP = bulat(rPos);
  const nC = bulat(cont);
  const nCP = bulat(cPos);
  let masalah: string | null = null;
  let indeks: ReturnType<typeof hitungIndeks> | null = null;
  if (nR !== null && nRP !== null && nC !== null && nCP !== null && nR >= 1) {
    if (nRP > nR) masalah = `Rumah positif (${nRP}) melebihi rumah diperiksa (${nR})`;
    else if (nCP > nC) masalah = `Container positif (${nCP}) melebihi container diperiksa (${nC})`;
    else if (nCP < nRP) masalah = `Container positif (${nCP}) tidak boleh kurang dari rumah positif (${nRP})`;
    else indeks = hitungIndeks(nR, nRP, nC, nCP);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/vektor/dbd', {
        method: baris ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: baris?.id, tanggal, wilayah, zona, sub_lokasi: sub,
          rumah, rumah_positif: rPos, container: cont, container_positif: cPos, hujan,
        }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai(`${baris ? 'Perubahan' : 'Survei'} tersimpan. ABJ ${fmtAngka(j.abj)}%, HI ${fmtAngka(j.hi)}%`);
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Tanggal survei</span>
          <input required type="date" className={gayaInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select required className={gayaInput} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Zona</span>
          <select required className={gayaInput} value={zona} onChange={(e) => setZona(e.target.value as Zona | '')}>
            <option value="">Pilih zona</option>
            {ZONA.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
      </div>

            <div className="space-y-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{petunjukSub.label} (opsional)</span>
          <input maxLength={120} list="saran-sub-lokasi" className={gayaInput} value={sub}
            onChange={(e) => setSub(e.target.value)} placeholder={petunjukSub.contoh} />
          <datalist id="saran-sub-lokasi">{saran.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        {saran.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilihan sub lokasi">
            {saran.slice(0, 20).map((s) => {
              const aktif = kunciSub(s) === kunciSub(sub);
              return (
                <button key={s} type="button" aria-pressed={aktif} onClick={() => setSub(aktif ? '' : s)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${aktif ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600'}`}>
                  {s}
                </button>
              );
            })}
          </div>
        )}
        <span className="block text-xs text-slate-600">
          Kosongkan bila survei tidak dibagi per sub lokasi. Nama baru otomatis tersimpan dan muncul sebagai pilihan berikutnya.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bilangan label="Rumah diperiksa" nilai={rumah} set={setRumah} />
        <Bilangan label="Rumah positif jentik" nilai={rPos} set={setRPos} />
        <Bilangan label="Container diperiksa" nilai={cont} set={setCont} />
        <Bilangan label="Container positif" nilai={cPos} set={setCPos} />
      </div>

      <label className="block text-sm sm:max-w-xs">
        <span className="mb-1 block text-slate-700">Curah hujan, mm (opsional)</span>
        <input inputMode="decimal" className={gayaInput} value={hujan} placeholder="Mis. 82,8"
          onChange={(e) => setHujan(e.target.value)} />
      </label>

      <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">
        {indeks ? (
          <>
            ABJ: <strong className={indeks.abj < AMBANG_ABJ ? 'text-rose-700' : 'text-emerald-700'}>{fmtAngka(indeks.abj)}%</strong>
            {indeks.abj < AMBANG_ABJ && <> (di bawah target {AMBANG_ABJ}%)</>}
            {' · '}HI: <strong>{fmtAngka(indeks.hi)}%</strong>
            {' · '}CI: <strong>{fmtAngka(indeks.ci)}%</strong>
            {' · '}BI: <strong>{fmtAngka(indeks.bi)}</strong>
          </>
        ) : masalah ? (
          <span className="text-rose-700">{masalah}</span>
        ) : (
          <>ABJ, HI, CI, dan BI dihitung otomatis setelah keempat angka terisi.</>
        )}
      </p>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
        <button type="submit" disabled={kirim} className={gayaTombol}>{kirim ? 'Menyimpan...' : 'Simpan survei'}</button>
      </div>
    </form>
  );
}