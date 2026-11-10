import { Activity, Biohazard, Globe2, MapPinned, TrendingUp, CalendarRange } from 'lucide-react';
import type { ComponentType } from 'react';

type Baris = {
  penyakit?: string | null; // <-- sesuaikan bila nama kolomnya berbeda
  negara?: string | null;
  total_kasus?: number | null;
  minggu_epid?: number | null;
  bulan?: number | null;
};

type Peringkat = { nama: string; jumlah: number };

export type RingkasEmerging = {
  totalKasus: number;
  jumlahPenyakit: number;
  jumlahNegara: number;
  jumlahPeriode: number;
  penyakitTeratas: Peringkat | null;
  negaraTeratas: Peringkat | null;
  puncak: { label: string; jumlah: number } | null;
};

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmt = (n: number) => n.toLocaleString('id-ID');
const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function hitungRingkasEmerging(
  data: readonly Baris[],
  jenis: 'mingguan' | 'bulanan',
): RingkasEmerging {
  const perPenyakit = new Map<string, number>();
  const perNegara = new Map<string, number>();
  const perPeriode = new Map<number, number>();
  let total = 0;

  for (const r of data) {
    const n = r.total_kasus ?? 0;
    total += n;
    if (r.penyakit) perPenyakit.set(r.penyakit, (perPenyakit.get(r.penyakit) ?? 0) + n);
    if (r.negara) perNegara.set(r.negara, (perNegara.get(r.negara) ?? 0) + n);
    const urutan = jenis === 'mingguan' ? r.minggu_epid : r.bulan;
    if (urutan != null) perPeriode.set(urutan, (perPeriode.get(urutan) ?? 0) + n);
  }

  const teratas = (m: Map<string, number>): Peringkat | null => {
    let hasil: Peringkat | null = null;
    m.forEach((jumlah, nama) => {
      if (!hasil || jumlah > hasil.jumlah) hasil = { nama, jumlah };
    });
    return hasil;
  };

  let puncak: RingkasEmerging['puncak'] = null;
  perPeriode.forEach((jumlah, urutan) => {
    if (!puncak || jumlah > puncak.jumlah) {
      puncak = { jumlah, label: jenis === 'mingguan' ? `Mg ${urutan}` : (NAMA_BULAN[urutan - 1] ?? `Bln ${urutan}`) };
    }
  });

  return {
    totalKasus: total,
    jumlahPenyakit: perPenyakit.size,
    jumlahNegara: perNegara.size,
    jumlahPeriode: perPeriode.size,
    penyakitTeratas: teratas(perPenyakit),
    negaraTeratas: teratas(perNegara),
    puncak,
  };
}

type Nada = 'rose' | 'teal' | 'violet' | 'sky' | 'amber' | 'emerald';

const NADA: Record<Nada, { kartu: string; ikon: string; label: string; bar: string }> = {
  rose:    { kartu: 'from-rose-50 to-white border-rose-100 hover:border-rose-300',          ikon: 'bg-rose-100 text-rose-700',       label: 'text-rose-700',    bar: 'bg-rose-500' },
  teal:    { kartu: 'from-teal-50 to-white border-teal-100 hover:border-teal-300',          ikon: 'bg-teal-100 text-teal-700',       label: 'text-teal-700',    bar: 'bg-teal-500' },
  violet:  { kartu: 'from-violet-50 to-white border-violet-100 hover:border-violet-300',    ikon: 'bg-violet-100 text-violet-700',   label: 'text-violet-700',  bar: 'bg-violet-500' },
  sky:     { kartu: 'from-sky-50 to-white border-sky-100 hover:border-sky-300',             ikon: 'bg-sky-100 text-sky-700',         label: 'text-sky-700',     bar: 'bg-sky-500' },
  amber:   { kartu: 'from-amber-50 to-white border-amber-100 hover:border-amber-300',       ikon: 'bg-amber-100 text-amber-700',     label: 'text-amber-700',   bar: 'bg-amber-500' },
  emerald: { kartu: 'from-emerald-50 to-white border-emerald-100 hover:border-emerald-300', ikon: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700', bar: 'bg-emerald-500' },
};

function Kartu({
  label, nilai, satuan, keterangan, bagian, ikon: Ikon, nada,
}: {
  label: string;
  nilai: string;
  satuan?: string;
  keterangan?: string;
  bagian?: number; // 0-100, tampil sebagai bar proporsi
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
        <span className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums" title={nilai}>{nilai}</span>
        {satuan && <span className="text-sm font-medium text-slate-500">{satuan}</span>}
      </p>
      {bagian !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${bagian}% dari total`}>
          <div className={`h-full rounded-full ${n.bar}`} style={{ width: `${Math.min(100, bagian)}%` }} />
        </div>
      )}
      {keterangan && <p className="mt-1.5 text-xs text-slate-500">{keterangan}</p>}
    </div>
  );
}

export default function GlobalEmergingKartuRingkas({
  ringkas, jenis, labelRentang,
}: {
  ringkas: RingkasEmerging;
  jenis: 'mingguan' | 'bulanan';
  labelRentang: string;
}) {
  const satuanPeriode = jenis === 'mingguan' ? 'minggu' : 'bulan';
  const { totalKasus, penyakitTeratas, negaraTeratas, puncak } = ringkas;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Ringkasan <strong className="text-slate-700">{labelRentang}</strong> (mengikuti filter di atas)
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kartu label="Total Kasus" nilai={fmt(totalKasus)} ikon={Activity} nada="rose" keterangan="Seluruh penyakit & negara" />
        <Kartu label="Penyakit Terdata" nilai={fmt(ringkas.jumlahPenyakit)} ikon={Biohazard} nada="violet" keterangan="Jenis penyakit berbeda" />
        <Kartu label="Negara Terdampak" nilai={fmt(ringkas.jumlahNegara)} ikon={Globe2} nada="sky" keterangan="Negara dengan laporan kasus" />
        <Kartu
          label="Penyakit Teratas"
          nilai={penyakitTeratas?.nama ?? '—'}
          ikon={TrendingUp}
          nada="amber"
          bagian={penyakitTeratas ? persen(penyakitTeratas.jumlah, totalKasus) : undefined}
          keterangan={penyakitTeratas ? `${fmt(penyakitTeratas.jumlah)} kasus · ${persen(penyakitTeratas.jumlah, totalKasus)}%` : 'Belum ada data'}
        />
        <Kartu
          label="Negara Teratas"
          nilai={negaraTeratas?.nama ?? '—'}
          ikon={MapPinned}
          nada="teal"
          bagian={negaraTeratas ? persen(negaraTeratas.jumlah, totalKasus) : undefined}
          keterangan={negaraTeratas ? `${fmt(negaraTeratas.jumlah)} kasus · ${persen(negaraTeratas.jumlah, totalKasus)}%` : 'Belum ada data'}
        />
        <Kartu
          label="Puncak Kasus"
          nilai={puncak?.label ?? '—'}
          ikon={CalendarRange}
          nada="emerald"
          keterangan={puncak ? `${fmt(puncak.jumlah)} kasus dalam 1 ${satuanPeriode}` : 'Belum ada data'}
        />
      </div>
    </div>
  );
}