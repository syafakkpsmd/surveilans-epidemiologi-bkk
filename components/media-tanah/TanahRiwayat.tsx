'use client';
// components/media-tanah/TanahRiwayat.tsx
import { Fragment, useCallback, useEffect, useState } from 'react';
import { KESIMPULAN, LABEL_KESIMPULAN } from '@/lib/media-tanah/config';

type Baris = {
  id: number; tanggal_periksa: string; wilayah: string; nama_pelabuhan: string; area_lokasi: string;
  alamat_titik: string; petugas_pemeriksa: string; kesimpulan: string;
  temuan_b: number; temuan_d: number; temuan_ce: number;
};
type Rincian = {
  header: Record<string, any>;
  hasil: { bagian: string; kode: string; label: string; hasil: number | null; batas_teks: string | null;
           status: string | null; keterangan: string | null; tindak_lanjut: string | null }[];
};

const LIMIT = 50;
const input =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

const tglLokal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tglIndo = (p: string) =>
  new Date(p + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const angka = (v: number | null) => (v == null ? '-' : String(v).replace('.', ','));

const WARNA_KES: Record<string, string> = {
  memenuhi: 'bg-teal-50 text-teal-800',
  tidak_memenuhi: 'bg-rose-50 text-rose-800',
  perlu_lab: 'bg-amber-50 text-amber-800',
};
const SINGKAT_KES: Record<string, string> = { memenuhi: 'Memenuhi', tidak_memenuhi: 'Tidak memenuhi', perlu_lab: 'Perlu lab lanjutan' };

function PanelRincian({ d }: { d: Rincian }) {
  const h = d.header;
  const temuan = d.hasil.filter((x) => (x.bagian === 'D' ? x.status === 'ada' : x.status === 'tidak_memenuhi'));
  const lab = d.hasil.filter((x) => x.bagian === 'E').length;
  const info: [string, string][] = [
    ['Penanggung jawab', h.penanggung_jawab], ['Titik', h.alamat_titik], ['Cuaca', h.kondisi_cuaca], ['Kegiatan', h.jenis_kegiatan],
  ];
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {info.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex gap-2"><dt className="text-slate-600">{k}:</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div>
        <p className="font-medium">Temuan ({temuan.length})</p>
        {temuan.length === 0 ? (
          <p className="text-slate-600">Tidak ada temuan.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {temuan.map((x) => (
              <li key={x.kode}>
                <span className="text-slate-600">{x.bagian}.</span> {x.label}
                {x.bagian === 'E' || x.bagian === 'C'
                  ? ` (hasil ${angka(x.hasil)}${x.batas_teks ? `, SBMKL ${x.batas_teks}` : ''})`
                  : ''}
                {x.keterangan && <span className="text-slate-600"> Ket: {x.keterangan}.</span>}
                {x.tindak_lanjut && <span className="text-slate-600"> Tindak lanjut: {x.tindak_lanjut}.</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-slate-600">Parameter laboratorium diperiksa: {lab} dari 17.</p>
      {h.uraian_kesimpulan && <p><span className="font-medium">Uraian kesimpulan:</span> {h.uraian_kesimpulan}</p>}
    </div>
  );
}

export default function TanahRiwayat() {
  const awal = { dari: `${new Date().getFullYear()}-01-01`, sampai: tglLokal(new Date()), wilayah: '', kesimpulan: '', q: '' };
  const [saring, setSaring] = useState(awal);
  const [terapan, setTerapan] = useState(awal);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [habis, setHabis] = useState(true);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [buka, setBuka] = useState<number | null>(null);
  const [rincian, setRincian] = useState<Record<number, Rincian | 'gagal'>>({});

  const muat = useCallback(async (offset: number) => {
    setMemuat(true);
    setGalat(null);
    try {
      const q = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      (Object.entries(terapan) as [string, string][]).forEach(([k, v]) => v && q.set(k, v));
      const res = await fetch(`/api/media-tanah?${q}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Gagal memuat data');
      setBaris((s) => (offset === 0 ? j.data : [...s, ...j.data]));
      setHabis(j.data.length < LIMIT);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setMemuat(false);
    }
  }, [terapan]);

  useEffect(() => { muat(0); }, [muat]);

  async function toggle(id: number) {
    if (buka === id) return setBuka(null);
    setBuka(id);
    if (rincian[id]) return;
    try {
      const res = await fetch(`/api/media-tanah/${id}`);
      if (!res.ok) throw new Error();
      const j: Rincian = await res.json();
      setRincian((s) => ({ ...s, [id]: j }));
    } catch {
      setRincian((s) => ({ ...s, [id]: 'gagal' }));
    }
  }

  const set = (k: keyof typeof awal, v: string) => setSaring((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); setBuka(null); setTerapan(saring); }} className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="mb-1 block text-slate-700">Dari</span>
          <input type="date" className={input} value={saring.dari} onChange={(e) => set('dari', e.target.value)} /></label>
        <label className="text-sm"><span className="mb-1 block text-slate-700">Sampai</span>
          <input type="date" className={input} value={saring.sampai} onChange={(e) => set('sampai', e.target.value)} /></label>
        <label className="text-sm"><span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select className={input} value={saring.wilayah} onChange={(e) => set('wilayah', e.target.value)}>
            <option value="">Semua wilayah</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-700">Kesimpulan</span>
          <select className={input} value={saring.kesimpulan} onChange={(e) => set('kesimpulan', e.target.value)}>
            <option value="">Semua</option>
            {KESIMPULAN.map((k) => <option key={k.nilai} value={k.nilai}>{SINGKAT_KES[k.nilai]}</option>)}
          </select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-700">Cari pelabuhan/area</span>
          <input className={input} value={saring.q} onChange={(e) => set('q', e.target.value)} /></label>
        <button type="submit"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          Terapkan
        </button>
      </form>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Tanggal</th>
              <th className="px-3 py-2 font-medium">Pelabuhan / area</th>
              <th className="px-3 py-2 font-medium">Wilayah kerja</th>
              <th className="px-3 py-2 font-medium">Kesimpulan</th>
              <th className="px-3 py-2 text-right font-medium">Temuan</th>
              <th className="px-3 py-2"><span className="sr-only">Rincian</span></th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const jml = Number(b.temuan_b) + Number(b.temuan_d) + Number(b.temuan_ce);
              const r = rincian[b.id];
              return (
                <Fragment key={b.id}>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2">{tglIndo(b.tanggal_periksa)}</td>
                    <td className="px-3 py-2">{b.nama_pelabuhan}{b.area_lokasi && <span className="text-slate-600"> / {b.area_lokasi}</span>}</td>
                    <td className="px-3 py-2">{wk.namaPanjangByKode[b.wilayah] ?? b.wilayah}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${WARNA_KES[b.kesimpulan] ?? ''}`}>
                        {SINGKAT_KES[b.kesimpulan] ?? LABEL_KESIMPULAN[b.kesimpulan]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{jml}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" aria-expanded={buka === b.id} onClick={() => toggle(b.id)}
                        className="text-teal-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                        {buka === b.id ? 'Tutup' : 'Rincian'}
                      </button>
                    </td>
                  </tr>
                  {buka === b.id && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={6} className="px-4 py-3">
                        {!r ? <p className="text-sm text-slate-600">Memuat...</p>
                          : r === 'gagal' ? <p role="alert" className="text-sm text-rose-700">Rincian gagal dimuat</p>
                          : <PanelRincian d={r} />}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!baris.length && !memuat && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Belum ada pemeriksaan pada filter ini</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        {memuat && <p role="status" className="text-sm text-slate-500">Memuat...</p>}
        {!habis && !memuat && (
          <button type="button" onClick={() => muat(baris.length)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
            Muat lebih banyak
          </button>
        )}
      </div>
    </div>
  );
}
