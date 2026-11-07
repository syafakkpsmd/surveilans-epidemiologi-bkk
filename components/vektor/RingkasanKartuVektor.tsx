// components/vektor/RingkasanKartuVektor.tsx
// Kartu ringkasan (KPI) surveilans vektor Aedes. Server component, tanpa hook.
// Semua angka dihitung dari TOTAL periode terpilih (agregat), bukan rata-rata mingguan.

type BarisAktivitas = {
  rumah_diperiksa?: number | string | null;
  rumah_positif?: number | string | null;
  container_diperiksa?: number | string | null;
  container_positif?: number | string | null;
  larvasida_gram?: number | string | null;
  luas_wilayah_fogging_ha?: number | string | null;
  jml_insektisida_fogging_ml?: number | string | null;
};

type Props = {
  data: BarisAktivitas[];
  granularitas: 'mingguan' | 'bulanan';
  labelPeriode: string; // contoh: "Minggu 40–44 · 2026"
  labelWilayah?: string; // contoh: "Semua Wilayah Kerja"
  ambangABJ?: number; // default 95 (%)
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtInt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
const fmtDes = (n: number, d = 1) => n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

function Kartu({
  judul,
  nilai,
  satuan,
  keterangan,
  ikon,
  aksen,
  badge,
}: {
  judul: string;
  nilai: string;
  satuan?: string;
  keterangan: string;
  ikon: string;
  aksen: string;
  badge?: { teks: string; baik: boolean };
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: aksen }} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{judul}</p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: `${aksen}1A` }}
          aria-hidden
        >
          {ikon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[#0F2A38]">{nilai}</span>
        {satuan && <span className="text-sm font-medium text-gray-500">{satuan}</span>}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{keterangan}</p>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              badge.baik ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {badge.teks}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RingkasanKartuVektor({
  data,
  granularitas,
  labelPeriode,
  labelWilayah = 'Semua Wilayah Kerja',
  ambangABJ = 95,
}: Props) {
  const t = data.reduce(
    (a, r) => ({
      rumah: a.rumah + num(r.rumah_diperiksa),
      rumahPos: a.rumahPos + num(r.rumah_positif),
      cont: a.cont + num(r.container_diperiksa),
      contPos: a.contPos + num(r.container_positif),
      larv: a.larv + num(r.larvasida_gram),
      fogHa: a.fogHa + num(r.luas_wilayah_fogging_ha),
      fogMl: a.fogMl + num(r.jml_insektisida_fogging_ml),
    }),
    { rumah: 0, rumahPos: 0, cont: 0, contPos: 0, larv: 0, fogHa: 0, fogMl: 0 },
  );

  // Indeks entomologi standar
  const hi = t.rumah > 0 ? (t.rumahPos / t.rumah) * 100 : 0;
  const ci = t.cont > 0 ? (t.contPos / t.cont) * 100 : 0;
  const bi = t.rumah > 0 ? (t.contPos / t.rumah) * 100 : 0;
  const abj = t.rumah > 0 ? ((t.rumah - t.rumahPos) / t.rumah) * 100 : 0;
  const abjBaik = abj >= ambangABJ;
  const ada = t.rumah > 0;

  return (
    <section className="rounded-xl bg-linear-to-br from-[#0F2A38] to-[#0F4C5C] p-4 shadow-sm lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Ringkasan Surveilans Vektor Aedes</h2>
          <p className="text-xs text-white/70">
            {labelWilayah} · {labelPeriode}
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white">
          {granularitas === 'mingguan' ? 'Mingguan' : 'Bulanan'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kartu
          judul="House Index (HI)"
          nilai={ada ? fmtDes(hi) : '–'}
          satuan={ada ? '%' : undefined}
          keterangan={`${fmtInt(t.rumahPos)} dari ${fmtInt(t.rumah)} rumah positif`}
          ikon="🏠"
          aksen="#B71C1C"
        />
        <Kartu
          judul="Container Index (CI)"
          nilai={ada ? fmtDes(ci) : '–'}
          satuan={ada ? '%' : undefined}
          keterangan={`${fmtInt(t.contPos)} dari ${fmtInt(t.cont)} container positif`}
          ikon="🪣"
          aksen="#EF6C00"
        />
        <Kartu
          judul="Breteau Index (BI)"
          nilai={ada ? fmtDes(bi) : '–'}
          keterangan="Container positif per 100 rumah"
          ikon="🔬"
          aksen="#7C3AED"
        />
        <Kartu
          judul="Angka Bebas Jentik (ABJ)"
          nilai={ada ? fmtDes(abj) : '–'}
          satuan={ada ? '%' : undefined}
          keterangan={`Target ≥ ${ambangABJ}%`}
          ikon="✅"
          aksen="#2F9E44"
          badge={ada ? { teks: abjBaik ? 'Memenuhi' : 'Belum memenuhi', baik: abjBaik } : undefined}
        />
        <Kartu
          judul="Rumah Diperiksa"
          nilai={fmtInt(t.rumah)}
          keterangan={`${fmtInt(t.rumahPos)} rumah positif jentik`}
          ikon="📋"
          aksen="#0F4C5C"
        />
        <Kartu
          judul="Container Diperiksa"
          nilai={fmtInt(t.cont)}
          keterangan={`${fmtInt(t.contPos)} container positif jentik`}
          ikon="🧪"
          aksen="#2563EB"
        />
        {granularitas === 'bulanan' && (
          <>
            <Kartu
              judul="Larvasida"
              nilai={fmtInt(t.larv)}
              satuan="gram"
              keterangan="Total larvasida digunakan"
              ikon="💧"
              aksen="#7C3AED"
            />
            <Kartu
              judul="Fogging"
              nilai={fmtDes(t.fogHa, 2)}
              satuan="Ha"
              keterangan={`${fmtInt(t.fogMl)} ml insektisida`}
              ikon="🌫️"
              aksen="#0D9488"
            />
          </>
        )}
      </div>
    </section>
  );
}