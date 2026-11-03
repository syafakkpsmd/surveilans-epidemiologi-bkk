'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DAFTAR_NEGARA, DAFTAR_PENYAKIT, type RingkasanPenyakitEmerging, type JenisPeriode } from '@/types/global-emerging.types';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const PALET_PENYAKIT = [
  '#0F4C5C', '#D62839', '#2F9E44', '#F0A202', '#7C3AED', '#EA580C', '#5B7083',
  '#0891B2', '#B71C1C', '#6D28D9', '#059669', '#D97706', '#9333EA', '#DC2626',
];

interface GlobalEmergingNegaraChartProps {
  data: RingkasanPenyakitEmerging[]; // SUDAH difilter negaraChart (server-side), belum difilter rentang periode
  jenis: JenisPeriode;
  negaraAktif: string;
  mgAwal: number;
  mgAkhir: number;
  bulanAwal: number;
  bulanAkhir: number;
}

export default function GlobalEmergingNegaraChart({
  data,
  jenis,
  negaraAktif,
  mgAwal,
  mgAkhir,
  bulanAwal,
  bulanAkhir,
}: GlobalEmergingNegaraChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function ubahNegaraChart(negara: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('negaraChart', negara);
    router.push(`${pathname}?${params.toString()}`);
  }

  const batasAwal = jenis === 'mingguan' ? mgAwal : bulanAwal;
  const batasAkhir = jenis === 'mingguan' ? mgAkhir : bulanAkhir;

  const dataTerfilter = data.filter((r) => {
    const urutan = jenis === 'mingguan' ? (r.minggu_epid ?? 0) : (r.bulan ?? 0);
    return urutan >= batasAwal && urutan <= batasAkhir;
  });

  const labelPeriode = (row: RingkasanPenyakitEmerging) =>
    jenis === 'mingguan' ? `M${row.minggu_epid}` : NAMA_BULAN[(row.bulan ?? 1) - 1] ?? `Bln ${row.bulan}`;

  const petaPeriode = new Map<string, Record<string, string | number>>();
  const penyakitAda = new Set<string>();

  dataTerfilter.forEach((row) => {
    const key = labelPeriode(row);
    const existing = petaPeriode.get(key) ?? { periode: key };
    existing[row.penyakit] = ((existing[row.penyakit] as number) ?? 0) + row.total_kasus;
    petaPeriode.set(key, existing);
    penyakitAda.add(row.penyakit);
  });

  const dataGrafik = Array.from(petaPeriode.values());
  const daftarPenyakitAda = DAFTAR_PENYAKIT.filter((p) => penyakitAda.has(p));

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-sm">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div /> {/* spacer kiri, biar kolom tengah beneran center */}
        <h3 className="text-sm text-center font-semibold text-[#0F2A38]">
          Tren Kasus {jenis === 'mingguan' ? 'Mingguan' : 'Bulanan'} per Penyakit pada Satu Negara
        </h3>
        <div className="flex justify-end">
          <select
            value={negaraAktif}
            onChange={(e) => ubahNegaraChart(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            {DAFTAR_NEGARA.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {dataGrafik.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
          Belum ada data untuk {negaraAktif} pada rentang ini.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={dataGrafik} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
            <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {daftarPenyakitAda.map((p, i) =>
              jenis === 'bulanan' ? (
                <Bar key={p} dataKey={p} name={p} fill={PALET_PENYAKIT[i % PALET_PENYAKIT.length]} />
              ) : (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  name={p}
                  stroke={PALET_PENYAKIT[i % PALET_PENYAKIT.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}