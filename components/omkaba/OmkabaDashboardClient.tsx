'use client';

// Dasbor Lalu Lintas OMKABA. Data satu tahun dimuat sekali dari server; semua filter, grafik, dan tabel dihitung
// ulang di browser (lib/omkaba/hitung.ts), jadi mengeklik grafik langsung menyaring seluruh halaman.
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DAFTAR_DOKUMEN } from '@/lib/omkaba/dokumen';
import {
  NAMA_BULAN, hcDiterbitkan, jumlahDokumenAda, keCsv, kelengkapanDokumen, kunci, layananDari, negaraDari, peringkat,
  perusahaanDari, ringkas, terapkan, trenBulanan,
  type BarisOmkaba, type BasisNegara, type ItemPeringkat, type KunciSaring, type Saring,
} from '@/lib/omkaba/hitung';

const WARNA = { ekspor: '#0F4C5C', impor: '#E0A100', lainnya: '#90A4AE', pnbp: '#B71C1C', ada: '#2E7D32', tidak: '#C62828', kosong: '#CFD8DC' };
const WARNA_LAYANAN: Record<string, string> = { Ekspor: WARNA.ekspor, Impor: WARNA.impor, Lainnya: WARNA.lainnya };
const WARNA_DERET = ['#0F4C5C', '#006064', '#2E7D8C', '#5D4037', '#8D6E63', '#546E7A', '#7B1FA2', '#455A64'];
const UKURAN_HALAMAN = 10;

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const rupiahRingkas = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} M` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} jt` : n >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(n);
const angka = (n: number) => n.toLocaleString('id-ID');
const tglIndo = (iso: string) => (iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);

function Panel({ judul, keterangan, aksi, children, lebar }: { judul: string; keterangan?: string; aksi?: ReactNode; children: ReactNode; lebar?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5 ${lebar ?? ''}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#0F2A38]">{judul}</h2>
          {keterangan && <p className="text-xs text-gray-500">{keterangan}</p>}
        </div>
        {aksi}
      </div>
      {children}
    </section>
  );
}

