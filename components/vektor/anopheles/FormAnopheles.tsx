'use client';
// components/vektor/anopheles/FormAnopheles.tsx
import { useState } from 'react';
import { parseAngka } from '@/lib/vektor/umum';
import { FASE_BULAN, ZONA, hitungMbr, hitungMhd, type Tipe, type Zona } from '@/lib/vektor/anopheles/config';
import { gayaInput, gayaTombol, gayaTombolPutih, hariIniLokal, keInput } from '@/components/vektor/diare/umum';
import PilihLokasi from './PilihLokasi';
import type { BarisAnopheles, Opsi } from './tipe';

const f4 = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 4 });

function Teks({ label, nilai, set, saran, nama, wajib, disabled, placeholder }: {
  label: string; nilai: string; set: (v: string) => void; saran: string[]; nama: string;
  wajib?: boolean; disabled?: boolean; placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      <input required={wajib} disabled={disabled} maxLength={120} list={`saran-${nama}`} className={gayaInput}
        value={nilai} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
      <datalist id={`saran-${nama}`}>{saran.map((s) => <option key={s} value={s} />)}</datalist>
    </label>
  );
}

function Angka({ label, nilai, set, wajib, desimal, min, disabled, placeholder }: {
  label: string; nilai: string; set: (v: string) => void; wajib?: boolean; desimal?: boolean;
  min?: number; disabled?: boolean; placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      {desimal ? (
        <input required={wajib} disabled={disabled} inputMode="decimal" className={gayaInput}
          value={nilai} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
      ) : (
        <input required={wajib} disabled={disabled} type="number" inputMode="numeric" step={1} min={min ?? 0}
          className={gayaInput} value={nilai} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
      )}
    </label>
  );
}

