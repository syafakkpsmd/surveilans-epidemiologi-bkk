'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KpiCard from '@/components/vektor/KpiCard';
import TrenChartLine from '@/components/vektor/TrenChartLine';
import { DonutChart } from '@/components/klinik/DonutChart';
import PengaturPeriodePosko from './PengaturPeriodePosko';
import {
  LABEL_POSKO,
  WILAYAH_POSKO,
  type DataPosko,
  type WilayahPosko,
} from '@/lib/posko/konstanta';
import {
  donutKelompok,
  jumlahkanHarian,
  ringkasPenyakit,
  ringkasPtm,
  saringHarian,
  saringPenyakit,
  saringPtm,
  tanggalPanjang,
  trenHarian,
  type FilterPosko,
} from '@/lib/posko/hitung';

const WARNA_WILAYAH: Record<WilayahPosko, string> = {
  Samarinda: '#0F4C5C',
  'APT Pranoto': '#EA580C',
  Lhoktuan: '#2563EB',
};
const kunciWilayah = (w: WilayahPosko) => w.toLowerCase().replace(/\s+/g, '_');

const fmt = (n: number) => n.toLocaleString('id-ID');

function KartuGrafik({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
      <h3 className="mb-3 text-center text-sm font-bold text-gray-800">{judul}</h3>
      {children}
    </div>
  );
}

function Kosong({ pesan = 'Belum ada data untuk rentang ini.' }: { pesan?: string }) {
  return <p className="py-10 text-center text-sm text-gray-400">{pesan}</p>;
}

