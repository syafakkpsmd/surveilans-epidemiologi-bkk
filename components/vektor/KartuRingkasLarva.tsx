import { CalendarRange, Waves, Bug, Gauge, Thermometer, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';

export type RingkasLarva = {
  jumlahPeriode: number;
  totalCidukan: number;
  totalLarva: number;
  larvaPerCidukan: number | null;
  rataSuhu: number | null;
  puncakLarva: { label: string; nilai: number } | null;
};

const angka = (n: number | null, digit = 1) =>
  n === null ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: digit });

const adalahAngka = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function hitungRingkasLarva(
  data: Record<string, unknown>[],
  mode: 'mingguan' | 'bulanan',
): RingkasLarva {
  const jumlah = (key: string) => data.map((r) => r[key]).filter(adalahAngka).reduce((a, b) => a + b, 0);
  const suhu = data.map((r) => r.suhu).filter(adalahAngka);

  let puncak: RingkasLarva['puncakLarva'] = null;
  for (const r of data) {
    if (!adalahAngka(r.larva)) continue;
    if (!puncak || r.larva > puncak.nilai) {
      puncak = {
        nilai: r.larva,
        label: mode === 'mingguan' ? `Mg ${r.minggu_epid}` : String(r.bulanLabel ?? ''),
      };
    }
  }

  const totalCidukan = jumlah('cidukan');
  const totalLarva = jumlah('larva');

  return {
    jumlahPeriode: new Set(data.map((r) => (mode === 'mingguan' ? r.minggu_epid : r.bulanLabel))).size,
    totalCidukan,
    totalLarva,
    larvaPerCidukan: totalCidukan > 0 ? totalLarva / totalCidukan : null,
    rataSuhu: suhu.length ? suhu.reduce((a, b) => a + b, 0) / suhu.length : null,
    puncakLarva: puncak,
  };
}

type Nada = 'teal' | 'emerald' | 'orange' | 'sky' | 'violet' | 'rose';

const NADA: Record<Nada, { kartu: string; ikon: string; label: string }> = {
  teal:    { kartu: 'from-teal-50 to-white border-teal-100 hover:border-teal-300',          ikon: 'bg-teal-100 text-teal-700',       label: 'text-teal-700' },
  emerald: { kartu: 'from-emerald-50 to-white border-emerald-100 hover:border-emerald-300', ikon: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700' },
  orange:  { kartu: 'from-orange-50 to-white border-orange-100 hover:border-orange-300',    ikon: 'bg-orange-100 text-orange-700',   label: 'text-orange-700' },
  sky:     { kartu: 'from-sky-50 to-white border-sky-100 hover:border-sky-300',             ikon: 'bg-sky-100 text-sky-700',         label: 'text-sky-700' },
  violet:  { kartu: 'from-violet-50 to-white border-violet-100 hover:border-violet-300',    ikon: 'bg-violet-100 text-violet-700',   label: 'text-violet-700' },
  rose:    { kartu: 'from-rose-50 to-white border-rose-100 hover:border-rose-300',          ikon: 'bg-rose-100 text-rose-700',       label: 'text-rose-700' },
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
    <div className={`rounded-2xl border bg-linear-to-br p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${n.kartu}`}>
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

export default function KartuRingkasLarva({
  ringkas, mode, labelRentang,
}: {
  ringkas: RingkasLarva;
  mode: 'mingguan' | 'bulanan';
  labelRentang: string;
}) {
  const satuanPeriode = mode === 'mingguan' ? 'minggu' : 'bulan';
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Ringkasan <strong className="text-slate-700">{labelRentang}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kartu label="Periode Terdata" nilai={String(ringkas.jumlahPeriode)} satuan={satuanPeriode} ikon={CalendarRange} nada="teal" />
        <Kartu label="Cidukan Positif" nilai={angka(ringkas.totalCidukan, 0)} ikon={Waves} nada="sky" keterangan="Total pada rentang" />
        <Kartu label="Jumlah Larva" nilai={angka(ringkas.totalLarva, 0)} ikon={Bug} nada="emerald" keterangan="Total pada rentang" />
        <Kartu label="Larva / Cidukan" nilai={angka(ringkas.larvaPerCidukan, 2)} ikon={Gauge} nada="violet" keterangan="Indikator kepadatan" />
        <Kartu label="Suhu Rata-rata" nilai={angka(ringkas.rataSuhu)} satuan="°C" ikon={Thermometer} nada="orange" />
        <Kartu
          label="Puncak Larva"
          nilai={angka(ringkas.puncakLarva?.nilai ?? null, 0)}
          ikon={TrendingUp}
          nada="rose"
          keterangan={ringkas.puncakLarva ? `Terjadi pada ${ringkas.puncakLarva.label}` : 'Belum ada data'}
        />
      </div>
    </div>
  );
}