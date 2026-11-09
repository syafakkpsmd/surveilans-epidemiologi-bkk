// components/vektor/BatangKelompokBerangka.tsx  (FILE BARU)
// Grafik batang berkelompok murni SVG (tanpa pustaka) dengan angka di atas setiap batang, termasuk nilai 0.
// Data: [{ name: 'Januari', w0: 9, w1: 0, ... }]; seriesList: [{ key: 'w0', label: 'Samarinda', warna: '#2563EB' }].

type Seri = { key: string; label: string; warna: string };
type Props = { data: Record<string, any>[]; seriesList: Seri[]; tinggi?: number };

function langkahSumbu(maks: number): { langkah: number; atas: number } {
  if (maks <= 0) return { langkah: 1, atas: 4 };
  const kasar = maks / 4;
  const pangkat = Math.pow(10, Math.floor(Math.log10(kasar)));
  const f = kasar / pangkat;
  const langkah = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pangkat;
  return { langkah, atas: Math.ceil(maks / langkah) * langkah };
}

const teksAngka = (v: number) => String(Math.round(v * 100) / 100);

export default function BatangKelompokBerangka({ data, seriesList, tinggi = 360 }: Props) {
  const W = 1000, H = tinggi;
  const kiri = 34, kanan = 8, atasM = 22, bawahM = 30;
  const plotW = W - kiri - kanan, plotH = H - atasM - bawahM;
  const maks = Math.max(0, ...data.flatMap((d) => seriesList.map((s) => Number(d[s.key]) || 0)));
  const { langkah, atas } = langkahSumbu(maks);
  const jumlahGaris = Math.round(atas / langkah);
  const y = (v: number) => atasM + plotH - (v / atas) * plotH;
  const lebarGrup = data.length ? plotW / data.length : plotW;
  const dalam = lebarGrup * 0.82;
  const lebarBatang = Math.min(24, dalam / Math.max(1, seriesList.length));
  const font = lebarBatang < 11 ? 8 : lebarBatang < 16 ? 9 : 11;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik batang berkelompok">
        {Array.from({ length: jumlahGaris + 1 }, (_, i) => {
          const v = i * langkah;
          return (
            <g key={i}>
              <line x1={kiri} x2={W - kanan} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeWidth={1} />
              <text x={kiri - 6} y={y(v) + 3} textAnchor="end" fontSize={11} fill="#6B7280">{teksAngka(v)}</text>
            </g>
          );
        })}
        {data.map((d, gi) => {
          const x0 = kiri + gi * lebarGrup + (lebarGrup - lebarBatang * seriesList.length) / 2;
          return (
            <g key={gi}>
              {seriesList.map((s, si) => {
                const v = Number(d[s.key]) || 0;
                const x = x0 + si * lebarBatang;
                const tinggiBatang = plotH - (y(v) - atasM);
                return (
                  <g key={s.key}>
                    <title>{`${d.name} — ${s.label}: ${teksAngka(v)}`}</title>
                    <rect x={x} y={y(v)} width={Math.max(1, lebarBatang - 1)} height={Math.max(0, tinggiBatang)} fill={s.warna} rx={1.5} />
                    <text x={x + (lebarBatang - 1) / 2} y={y(v) - 3} textAnchor="middle" fontSize={font} fontWeight={600} fill={s.warna}>{teksAngka(v)}</text>
                  </g>
                );
              })}
              <text x={kiri + gi * lebarGrup + lebarGrup / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="#374151">{d.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-gray-600">
        {seriesList.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-sm" style={{ background: s.warna }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}