'use client';
// components/media-tanah/TanahForm.tsx
import { useState } from 'react';
import { ITEM_B, ITEM_C, ITEM_D, ITEM_E, SATUAN_E, KESIMPULAN, teksBatas, statusLab } from '@/lib/media-tanah/config';

type It = { status: string; hasil: string; batas: string; keterangan: string; tindak_lanjut: string };
type Form = {
  tanggal: string; wilayah: string; nama_pelabuhan: string; area_lokasi: string; penanggung_jawab: string;
  alamat_titik: string; petugas_pemeriksa: string; kondisi_cuaca: string; jenis_kegiatan: string;
  kesimpulan: string; uraian_kesimpulan: string;
  item: Record<string, It>;
};

const KODE = [...ITEM_B, ...ITEM_C, ...ITEM_D, ...ITEM_E].map((i) => i.kode);
const itemKosong = (): It => ({ status: '', hasil: '', batas: '', keterangan: '', tindak_lanjut: '' });

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const kosong = (awal: Partial<Form> = {}): Form => ({
  tanggal: hariIni(), wilayah: '', nama_pelabuhan: '', area_lokasi: '', penanggung_jawab: '', alamat_titik: '',
  petugas_pemeriksa: '', kondisi_cuaca: '', jenis_kegiatan: '', kesimpulan: '', uraian_kesimpulan: '',
  item: Object.fromEntries(KODE.map((k) => [k, itemKosong()])),
  ...awal,
});

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

const input =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

