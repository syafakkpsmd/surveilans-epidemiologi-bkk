import { Bug, Gauge, Thermometer, Droplets, CalendarRange, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';

export type RingkasAnopheles = {
  jumlahPeriode: number;
  rataMhd: number | null;
  rataMbr: number | null;
  rataSuhu: number | null;
  rataKelembaban: number | null;
  puncakMhd: { label: string; nilai: number } | null;
};

const angka = (n: number | null, digit = 2) =>
  n === null ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: digit });

/** Hitung ringkasan dari data tren aktif (mingguan atau bulanan). Nilai kosong diabaikan. */
export function hitungRingkasAnopheles(
  data: Record<string, unknown>[],
  mode: 'mingguan' | 'bulanan',
): RingkasAnopheles {
  const rata = (key: string) => {
    const v = data.map((r) => r[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  let puncak: RingkasAnopheles['puncakMhd'] = null;
  for (const r of data) {
    const nilai = r.mhd;
    if (typeof nilai !== 'number' || !Number.isFinite(nilai)) continue;
    if (!puncak || nilai > puncak.nilai) {
      puncak = {
        nilai,
        label: mode === 'mingguan' ? `Mg ${r.minggu_epid}` : String(r.bulanLabel ?? ''),
      };
    }
  }

  const periode = new Set(data.map((r) => (mode === 'mingguan' ? r.minggu_epid : r.bulanLabel)));

  return {
    jumlahPeriode: periode.size,
    rataMhd: rata('mhd'),
    rataMbr: rata('mbr'),
    rataSuhu: rata('suhu'),
    rataKelembaban: rata('kelembaban'),
    puncakMhd: puncak,
  };
}

type Nada = 'teal' | 'emerald' | 'orange' | 'sky' | 'violet' | 'rose';

const NADA: Record<Nada, { kartu: string; ikon: string; label: string }> = {
  teal:    { kartu: 'from-teal-50 to-white border-teal-100 hover:border-teal-300',       ikon: 'bg-teal-100 text-teal-700',       label: 'text-teal-700' },
  emerald: { kartu: 'from-emerald-50 to-white border-emerald-100 hover:border-emerald-300', ikon: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700' },
  orange:  { kartu: 'from-orange-50 to-white border-orange-100 hover:border-orange-300', ikon: 'bg-orange-100 text-orange-700',   label: 'text-orange-700' },
  sky:     { kartu: 'from-sky-50 to-white border-sky-100 hover:border-sky-300',          ikon: 'bg-sky-100 text-sky-700',         label: 'text-sky-700' },
  violet:  { kartu: 'from-violet-50 to-white border-violet-100 hover:border-violet-300', ikon: 'bg-violet-100 text-violet-700',   label: 'text-violet-700' },
  rose:    { kartu: 'from-rose-50 to-white border-rose-100 hover:border-rose-300',       ikon: 'bg-rose-100 text-rose-700',       label: 'text-rose-700' },
};

function Kartu({
  label, nilai, satuan, keterangan, ikon: Ikon, nada,
}: {
  label: string;
  nilai: string;
  satuan?: string;
  keterangan?: string;
  ikon: ComponentType<{ className?: string }>;
  nada: Nada;
}) {
  const n = NADA[nada];
  return (
    <div className={`group rounded-2xl border bg-linear-to-br p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${n.kartu}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${n.label}`}>{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${n.ikon}`}>
          <Ikon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">{nilai}</span>
        {satuan && <span className="text-sm font-medium text-slate-500">{satuan}</span>}
      </p>
      {keterangan && <p className="mt-1 text-xs text-slate-500">{keterangan}</p>}
    </div>
  );
}

export default function KartuRingkasAnopheles({
  ringkas,
  mode,
  labelRentang,
}: {
  ringkas: RingkasAnopheles;
  mode: 'mingguan' | 'bulanan';
  labelRentang: string;
}) {
  const satuanPeriode = mode === 'mingguan' ? 'minggu' : 'bulan';
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Ringkasan <strong className="text-slate-700">{labelRentang}</strong> (rata-rata per {satuanPeriode} terdata)
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kartu label="Periode Terdata" nilai={String(ringkas.jumlahPeriode)} satuan={satuanPeriode} ikon={CalendarRange} nada="teal" />
        <Kartu label="Rata-rata MHD" nilai={angka(ringkas.rataMhd)} ikon={Bug} nada="emerald" keterangan="Man Hour Density" />
        <Kartu label="Rata-rata MBR" nilai={angka(ringkas.rataMbr)} satuan="/jam" ikon={Gauge} nada="violet" keterangan="Man Biting Rate" />
        <Kartu label="Suhu Rata-rata" nilai={angka(ringkas.rataSuhu, 1)} satuan="°C" ikon={Thermometer} nada="orange" />
        <Kartu label="Kelembaban" nilai={angka(ringkas.rataKelembaban, 1)} satuan="%" ikon={Droplets} nada="sky" />
        <Kartu
          label="Puncak MHD"
          nilai={angka(ringkas.puncakMhd?.nilai ?? null)}
          ikon={TrendingUp}
          nada="rose"
          keterangan={ringkas.puncakMhd ? `Terjadi pada ${ringkas.puncakMhd.label}` : 'Belum ada data'}
        />
      </div>
    </div>
  );
}