export default function FormAnopheles({
  tipe, baris, opsi, onSelesai, onBatal, onLokasiBerubah,
}: {
  tipe: Tipe;
  baris: BarisAnopheles | null; // null = tambah baru
  opsi: Opsi;
  onSelesai: (pesan: string, tipe: Tipe) => void;
  onBatal: () => void;
  onLokasiBerubah?: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris?.tgl_survei ?? hariIniLokal());
  const [wilayah, setWilayah] = useState(baris?.kode_wilker ?? '');
  const [zona, setZona] = useState<Zona | ''>(baris?.zona ?? '');
  const [lokasi, setLokasi] = useState(baris?.sub_lokasi ?? '');
  const [fase, setFase] = useState(baris?.fase_bulan ?? '');
  const [cuaca, setCuaca] = useState(baris?.cuaca ?? '');
  const [suhu, setSuhu] = useState(keInput(baris?.suhu_c));
  const [lembap, setLembap] = useState(keInput(baris?.kelembapan_pct));
  // larva
  const [cidukan, setCidukan] = useState(keInput(baris?.jumlah_cidukan));
  const [larva, setLarva] = useState(baris && tipe === 'larva' ? String(baris.jumlah_larva ?? 0) : '');
  const [jenis, setJenis] = useState(keInput(baris?.jumlah_jenis_larva));
  const [spesiesLarva, setSpesiesLarva] = useState(baris?.spesies_larva ?? '');
  const [macam, setMacam] = useState(baris?.macam_tempat_perindukan ?? '');
  const [keadaan, setKeadaan] = useState(baris?.keadaan_tempat_perindukan ?? '');
  // dewasa
  const [metode, setMetode] = useState(baris?.metode_tangkap ?? '');
  const [nyamuk, setNyamuk] = useState(keInput(baris?.jml_nyamuk));
  const [petugas, setPetugas] = useState(keInput(baris?.jml_petugas));
  const [jam, setJam] = useState(keInput(baris?.jml_jam_tangkap));
  const [spesies, setSpesies] = useState(baris?.spesies ?? '');

  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const tanpaLarva = parseAngka(larva) === 0;
  const nN = parseAngka(nyamuk);
  const nP = parseAngka(petugas);
  const nJ = parseAngka(jam);
  const mbr = nN !== null && nP !== null && nJ !== null ? hitungMbr(nN, nP, nJ) : null;
  const mhd = nN !== null && nP !== null && nJ !== null ? hitungMhd(nN, nP, nJ) : null;

  const lokasiAsli = (w: string, z: string) =>
    baris && w === baris.kode_wilker && z === baris.zona ? baris.sub_lokasi ?? '' : '';
  function gantiWilayah(v: string) {
    setWilayah(v);
    setLokasi(lokasiAsli(v, zona));
  }
  function gantiZona(v: Zona | '') {
    setZona(v);
    setLokasi(lokasiAsli(wilayah, v));
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    const dasar = {
      id: baris?.id, tipe, tanggal, wilayah, zona, sub_lokasi: lokasi, fase_bulan: fase,
      suhu, kelembapan: lembap, cuaca,
    };
    const khusus =
      tipe === 'larva'
        ? {
            cidukan, larva,
            jenis_larva: tanpaLarva ? '' : jenis,
            spesies_larva: tanpaLarva ? '' : spesiesLarva,
            macam, keadaan,
          }
        : { metode, nyamuk, petugas, jam, spesies };
    try {
      const res = await fetch('/api/vektor/anopheles', {
        method: baris ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dasar, ...khusus }),
      });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Gagal menyimpan');
      else onSelesai(`${baris ? 'Perubahan survei' : 'Survei'} ${tipe === 'larva' ? 'larva' : 'nyamuk dewasa'} tersimpan`, tipe);
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
          <span className="mb-1 block text-slate-700">Tanggal survei</span>
          <input required type="date" className={gayaInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select required className={gayaInput} value={wilayah} onChange={(e) => gantiWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Zona</span>
          <select required className={gayaInput} value={zona} onChange={(e) => gantiZona(e.target.value as Zona | '')}>
            <option value="">Pilih zona</option>
            {ZONA.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Fase bulan (opsional)</span>
          <select className={gayaInput} value={fase} onChange={(e) => setFase(e.target.value)}>
            <option value="">Tidak dicatat</option>
            {FASE_BULAN.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>

      <PilihLokasi wilayah={wilayah} zona={zona} nilai={lokasi} onUbah={setLokasi} onLokasiBerubah={onLokasiBerubah} />

      {tipe === 'larva' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Angka label="Jumlah cidukan" nilai={cidukan} set={setCidukan} wajib min={1} />
            <Angka label="Jumlah larva" nilai={larva} set={setLarva} wajib placeholder="0 bila tidak ada" />
            <Angka label="Jumlah jenis larva" nilai={tanpaLarva ? '' : jenis} set={setJenis} disabled={tanpaLarva} />
          </div>
          <Teks label="Spesies larva" nama="spesies-larva" nilai={tanpaLarva ? '' : spesiesLarva} set={setSpesiesLarva}
            saran={opsi.spesiesLarva} disabled={tanpaLarva} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Teks label="Macam tempat perindukan" nama="macam" nilai={macam} set={setMacam} saran={opsi.macam} wajib />
            <Teks label="Keadaan tempat perindukan" nama="keadaan" nilai={keadaan} set={setKeadaan} saran={opsi.keadaan} wajib />
          </div>
        </>
      ) : (
        <>
          <Teks label="Metode tangkap" nama="metode" nilai={metode} set={setMetode} saran={opsi.metode} wajib />
          <div className="grid gap-4 sm:grid-cols-3">
            <Angka label="Jumlah nyamuk" nilai={nyamuk} set={setNyamuk} wajib />
            <Angka label="Jumlah petugas" nilai={petugas} set={setPetugas} wajib min={1} />
            <Angka label="Jumlah jam tangkap" nilai={jam} set={setJam} wajib desimal placeholder="Mis. 6" />
          </div>
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">
            MBR: <strong>{mbr === null ? '-' : f4(mbr)}</strong>
            {' · '}MHD: <strong>{mhd === null ? '-' : f4(mhd)}</strong>
            <span className="mt-1 block text-xs text-slate-600">
              Dihitung otomatis dari jumlah nyamuk, petugas, dan jam tangkap.
            </span>
          </p>
          <Teks label="Spesies (opsional)" nama="spesies" nilai={spesies} set={setSpesies} saran={opsi.spesies}
            placeholder="Pisahkan dengan koma bila lebih dari satu" />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Teks label="Cuaca (opsional)" nama="cuaca" nilai={cuaca} set={setCuaca} saran={opsi.cuaca} />
        <Angka label="Suhu °C (opsional)" nilai={suhu} set={setSuhu} desimal placeholder="Mis. 26,5" />
        <Angka label="Kelembapan % (opsional)" nilai={lembap} set={setLembap} desimal placeholder="Mis. 85" />
      </div>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBatal} className={gayaTombolPutih}>Batal</button>
        <button type="submit" disabled={kirim} className={gayaTombol}>
          {kirim ? 'Menyimpan...' : `Simpan survei ${tipe === 'larva' ? 'larva' : 'nyamuk dewasa'}`}
        </button>
      </div>
    </form>
  );
}