function Isian({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Seksi({ judul, petunjuk, children }: { judul: string; petunjuk?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{judul}</h3>
        {petunjuk && <p className="text-sm text-slate-600">{petunjuk}</p>}
      </div>
      {children}
    </section>
  );
}

function Pilih({ nama, nilai, pilihan, onPilih }: {
  nama: string; nilai: string; pilihan: { v: string; l: string }[]; onPilih: (v: string) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-5 text-sm">
      {pilihan.map((p) => (
        <label key={p.v} className="flex items-center gap-2">
          <input type="radio" name={nama} required checked={nilai === p.v} onChange={() => onPilih(p.v)} />
          {p.l}
        </label>
      ))}
    </div>
  );
}

const MT = [{ v: 'memenuhi', l: 'Memenuhi' }, { v: 'tidak_memenuhi', l: 'Tidak memenuhi' }];
const ADA = [{ v: 'ada', l: 'Ada' }, { v: 'tidak_ada', l: 'Tidak ada' }];

export default function TanahForm() {
  const [f, setF] = useState<Form>(() => kosong());
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const setI = (kode: string, patch: Partial<It>) =>
    setF((s) => ({ ...s, item: { ...s.item, [kode]: { ...s.item[kode], ...patch } } }));

  const temuan =
    [...ITEM_B, ...ITEM_C].filter((i) => f.item[i.kode].status === 'tidak_memenuhi').length +
    ITEM_E.filter((e) => statusLab(num(f.item[e.kode].hasil), e.batas) === 'tidak_memenuhi').length;

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setPesan(null);
    try {
      const res = await fetch('/api/media-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const j = await res.json();
      if (!res.ok) {
        setPesan({ jenis: 'galat', teks: j.error ?? 'Data gagal disimpan' });
      } else {
        setPesan({ jenis: 'ok', teks: `Pemeriksaan ${f.nama_pelabuhan} tersimpan` });
        // data identitas yang biasanya sama untuk pemeriksaan berikutnya dipertahankan
        setF(kosong({
          tanggal: f.tanggal, wilayah: f.wilayah, nama_pelabuhan: f.nama_pelabuhan,
          penanggung_jawab: f.penanggung_jawab, petugas_pemeriksa: f.petugas_pemeriksa,
        }));
      }
    } catch {
      setPesan({ jenis: 'galat', teks: 'Tidak bisa terhubung ke server' });
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-8">
      <Seksi judul="A. Identitas pemeriksaan">
        <div className="grid gap-4 sm:grid-cols-2">
          <Isian label="Wilayah kerja">
            <select required className={input} value={f.wilayah} onChange={(e) => set('wilayah', e.target.value)}>
              <option value="">Pilih wilayah kerja</option>
              {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
            </select>
          </Isian>
          <Isian label="Tanggal pemeriksaan">
            <input required type="date" className={input} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
          </Isian>
          <Isian label="Nama pelabuhan">
            <input required className={input} value={f.nama_pelabuhan} onChange={(e) => set('nama_pelabuhan', e.target.value)} />
          </Isian>
          <Isian label="Area/lokasi pemeriksaan">
            <input className={input} value={f.area_lokasi} onChange={(e) => set('area_lokasi', e.target.value)} />
          </Isian>
          <Isian label="Nama pengelola/penanggung jawab">
            <input className={input} value={f.penanggung_jawab} onChange={(e) => set('penanggung_jawab', e.target.value)} />
          </Isian>
          <Isian label="Alamat/lokasi titik pemeriksaan">
            <input className={input} value={f.alamat_titik} onChange={(e) => set('alamat_titik', e.target.value)} />
          </Isian>
          <Isian label="Nama petugas pemeriksa">
            <input required className={input} value={f.petugas_pemeriksa} onChange={(e) => set('petugas_pemeriksa', e.target.value)} />
          </Isian>
          <Isian label="Kondisi cuaca">
            <input className={input} value={f.kondisi_cuaca} onChange={(e) => set('kondisi_cuaca', e.target.value)} />
          </Isian>
          <Isian label="Jenis kegiatan di lokasi" className="sm:col-span-2">
            <input className={input} value={f.jenis_kegiatan} onChange={(e) => set('jenis_kegiatan', e.target.value)} />
          </Isian>
        </div>
      </Seksi>

      <Seksi
        judul="B. Pemeriksaan persyaratan kesehatan tanah"
        petunjuk="Untuk temuan yang tidak memenuhi, tuliskan keterangan dan rekomendasi tindak lanjut."
      >
        <div className="space-y-3">
          {ITEM_B.map((b, i) => {
            const it = f.item[b.kode];
            return (
              <div key={b.kode} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm">{i + 1}. {b.label}</p>
                <Pilih nama={b.kode} nilai={it.status} pilihan={MT} onPilih={(v) => setI(b.kode, { status: v })} />
                {it.status === 'tidak_memenuhi' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Isian label="Keterangan">
                      <textarea rows={2} className={input} value={it.keterangan} onChange={(e) => setI(b.kode, { keterangan: e.target.value })} />
                    </Isian>
                    <Isian label="Rekomendasi/tindak lanjut">
                      <textarea required rows={2} className={input} value={it.tindak_lanjut} onChange={(e) => setI(b.kode, { tindak_lanjut: e.target.value })} />
                    </Isian>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Seksi>

      <Seksi judul="C. Pemeriksaan kondisi fisik tanah" petunjuk="Diisi sesuai pengamatan atau pengukuran. Boleh dikosongkan jika tidak diukur.">
        <div className="hidden gap-2 text-xs text-slate-600 sm:grid sm:grid-cols-[1fr_8rem_3rem_9rem_11rem]">
          <span>Parameter</span><span>Hasil</span><span>Satuan</span><span>Nilai SBMKL</span><span>Memenuhi / Tidak</span>
        </div>
        {ITEM_C.map((c, i) => {
          const it = f.item[c.kode];
          return (
            <div key={c.kode} className="grid items-center gap-2 sm:grid-cols-[1fr_8rem_3rem_9rem_11rem]">
              <span className="text-sm">{i + 1}. {c.label}</span>
              <input aria-label={`${c.label}: hasil`} type="number" step="any" inputMode="decimal" className={input}
                value={it.hasil} onChange={(e) => setI(c.kode, { hasil: e.target.value })} />
              <span className="text-sm text-slate-600">{c.satuan}</span>
              <input aria-label={`${c.label}: nilai SBMKL`} className={input} value={it.batas}
                onChange={(e) => setI(c.kode, { batas: e.target.value })} />
              <select aria-label={`${c.label}: memenuhi atau tidak`} className={input} value={it.status}
                onChange={(e) => setI(c.kode, { status: e.target.value })}>
                <option value="">-</option>
                <option value="memenuhi">Memenuhi</option>
                <option value="tidak_memenuhi">Tidak memenuhi</option>
              </select>
            </div>
          );
        })}
      </Seksi>

      <Seksi judul="D. Identifikasi potensi sumber pencemaran di area pelabuhan">
        <div className="space-y-3">
          {ITEM_D.map((d, i) => {
            const it = f.item[d.kode];
            return (
              <div key={d.kode} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm">{i + 1}. {d.label}</p>
                <Pilih nama={d.kode} nilai={it.status} pilihan={ADA} onPilih={(v) => setI(d.kode, { status: v })} />
                {it.status === 'ada' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Isian label="Keterangan">
                      <textarea rows={2} className={input} value={it.keterangan} onChange={(e) => setI(d.kode, { keterangan: e.target.value })} />
                    </Isian>
                    <Isian label="Tindak lanjut">
                      <textarea rows={2} className={input} value={it.tindak_lanjut} onChange={(e) => setI(d.kode, { tindak_lanjut: e.target.value })} />
                    </Isian>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Seksi>

      <Seksi
        judul="E. Pemeriksaan laboratorium media tanah"
        petunjuk="Diisi apabila dilakukan pengambilan sampel tanah. Kosongkan parameter yang tidak diperiksa. Status dihitung otomatis dari nilai SBMKL."
      >
        <div className="hidden gap-2 text-xs text-slate-600 sm:grid sm:grid-cols-[1fr_9rem_4rem_6rem_9rem]">
          <span>Parameter</span><span>Hasil</span><span>Satuan</span><span>SBMKL</span><span>Status</span>
        </div>
        {ITEM_E.map((e, i) => {
          const hasil = f.item[e.kode].hasil;
          const s = statusLab(num(hasil), e.batas);
          return (
            <div key={e.kode} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem_4rem_6rem_9rem]">
              <span className="text-sm">{i + 1}. {e.label}</span>
              <input aria-label={`${e.label}: hasil`} type="number" step="any" min={0} inputMode="decimal" className={input}
                value={hasil} onChange={(ev) => setI(e.kode, { hasil: ev.target.value })} />
              <span className="text-sm text-slate-600">{SATUAN_E}</span>
              <span className="text-sm tabular-nums">{teksBatas(e.batas)}</span>
              <span className={`text-sm ${s === 'tidak_memenuhi' ? 'font-medium text-rose-700' : 'text-teal-800'}`}>
                {s === 'memenuhi' ? 'Memenuhi' : s === 'tidak_memenuhi' ? 'Melebihi batas' : ''}
              </span>
            </div>
          );
        })}
      </Seksi>

      <Seksi judul="F. Kesimpulan dan rekomendasi">
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 text-slate-700">Kesimpulan pemeriksaan</legend>
          {KESIMPULAN.map((k) => (
            <label key={k.nilai} className="flex items-center gap-2">
              <input type="radio" name="kesimpulan" required checked={f.kesimpulan === k.nilai} onChange={() => set('kesimpulan', k.nilai)} />
              {k.label}
            </label>
          ))}
        </fieldset>
        {temuan > 0 && (
          <p role="status" className={`text-sm ${f.kesimpulan === 'memenuhi' ? 'text-rose-700' : 'text-slate-600'}`}>
            Ada {temuan} temuan tidak memenuhi pada bagian B, C, dan E
            {f.kesimpulan === 'memenuhi' ? ', sehingga kesimpulan tidak boleh "Memenuhi".' : '.'}
          </p>
        )}
        <Isian label="Uraian kesimpulan/rekomendasi">
          <textarea rows={4} className={input} value={f.uraian_kesimpulan} onChange={(e) => set('uraian_kesimpulan', e.target.value)} />
        </Isian>
      </Seksi>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={kirim}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          {kirim ? 'Menyimpan...' : 'Simpan pemeriksaan'}
        </button>
        {pesan && (
          <p role="status" className={`text-sm ${pesan.jenis === 'ok' ? 'text-teal-800' : 'text-rose-700'}`}>{pesan.teks}</p>
        )}
      </div>
    </form>
  );
}