export default function PoskoDashboardClient({
  slug,
  data,
  bolehKelola = false,
}: {
  slug: string;
  data: DataPosko;
  bolehKelola?: boolean;
}) {
  const router = useRouter();
  const { periode, tanggalAkhirTampil, daftarPeriode } = data;
  const judulPosko = LABEL_POSKO[data.posko];

  const [aturPeriode, setAturPeriode] = useState(!periode && bolehKelola);
  const [wilayah, setWilayah] = useState<WilayahPosko | ''>('');
  const [dari, setDari] = useState(periode?.tanggalMulai ?? '');
  const [sampai, setSampai] = useState(tanggalAkhirTampil ?? '');

  const filter = useMemo<FilterPosko>(() => {
    const [d, s] = dari && sampai && dari > sampai ? [sampai, dari] : [dari, sampai];
    return { wilayah: wilayah || null, dari: d || undefined, sampai: s || undefined };
  }, [wilayah, dari, sampai]);

  const harian = useMemo(() => saringHarian(data.harian, filter), [data.harian, filter]);
  const penyakit = useMemo(() => saringPenyakit(data.penyakit, filter), [data.penyakit, filter]);
  const ptm = useMemo(() => saringPtm(data.ptm, filter), [data.ptm, filter]);

  const total = useMemo(() => jumlahkanHarian(harian), [harian]);
  const rPenyakit = useMemo(() => ringkasPenyakit(penyakit), [penyakit]);
  const rPtm = useMemo(() => ringkasPtm(ptm), [ptm]);

  const wilayahTampil = WILAYAH_POSKO.filter((w) => !wilayah || w === wilayah);

  // ---- data grafik ----
  const trenPoliklinik = useMemo(
    () =>
      trenHarian(harian, (rows) =>
        Object.fromEntries(
          WILAYAH_POSKO.map((w) => [kunciWilayah(w), rows.filter((r) => r.wilayah === w).reduce((a, r) => a + r.poliklinik, 0)])
        )
      ),
    [harian]
  );
  const trenAlatAngkut = useMemo(
    () =>
      trenHarian(harian, (rows) => {
        const t = jumlahkanHarian(rows);
        return {
          kapal_datang: t.kapalDatang, kapal_berangkat: t.kapalBerangkat,
          pesawat_datang: t.pesawatDatang, pesawat_berangkat: t.pesawatBerangkat,
        };
      }),
    [harian]
  );
  const trenOrang = useMemo(
    () =>
      trenHarian(harian, (rows) => {
        const t = jumlahkanHarian(rows);
        return { datang: t.orangDatang, berangkat: t.orangBerangkat };
      }),
    [harian]
  );
  const trenKlb = useMemo(() => trenHarian(harian, (rows) => ({ klb: jumlahkanHarian(rows).jumlahKlb })), [harian]);
  const trenPenyakit = useMemo(
    () =>
      trenHarian(penyakit, (rows) => {
        const r = ringkasPenyakit(rows).total;
        return { kasus: r.kasusTotal, meninggal: r.matiTotal };
      }),
    [penyakit]
  );

  // ---- tabel rincian harian ----
  const rincianHarian = useMemo(() => {
    const perTanggal = new Map<string, typeof harian>();
    harian.forEach((r) => perTanggal.set(r.tanggal, [...(perTanggal.get(r.tanggal) ?? []), r]));
    return Array.from(perTanggal.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([tanggal, rows]) => ({ tanggal, ...jumlahkanHarian(rows) }));
  }, [harian]);

  const donut = (judul: string, d: { kategori: string; jumlah: number }[]) => {
    const terisi = d.filter((x) => x.jumlah > 0);
    return terisi.length === 0 ? (
      <KartuGrafik judul={judul}>
        <Kosong />
      </KartuGrafik>
    ) : (
      <DonutChart judul={judul} data={terisi} />
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* HEADER & FILTER */}
      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F2A38]">
              {judulPosko}
              {periode ? ` ${periode.tahun}` : ''}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {periode
                ? `${periode.nama || judulPosko} · ${tanggalPanjang(periode.tanggalMulai)} – ${tanggalPanjang(periode.tanggalSelesai)} · BKK Kelas I Samarinda (Samarinda, APT Pranoto, Lhoktuan)`
                : 'Periode posko belum diatur'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {daftarPeriode.length > 1 && periode && (
              <select
                value={periode.tahun}
                onChange={(e) => router.push(`/dashboard/posko/${slug}?tahun=${e.target.value}`)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700"
                aria-label="Pilih periode posko"
              >
                {daftarPeriode.map((d) => (
                  <option key={d.tahun} value={d.tahun}>{d.nama || `${judulPosko} ${d.tahun}`}</option>
                ))}
              </select>
            )}
            {bolehKelola && (
              <button
                type="button"
                onClick={() => setAturPeriode((v) => !v)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                {aturPeriode ? 'Tutup Pengaturan' : periode ? 'Atur Periode' : 'Atur Periode Posko'}
              </button>
            )}
            {bolehKelola && periode && (
              <Link
                href={`/dashboard/posko/${slug}/input?tahun=${periode.tahun}`}
                className="rounded-md bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0c3e4b]"
              >
                Input Data Harian
              </Link>
            )}
            {periode && (
              <Link
                href={`/dashboard/posko/${slug}/infografis?tahun=${periode.tahun}`}
                className="rounded-md border border-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] transition-colors hover:bg-gray-50"
              >
                Info Grafis Harian
              </Link>
            )}
          </div>
        </div>

        {periode && tanggalAkhirTampil && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              value={wilayah}
              onChange={(e) => setWilayah(e.target.value as WilayahPosko | '')}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-gray-700"
              aria-label="Wilayah kerja"
            >
              <option value="">Semua Wilayah Kerja</option>
              {WILAYAH_POSKO.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-gray-600">
              Dari
              <input
                type="date"
                value={dari}
                min={periode.tanggalMulai}
                max={tanggalAkhirTampil}
                onChange={(e) => setDari(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700"
              />
            </label>
            <label className="flex items-center gap-1.5 text-gray-600">
              s/d
              <input
                type="date"
                value={sampai}
                min={periode.tanggalMulai}
                max={tanggalAkhirTampil}
                onChange={(e) => setSampai(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setWilayah('');
                setDari(periode.tanggalMulai);
                setSampai(tanggalAkhirTampil);
              }}
              className="font-semibold text-[#0F4C5C] hover:underline"
            >
              Atur ulang
            </button>
          </div>
        )}
      </div>

      {bolehKelola && aturPeriode && <PengaturPeriodePosko posko={data.posko} periode={periode} />}

      {data.catatan.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {data.catatan.map((c) => (
            <p key={c}>{c}</p>
          ))}
        </div>
      )}

      {!periode || !tanggalAkhirTampil ? null : (
        <>
          {/* KARTU RINGKAS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Kunjungan Poliklinik" value={fmt(total.poliklinik)} keterangan="Semua pasien poliklinik" />
            <KpiCard
              label="Alat Angkut Datang"
              value={fmt(total.alatAngkutDatang)}
              keterangan={`Kapal ${fmt(total.kapalDatang)} · Pesawat ${fmt(total.pesawatDatang)}`}
            />
            <KpiCard
              label="Alat Angkut Berangkat"
              value={fmt(total.alatAngkutBerangkat)}
              keterangan={`Kapal ${fmt(total.kapalBerangkat)} · Pesawat ${fmt(total.pesawatBerangkat)}`}
            />
            <KpiCard label="Total Alat Angkut" value={fmt(total.alatAngkutTotal)} keterangan="Datang + Berangkat" />
            <KpiCard
              label="Kejadian KLB"
              value={fmt(total.jumlahKlb)}
              warna={total.jumlahKlb > 0 ? 'bahaya' : 'default'}
              keterangan="Jumlah kejadian KLB"
            />
            <KpiCard
              label="Orang Datang"
              value={fmt(total.orangDatang)}
              keterangan="ABK + Penumpang Kapal + Crew + Penumpang Pesawat"
            />
            <KpiCard
              label="Orang Berangkat"
              value={fmt(total.orangBerangkat)}
              keterangan="ABK + Penumpang Kapal + Crew + Penumpang Pesawat"
            />
            <KpiCard label="Kasus Penyakit Potensial KLB" value={fmt(rPenyakit.total.kasusTotal)} keterangan="25 jenis penyakit" />
            <KpiCard
              label="Kematian Penyakit Potensial KLB"
              value={fmt(rPenyakit.total.matiTotal)}
              warna={rPenyakit.total.matiTotal > 0 ? 'bahaya' : 'default'}
            />
            <KpiCard label="Kasus Penyakit Tidak Menular" value={fmt(rPtm.total)} keterangan="7 jenis PTM" />
          </div>

          {/* GRAFIK HARIAN */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KartuGrafik judul="Kunjungan Poliklinik Harian">
              {trenPoliklinik.length === 0 ? (
                <Kosong />
              ) : (
                <TrenChartLine
                  data={trenPoliklinik}
                  tipeChart="line"
                  seriesList={wilayahTampil.map((w) => ({ key: kunciWilayah(w), label: w, warna: WARNA_WILAYAH[w] }))}
                />
              )}
            </KartuGrafik>

            <KartuGrafik judul="Alat Angkut Harian (Kapal Penumpang & Pesawat)">
              {trenAlatAngkut.length === 0 ? (
                <Kosong />
              ) : (
                <TrenChartLine
                  data={trenAlatAngkut}
                  tipeChart="line"
                  seriesList={[
                    { key: 'kapal_datang', label: 'Kapal Datang', warna: '#0F4C5C' },
                    { key: 'kapal_berangkat', label: 'Kapal Berangkat', warna: '#2563EB' },
                    { key: 'pesawat_datang', label: 'Pesawat Datang', warna: '#EA580C' },
                    { key: 'pesawat_berangkat', label: 'Pesawat Berangkat', warna: '#7C3AED' },
                  ]}
                />
              )}
            </KartuGrafik>

            <KartuGrafik judul="Orang Datang & Berangkat Harian">
              {trenOrang.length === 0 ? (
                <Kosong />
              ) : (
                <TrenChartLine
                  data={trenOrang}
                  tipeChart="line"
                  seriesList={[
                    { key: 'datang', label: 'Orang Datang', warna: '#0F4C5C' },
                    { key: 'berangkat', label: 'Orang Berangkat', warna: '#B71C1C' },
                  ]}
                />
              )}
            </KartuGrafik>

            <KartuGrafik judul="Kasus & Kematian Penyakit Potensial KLB Harian">
              {trenPenyakit.length === 0 ? (
                <Kosong pesan="Belum ada data penyakit potensial KLB yang diinput." />
              ) : (
                <TrenChartLine
                  data={trenPenyakit}
                  tipeChart="line"
                  seriesList={[
                    { key: 'kasus', label: 'Kasus', warna: '#EA580C' },
                    { key: 'meninggal', label: 'Meninggal', warna: '#B71C1C' },
                  ]}
                />
              )}
            </KartuGrafik>

            <KartuGrafik judul="Jumlah Kejadian KLB Harian">
              {trenKlb.length === 0 || total.jumlahKlb === 0 ? (
                <Kosong pesan="Tidak ada kejadian KLB pada rentang ini." />
              ) : (
                <TrenChartLine
                  data={trenKlb}
                  tipeChart="bar"
                  tampilkanNilai
                  seriesList={[{ key: 'klb', label: 'Kejadian KLB', warna: '#B71C1C' }]}
                />
              )}
            </KartuGrafik>
          </div>

          {/* DONUT */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {donut('Kasus Penyakit Potensial KLB: Jenis Kelamin & Umur', donutKelompok(rPenyakit.total, 'kasus'))}
            {donut('Kematian Penyakit Potensial KLB: Jenis Kelamin & Umur', donutKelompok(rPenyakit.total, 'mati'))}
            {donut(
              'Kasus Penyakit Tidak Menular per Jenis',
              rPtm.perJenis.map((p) => ({ kategori: p.jenis, jumlah: p.jumlah }))
            )}
            {donut('Kasus Penyakit Tidak Menular: Jenis Kelamin', [
              { kategori: 'Laki-laki', jumlah: rPtm.totalLk },
              { kategori: 'Perempuan', jumlah: rPtm.totalPr },
              { kategori: 'Tanpa rincian', jumlah: rPtm.tanpaRincian },
            ])}
          </div>

          {/* TABEL PENYAKIT POTENSIAL KLB */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Penyakit Potensial KLB (akumulasi rentang terpilih)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th rowSpan={2} className="px-2 py-2 text-left">No</th>
                    <th rowSpan={2} className="px-2 py-2 text-left">Jenis Penyakit</th>
                    <th colSpan={5} className="border-l border-gray-200 px-2 py-1 text-center">Kasus</th>
                    <th colSpan={5} className="border-l border-gray-200 px-2 py-1 text-center">Meninggal</th>
                  </tr>
                  <tr className="bg-gray-50 text-gray-600">
                    {['L <5', 'L ≥5', 'P <5', 'P ≥5', 'Total', 'L <5', 'L ≥5', 'P <5', 'P ≥5', 'Total'].map((h, i) => (
                      <th key={`${h}-${i}`} className={`px-2 py-1 text-right ${i === 0 || i === 5 ? 'border-l border-gray-200' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rPenyakit.perJenis.map((r, i) => (
                    <tr key={r.jenis} className={`border-t border-gray-100 ${r.kasusTotal > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{r.jenis}</td>
                      <td className="border-l border-gray-100 px-2 py-1.5 text-right">{fmt(r.kasusLkLt5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.kasusLkGe5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.kasusPrLt5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.kasusPrGe5)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{fmt(r.kasusTotal)}</td>
                      <td className="border-l border-gray-100 px-2 py-1.5 text-right">{fmt(r.matiLkLt5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.matiLkGe5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.matiPrLt5)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.matiPrGe5)}</td>
                      <td className={`px-2 py-1.5 text-right font-semibold ${r.matiTotal > 0 ? 'text-[#B71C1C]' : ''}`}>{fmt(r.matiTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-gray-900">
                    <td className="px-2 py-2" colSpan={2}>TOTAL</td>
                    <td className="border-l border-gray-200 px-2 py-2 text-right">{fmt(rPenyakit.total.kasusLkLt5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.kasusLkGe5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.kasusPrLt5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.kasusPrGe5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.kasusTotal)}</td>
                    <td className="border-l border-gray-200 px-2 py-2 text-right">{fmt(rPenyakit.total.matiLkLt5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.matiLkGe5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.matiPrLt5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.matiPrGe5)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPenyakit.total.matiTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">L = laki-laki, P = perempuan; &lt;5 = kurang dari 5 tahun, ≥5 = 5 tahun ke atas.</p>
          </div>

          {/* TABEL PTM */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Penyakit Tidak Menular (akumulasi rentang terpilih)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-2 py-2 text-left">Jenis PTM</th>
                    {wilayahTampil.map((w) => (
                      <th key={w} className="px-2 py-2 text-right">{w}</th>
                    ))}
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-right">Laki-laki</th>
                    <th className="px-2 py-2 text-right">Perempuan</th>
                  </tr>
                </thead>
                <tbody>
                  {rPtm.perJenis.map((p) => (
                    <tr key={p.jenis} className="border-t border-gray-100 text-gray-700">
                      <td className="px-2 py-1.5">{p.jenis}</td>
                      {wilayahTampil.map((w) => (
                        <td key={w} className="px-2 py-1.5 text-right">
                          {fmt(ptm.filter((x) => x.jenis === p.jenis && x.wilayah === w).reduce((a, x) => a + x.jumlah, 0))}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right font-semibold">{fmt(p.jumlah)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(p.lk)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(p.pr)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-gray-900">
                    <td className="px-2 py-2">TOTAL</td>
                    {wilayahTampil.map((w) => (
                      <td key={w} className="px-2 py-2 text-right">
                        {fmt(ptm.filter((x) => x.wilayah === w).reduce((a, x) => a + x.jumlah, 0))}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">{fmt(rPtm.total)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPtm.totalLk)}</td>
                    <td className="px-2 py-2 text-right">{fmt(rPtm.totalPr)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* RINCIAN HARIAN */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              Rincian Harian {wilayah ? `· ${wilayah}` : '· Semua Wilayah Kerja'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-2 py-2 text-left">Tanggal</th>
                    <th className="px-2 py-2 text-right">Poliklinik</th>
                    <th className="px-2 py-2 text-right">Kapal Datang</th>
                    <th className="px-2 py-2 text-right">Kapal Berangkat</th>
                    <th className="px-2 py-2 text-right">Pesawat Datang</th>
                    <th className="px-2 py-2 text-right">Pesawat Berangkat</th>
                    <th className="px-2 py-2 text-right">Orang Datang</th>
                    <th className="px-2 py-2 text-right">Orang Berangkat</th>
                    <th className="px-2 py-2 text-right">KLB</th>
                  </tr>
                </thead>
                <tbody>
                  {rincianHarian.length === 0 ? (
                    <tr>
                      <td colSpan={9}><Kosong /></td>
                    </tr>
                  ) : (
                    rincianHarian.map((h) => (
                      <tr key={h.tanggal} className="border-t border-gray-100 text-gray-700">
                        <td className="px-2 py-1.5">{tanggalPanjang(h.tanggal)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.poliklinik)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.kapalDatang)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.kapalBerangkat)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.pesawatDatang)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.pesawatBerangkat)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.orangDatang)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(h.orangBerangkat)}</td>
                        <td className={`px-2 py-1.5 text-right ${h.jumlahKlb > 0 ? 'font-semibold text-[#B71C1C]' : ''}`}>{fmt(h.jumlahKlb)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