function Tab<T extends string>({ nilai, pilihan, onUbah }: { nilai: T; pilihan: { v: T; t: string }[]; onUbah: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
      {pilihan.map((p) => (
        <button key={p.v} type="button" role="tab" aria-selected={nilai === p.v} onClick={() => onUbah(p.v)}
          className={`rounded-md px-2.5 py-1 font-medium transition ${nilai === p.v ? 'bg-white text-[#0F4C5C] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{p.t}</button>
      ))}
    </div>
  );
}

function Kpi({ label, nilai, catatan, warna = '#0F4C5C' }: { label: string; nilai: string; catatan?: string; warna?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" style={{ borderTop: `3px solid ${warna}` }}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{nilai}</p>
      {catatan && <p className="mt-0.5 text-xs text-gray-500">{catatan}</p>}
    </div>
  );
}

function DaftarBatang({ data, aktif, onPilih, warna = '#0F4C5C', kosong = 'Belum ada data.' }: {
  data: ItemPeringkat[]; aktif?: string; onPilih: (nama: string) => void; warna?: string; kosong?: string;
}) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  if (!data.length) return <p className="py-6 text-center text-sm text-gray-400">{kosong}</p>;
  return (
    <ul className="space-y-1.5">
      {data.map((d) => {
        const dipilih = !!aktif && kunci(aktif) === kunci(d.nama);
        return (
          <li key={d.nama}>
            <button type="button" aria-pressed={dipilih} onClick={() => onPilih(d.nama)}
              className={`group w-full rounded-lg px-2 py-1.5 text-left transition ${dipilih ? 'bg-[#0F4C5C]/10 ring-1 ring-[#0F4C5C]' : 'hover:bg-gray-50'}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium text-[#0F2A38]" title={d.nama}>{d.nama}</span>
                <span className="shrink-0 font-semibold text-gray-700">{angka(d.jumlah)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${(d.jumlah / maks) * 100}%`, background: warna }} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Donut({ data, aktif, onPilih }: { data: ItemPeringkat[]; aktif?: string; onPilih: (nama: string) => void }) {
  const total = data.reduce((s, d) => s + d.jumlah, 0);
  const r = 40;
  const keliling = 2 * Math.PI * r;
  let geser = 0;
  if (!total) return <p className="py-6 text-center text-sm text-gray-400">Belum ada data.</p>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Diagram jenis layanan">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#ECEFF1" strokeWidth="14" />
          {data.map((d) => {
            const panjang = (d.jumlah / total) * keliling;
            const el = (
              <circle key={d.nama} cx="50" cy="50" r={r} fill="none" stroke={WARNA_LAYANAN[d.nama] ?? WARNA.lainnya}
                strokeWidth={aktif === d.nama ? 18 : 14} strokeDasharray={`${panjang} ${keliling - panjang}`} strokeDashoffset={-geser}
                className="cursor-pointer transition-all" onClick={() => onPilih(d.nama)}>
                <title>{`${d.nama}: ${d.jumlah}`}</title>
              </circle>
            );
            geser += panjang;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#0F2A38]">{angka(total)}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">sertifikat</span>
        </div>
      </div>
      <ul className="min-w-32 flex-1 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.nama}>
            <button type="button" aria-pressed={aktif === d.nama} onClick={() => onPilih(d.nama)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 transition ${aktif === d.nama ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'}`}>
              <span className="h-3 w-3 rounded-sm" style={{ background: WARNA_LAYANAN[d.nama] ?? WARNA.lainnya }} />
              <span className="flex-1 text-left text-[#0F2A38]">{d.nama}</span>
              <span className="font-semibold">{angka(d.jumlah)}</span>
              <span className="w-10 text-right text-xs text-gray-400">{Math.round((d.jumlah / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const KOLOM: { k: string; t: string; nilai: (b: BarisOmkaba) => string | number; kanan?: boolean }[] = [
  { k: 'tanggal', t: 'Tanggal', nilai: (b) => b.tanggal },
  { k: 'no_dokumen', t: 'No Dokumen', nilai: (b) => b.no_dokumen },
  { k: 'layanan', t: 'Layanan', nilai: (b) => layananDari(b) },
  { k: 'perusahaan', t: 'Eksportir/Importir', nilai: (b) => perusahaanDari(b) ?? '' },
  { k: 'komoditi', t: 'Komoditi', nilai: (b) => b.jenis_komoditi ?? '' },
  { k: 'rute', t: 'Asal → Tujuan', nilai: (b) => `${b.pelabuhan_asal ?? '-'} → ${b.pelabuhan_tujuan ?? '-'}` },
  { k: 'kapal', t: 'Kapal', nilai: (b) => b.nama_kapal ?? '' },
  { k: 'dok', t: 'Dokumen', nilai: (b) => jumlahDokumenAda(b) },
  { k: 'hc', t: 'Health Cert.', nilai: (b) => (hcDiterbitkan(b) ? 1 : 0) },
  { k: 'pnbp', t: 'PNBP', nilai: (b) => b.jumlah_bayar ?? 0, kanan: true },
];

function unduhCsv(baris: BarisOmkaba[], tahun: number) {
  const blob = new Blob([keCsv(baris)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `omkaba-${tahun}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OmkabaDashboardClient({ baris, tahun, labelWilayah, bolehInput }: {
  baris: BarisOmkaba[]; tahun: number; labelWilayah: string; bolehInput: boolean;
}) {
  const [f, setF] = useState<Saring>({});
  const [basisNegara, setBasisNegara] = useState<BasisNegara>('tujuan');
  const [basisPelabuhan, setBasisPelabuhan] = useState<BasisNegara>('asal');
  const [urut, setUrut] = useState<{ k: string; arah: 1 | -1 }>({ k: 'tanggal', arah: -1 });
  const [halaman, setHalaman] = useState(1);
  const [buka, setBuka] = useState<string | null>(null);

  const alih = <K extends KunciSaring>(k: K, v: Saring[K]) => {
    setF((s) => ({ ...s, [k]: s[k] === v ? undefined : v }));
    setHalaman(1);
  };
  const adaFilter = Object.values(f).some((v) => v !== undefined && v !== '');

  // Tiap panel disaring dengan SEMUA filter kecuali dimensinya sendiri, supaya pilihan bisa diganti langsung.
  const terSaring = useMemo(() => terapkan(baris, f, basisNegara), [baris, f, basisNegara]);
  const ringkasan = useMemo(() => ringkas(terSaring), [terSaring]);
  const tren = useMemo(() => trenBulanan(terapkan(baris, f, basisNegara, 'bulan')), [baris, f, basisNegara]);
  const layanan = useMemo(() => peringkat(terapkan(baris, f, basisNegara, 'layanan'), layananDari, 3), [baris, f, basisNegara]);
  const komoditi = useMemo(() => peringkat(terapkan(baris, f, basisNegara, 'komoditi'), (b) => b.jenis_komoditi, 8), [baris, f, basisNegara]);
  const negara = useMemo(() => peringkat(terapkan(baris, f, basisNegara, 'negara'), (b) => negaraDari(b, basisNegara), 8), [baris, f, basisNegara]);
  const perusahaan = useMemo(() => peringkat(terapkan(baris, f, basisNegara, 'perusahaan'), perusahaanDari, 8), [baris, f, basisNegara]);
  const kapal = useMemo(() => peringkat(terapkan(baris, f, basisNegara, 'kapal'), (b) => b.nama_kapal, 8), [baris, f, basisNegara]);
  const pelabuhan = useMemo(
    () => peringkat(terapkan(baris, f, basisNegara, 'cari'), (b) => (basisPelabuhan === 'asal' ? b.pelabuhan_asal : b.pelabuhan_tujuan), 8),
    [baris, f, basisNegara, basisPelabuhan],
  );
  const dokumen = useMemo(() => kelengkapanDokumen(terSaring), [terSaring]);

  const urutan = useMemo(() => {
    const kolom = KOLOM.find((c) => c.k === urut.k) ?? KOLOM[0];
    return [...terSaring].sort((a, b) => {
      const x = kolom.nilai(a), y = kolom.nilai(b);
      const hasil = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id');
      return hasil * urut.arah || a.no_dokumen.localeCompare(b.no_dokumen);
    });
  }, [terSaring, urut]);
  const totalHalaman = Math.max(1, Math.ceil(urutan.length / UKURAN_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const tampil = urutan.slice((halamanAman - 1) * UKURAN_HALAMAN, halamanAman * UKURAN_HALAMAN);

  const klikBulan = (s: unknown) => {
    const st = s as { activeLabel?: string | number; activeIndex?: number | string; activeTooltipIndex?: number } | null;
    const dariLabel = st?.activeLabel != null ? NAMA_BULAN.indexOf(String(st.activeLabel)) : -1;
    const idx = st?.activeTooltipIndex ?? (st?.activeIndex != null ? Number(st.activeIndex) : undefined);
    const bulan = dariLabel >= 0 ? dariLabel + 1 : idx != null && !Number.isNaN(idx) ? idx + 1 : undefined;
    if (bulan) alih('bulan', bulan);
  };

  const chip: { k: KunciSaring; teks: string }[] = [];
  if (f.layanan) chip.push({ k: 'layanan', teks: `Layanan: ${f.layanan}` });
  if (f.bulan) chip.push({ k: 'bulan', teks: `Bulan: ${NAMA_BULAN[f.bulan - 1]} ${tahun}` });
  if (f.komoditi) chip.push({ k: 'komoditi', teks: `Komoditi: ${f.komoditi}` });
  if (f.negara) chip.push({ k: 'negara', teks: `Negara ${basisNegara}: ${f.negara}` });
  if (f.perusahaan) chip.push({ k: 'perusahaan', teks: `Perusahaan: ${f.perusahaan}` });
  if (f.kapal) chip.push({ k: 'kapal', teks: `Kapal: ${f.kapal}` });
  if (f.cari) chip.push({ k: 'cari', teks: `Cari: ${f.cari}` });

  if (baris.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-base font-semibold text-[#0F2A38]">Belum ada data OMKABA untuk {labelWilayah} tahun {tahun}</p>
        <p className="mt-1 text-sm text-gray-500">Unggah berkas Rekapitulasi Lalu Lintas OMKABA dari Sinkarkes, atau pilih tahun lain.</p>
        {bolehInput && (
          <Link href="/dashboard/input-data/omkaba" className="mt-4 inline-block rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B3A46]">Input / Unggah Data</Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(adaFilter || bolehInput) && (
        <div className="flex flex-wrap items-center gap-2">
          {chip.map((c) => (
            <button key={c.k} type="button" onClick={() => { setF((s) => ({ ...s, [c.k]: undefined })); setHalaman(1); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F4C5C] px-3 py-1 text-xs font-medium text-white hover:bg-[#0B3A46]" title="Klik untuk menghapus filter">
              {c.teks} <span aria-hidden>✕</span>
            </button>
          ))}
          {adaFilter && <button type="button" onClick={() => { setF({}); setHalaman(1); }} className="text-xs text-[#0F4C5C] underline">Reset semua filter</button>}
          {!adaFilter && <p className="text-xs text-gray-500">Klik grafik, daftar, atau diagram untuk menyaring seluruh halaman.</p>}
          {bolehInput && (
            <Link href="/dashboard/input-data/omkaba" className="ml-auto rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Input / Unggah / Edit Data</Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total Sertifikat" nilai={angka(ringkasan.total)} catatan={`${angka(ringkasan.hcDiterbitkan)} Health Certificate diterbitkan`} />
        <Kpi label="Ekspor" nilai={angka(ringkasan.ekspor)} warna={WARNA.ekspor} catatan={ringkasan.total ? `${Math.round((ringkasan.ekspor / ringkasan.total) * 100)}% dari total` : undefined} />
        <Kpi label="Impor" nilai={angka(ringkasan.impor)} warna={WARNA.impor} catatan={ringkasan.total ? `${Math.round((ringkasan.impor / ringkasan.total) * 100)}% dari total` : undefined} />
        <Kpi label="Total PNBP" nilai={rupiah(ringkasan.pnbp)} warna={WARNA.pnbp} />
        <Kpi label="Eksportir/Importir" nilai={angka(ringkasan.perusahaan)} catatan={`${angka(ringkasan.kapal)} kapal/maskapai`} warna="#006064" />
        <Kpi label="Kelengkapan Dokumen" nilai={ringkasan.kelengkapanPersen == null ? '-' : `${ringkasan.kelengkapanPersen}%`} catatan="Dokumen berstatus Ada" warna={WARNA.ada} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel judul="Tren Bulanan" keterangan={`Jumlah sertifikat dan PNBP, ${tahun}. Klik batang untuk memilih bulan.`} lebar="lg:col-span-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={tren} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} onClick={klikBulan} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="kiri" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="kanan" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v: number) => rupiahRingkas(v)} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="kiri" dataKey="ekspor" name="Ekspor" stackId="a" fill={WARNA.ekspor}>
                  {tren.map((t) => <Cell key={t.bulan} fill={WARNA.ekspor} fillOpacity={f.bulan && f.bulan !== t.bulan ? 0.3 : 1} />)}
                </Bar>
                <Bar yAxisId="kiri" dataKey="impor" name="Impor" stackId="a" fill={WARNA.impor}>
                  {tren.map((t) => <Cell key={t.bulan} fill={WARNA.impor} fillOpacity={f.bulan && f.bulan !== t.bulan ? 0.3 : 1} />)}
                </Bar>
                <Bar yAxisId="kiri" dataKey="lainnya" name="Lainnya" stackId="a" fill={WARNA.lainnya} />
                <Line yAxisId="kanan" type="monotone" dataKey="pnbp" name="PNBP (Rp)" stroke={WARNA.pnbp} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel judul="Jenis Layanan" keterangan="Klik untuk menyaring">
          <Donut data={layanan} aktif={f.layanan} onPilih={(n) => alih('layanan', n)} />
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Jenis Komoditi</h3>
          <DaftarBatang data={komoditi} aktif={f.komoditi} onPilih={(n) => alih('komoditi', n)} warna="#006064" />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel judul="Negara" aksi={<Tab nilai={basisNegara} onUbah={(v) => { setBasisNegara(v); setF((s) => ({ ...s, negara: undefined })); }} pilihan={[{ v: 'tujuan', t: 'Tujuan' }, { v: 'asal', t: 'Asal' }]} />}>
          <DaftarBatang data={negara} aktif={f.negara} onPilih={(n) => alih('negara', n)} warna={WARNA_DERET[0]} />
        </Panel>
        <Panel judul="Pelabuhan/Bandara" keterangan="Klik untuk mencari di tabel" aksi={<Tab nilai={basisPelabuhan} onUbah={setBasisPelabuhan} pilihan={[{ v: 'asal', t: 'Asal' }, { v: 'tujuan', t: 'Tujuan' }]} />}>
          <DaftarBatang data={pelabuhan} aktif={f.cari} onPilih={(n) => alih('cari', n)} warna={WARNA_DERET[2]} />
        </Panel>
        <Panel judul="Eksportir / Importir">
          <DaftarBatang data={perusahaan} aktif={f.perusahaan} onPilih={(n) => alih('perusahaan', n)} warna={WARNA_DERET[3]} />
        </Panel>
        <Panel judul="Kapal / Maskapai">
          <DaftarBatang data={kapal} aktif={f.kapal} onPilih={(n) => alih('kapal', n)} warna={WARNA_DERET[5]} />
        </Panel>
      </div>

      <Panel judul="Kelengkapan Dokumen Pendukung" keterangan="Jumlah sertifikat per dokumen: Ada, Tidak Ada, atau tidak diisi di Sinkarkes">
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
          {[['Ada', WARNA.ada], ['Tidak Ada', WARNA.tidak], ['Tidak diisi', WARNA.kosong]].map(([t, w]) => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: w }} />{t}</span>
          ))}
        </div>
        <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {dokumen.map((d) => {
            const total = d.ada + d.tidak + d.kosong || 1;
            const terisi = d.ada + d.tidak;
            return (
              <li key={d.kolom} className="text-xs">
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate font-medium text-[#0F2A38]" title={d.label}>{d.label}</span>
                  <span className="shrink-0 text-gray-500">{terisi ? `${Math.round((d.ada / terisi) * 100)}% ada` : 'belum diisi'} · {d.ada}/{d.tidak}/{d.kosong}</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${d.label}: ${d.ada} ada, ${d.tidak} tidak ada, ${d.kosong} tidak diisi`}>
                  <div style={{ width: `${(d.ada / total) * 100}%`, background: WARNA.ada }} />
                  <div style={{ width: `${(d.tidak / total) * 100}%`, background: WARNA.tidak }} />
                  <div style={{ width: `${(d.kosong / total) * 100}%`, background: WARNA.kosong }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel judul="Daftar Sertifikat" keterangan={`${angka(urutan.length)} dari ${angka(baris.length)} sertifikat. Klik baris untuk melihat rincian.`}
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <input type="search" placeholder="Cari dokumen, perusahaan, kapal, negara…" value={f.cari ?? ''} aria-label="Cari di tabel"
              onChange={(e) => { setF((s) => ({ ...s, cari: e.target.value || undefined })); setHalaman(1); }}
              className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20" />
            <button type="button" onClick={() => unduhCsv(urutan, tahun)} disabled={!urutan.length}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Unduh CSV</button>
          </div>
        }>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                {KOLOM.map((c) => (
                  <th key={c.k} scope="col" aria-sort={urut.k === c.k ? (urut.arah === 1 ? 'ascending' : 'descending') : 'none'} className={`whitespace-nowrap px-2 py-2 font-semibold ${c.kanan ? 'text-right' : ''}`}>
                    <button type="button" onClick={() => setUrut((u) => ({ k: c.k, arah: u.k === c.k && u.arah === 1 ? -1 : 1 }))} className="inline-flex items-center gap-1 hover:text-[#0F4C5C]">
                      {c.t}<span aria-hidden className="text-[10px]">{urut.k === c.k ? (urut.arah === 1 ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tampil.map((b) => (
                <Fragment key={b.id}>
                  <tr className="cursor-pointer border-b border-gray-100 hover:bg-[#0F4C5C]/5" onClick={() => setBuka(buka === b.id ? null : b.id)} aria-expanded={buka === b.id}>
                    <td className="whitespace-nowrap px-2 py-2">{tglIndo(b.tanggal)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-[#0F2A38]">{b.no_dokumen}</td>
                    <td className="px-2 py-2"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: WARNA_LAYANAN[layananDari(b)] }}>{layananDari(b)}</span></td>
                    <td className="max-w-48 truncate px-2 py-2" title={perusahaanDari(b) ?? ''}>{perusahaanDari(b) ?? '-'}</td>
                    <td className="px-2 py-2">{b.jenis_komoditi ?? '-'}</td>
                    <td className="max-w-56 truncate px-2 py-2" title={`${b.pelabuhan_asal ?? '-'} → ${b.pelabuhan_tujuan ?? '-'}`}>{b.pelabuhan_asal ?? '-'} → {b.pelabuhan_tujuan ?? '-'}</td>
                    <td className="max-w-40 truncate px-2 py-2" title={b.nama_kapal ?? ''}>{b.nama_kapal ?? '-'}</td>
                    <td className="whitespace-nowrap px-2 py-2">{jumlahDokumenAda(b)}/{DAFTAR_DOKUMEN.length}</td>
                    <td className="px-2 py-2">
                      <span title={b.health_certificate ?? ''} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hcDiterbitkan(b) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>{hcDiterbitkan(b) ? 'Diterbitkan' : 'Tidak'}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">{b.jumlah_bayar == null ? '-' : rupiah(b.jumlah_bayar)}</td>
                  </tr>
                  {buka === b.id && (
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <td colSpan={KOLOM.length} className="px-4 py-3">
                        <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          {([['Wilayah Kerja', b.wilayah_kerja], ['Keagenan', b.nama_keagenan], ['Buyer', b.nama_buyer], ['Negara Asal → Tujuan', `${b.negara_asal ?? '-'} → ${b.negara_tujuan ?? '-'}`], ['No Voyage', b.no_voyage], ['Petugas Pemeriksa', b.petugas_pemeriksa], ['Health Certificate', b.health_certificate]] as [string, string | null][]).map(([t, v]) => (
                            <div key={t} className="flex gap-2"><dt className="w-36 shrink-0 text-gray-500">{t}</dt><dd className="font-medium text-[#0F2A38]">{v || '-'}</dd></div>
                          ))}
                        </dl>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {DAFTAR_DOKUMEN.map((d) => {
                            const v = b.dok[d.kolom];
                            const ada = v ? !kunci(v).startsWith('TIDAK') : null;
                            return (
                              <span key={d.kolom} className={`rounded-md px-2 py-0.5 text-[11px] ${ada === null ? 'bg-gray-200 text-gray-500' : ada ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {ada === null ? '–' : ada ? '✓' : '✗'} {d.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!tampil.length && <tr><td colSpan={KOLOM.length} className="px-2 py-8 text-center text-gray-400">Tidak ada sertifikat yang cocok dengan filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-600">
          <span>Halaman {halamanAman} dari {totalHalaman}</span>
          <div className="flex gap-2">
            <button type="button" disabled={halamanAman <= 1} onClick={() => setHalaman(halamanAman - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">Sebelumnya</button>
            <button type="button" disabled={halamanAman >= totalHalaman} onClick={() => setHalaman(halamanAman + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">Berikutnya</button>
          </div>
        </div>
      </Panel>
    </div>
  );
}