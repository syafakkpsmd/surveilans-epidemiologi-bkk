'use client';

/**
 * components/ketepatan-laporan/KetepatanLaporanClient.tsx
 * Dashboard Ketepatan dan Kelengkapan Laporan Surveilans.
 *
 * Unit pelaporan = satu kegiatan di satu wilayah kerja. Kegiatan masuk laporan MINGGUAN, BULANAN, atau SIKLUS
 * (target per tahun, mis. 6 kegiatan/tahun tiap 40 hari kerja) sesuai pengaturan admin
 * (/dashboard/pengaturan-pemantauan-laporan). Semua perhitungan dilakukan di klien dari data mentah, sehingga filter
 * Tahun / Wilayah / Jenis wilayah / Kegiatan langsung memperbarui kartu, rekap, dan matriks.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Settings } from 'lucide-react';
import {
  JUMLAH_PERIODE,
  STANDAR,
  agregatkan,
  evaluasiDenganJadwal,
  evaluasiMatriks,
  indeksLaporan,
} from '@/lib/ketepatan-laporan/evaluasi';
import type { HasilEvaluasi, JenisLaporan, LaporanMasuk, UnitFaskes } from '@/lib/ketepatan-laporan/types';
import { formatWaktuWita } from '@/lib/ketepatan-laporan/waktu';
import { buatJadwalSiklus } from '@/lib/pemantauan-laporan/periode';
import type { KegiatanTampil } from '@/lib/pemantauan-laporan/server';
import KartuRingkasan from './KartuRingkasan';
import MatriksKepatuhan from './MatriksKepatuhan';
import RekapKegiatan, { type InfoRekap } from './RekapKegiatan';
import { INFO_STATUS } from './gaya';

interface Props {
  nowIso: string;
  tahunBerjalan: number;
  units: UnitFaskes[];
  laporan: LaporanMasuk[];
  kegiatan: KegiatanTampil[];
  gagal: string[];
  wilayahTakDikenal: { kegiatan: string; nama: string }[];
  tabelPengaturanAda: boolean;
  adalahAdmin: boolean;
}

const NAMA_TAB: Record<JenisLaporan, string> = {
  MINGGUAN: 'Laporan Mingguan (W1-W52)',
  BULANAN: 'Laporan Bulanan (Jan-Des)',
  SIKLUS: 'Kegiatan Bertarget (Siklus)',
};
const URUT_TAB: JenisLaporan[] = ['MINGGUAN', 'BULANAN', 'SIKLUS'];

const kelasSelect =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/30';

function teksTarget(k: KegiatanTampil): string {
  if (k.periode === 'MINGGUAN') return 'Setiap minggu';
  if (k.periode === 'BULANAN') return 'Setiap bulan';
  return `${k.targetPerTahun ?? '-'} kali/tahun (tiap ${k.intervalHari ?? '-'} ${k.hariKerja ? 'hari kerja' : 'hari'})`;
}

function kelompokkan<T>(daftar: readonly T[], kunci: (x: T) => string): Map<string, T[]> {
  const peta = new Map<string, T[]>();
  for (const x of daftar) {
    const k = kunci(x);
    if (!peta.has(k)) peta.set(k, []);
    peta.get(k)!.push(x);
  }
  return peta;
}

export default function KetepatanLaporanClient({
  nowIso,
  tahunBerjalan,
  units,
  laporan,
  kegiatan,
  gagal,
  wilayahTakDikenal,
  tabelPengaturanAda,
  adalahAdmin,
}: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [tahun, setTahun] = useState(tahunBerjalan);
  const [wilayah, setWilayah] = useState('SEMUA');
  const [jenisWilayah, setJenisWilayah] = useState('SEMUA');
  const [kegiatanDipilih, setKegiatanDipilih] = useState('SEMUA');

  const indeks = useMemo(() => indeksLaporan(laporan), [laporan]);
  const kegiatanPerKunci = useMemo(() => new Map(kegiatan.map((k) => [k.kunci, k])), [kegiatan]);

  const tabAda = useMemo(() => URUT_TAB.filter((j) => units.some((u) => u.periode === j)), [units]);
  const [tabPilihan, setTab] = useState<JenisLaporan | null>(null);
  const tab: JenisLaporan | null = tabPilihan && tabAda.includes(tabPilihan) ? tabPilihan : (tabAda[0] ?? null);

  const daftarTahun = useMemo(() => {
    const set = new Set<number>([tahunBerjalan, ...laporan.map((l) => l.tahun)]);
    return [...set].sort((a, b) => b - a);
  }, [laporan, tahunBerjalan]);
  const daftarWilayah = useMemo(() => [...new Set(units.map((u) => u.wilayah))].sort(), [units]);
  const daftarJenis = useMemo(() => [...new Set(units.map((u) => u.jenis))], [units]);

  const unitTerfilter = useMemo(
    () =>
      units.filter(
        (u) =>
          (wilayah === 'SEMUA' || u.wilayah === wilayah) &&
          (jenisWilayah === 'SEMUA' || u.jenis === jenisWilayah) &&
          (kegiatanDipilih === 'SEMUA' || u.kegiatanKunci === kegiatanDipilih),
      ),
    [units, wilayah, jenisWilayah, kegiatanDipilih],
  );

  const mingguan = useMemo(
    () => evaluasiMatriks(unitTerfilter.filter((u) => u.periode === 'MINGGUAN'), 'MINGGUAN', tahun, indeks, now),
    [unitTerfilter, tahun, indeks, now],
  );
  const bulanan = useMemo(
    () => evaluasiMatriks(unitTerfilter.filter((u) => u.periode === 'BULANAN'), 'BULANAN', tahun, indeks, now),
    [unitTerfilter, tahun, indeks, now],
  );

  /** SIKLUS: jadwal berbeda per kegiatan, jadi dievaluasi per kegiatan lalu digabung untuk kartu. */
  const siklus = useMemo(() => {
    const perKegiatan = kelompokkan(unitTerfilter.filter((u) => u.periode === 'SIKLUS'), (u) => u.kegiatanKunci ?? '');
    const grup: { kunci: string; hasil: HasilEvaluasi }[] = [];
    for (const [kunci, daftar] of perKegiatan) {
      const k = kegiatanPerKunci.get(kunci);
      if (!k) continue;
      grup.push({ kunci, hasil: evaluasiDenganJadwal(daftar, 'SIKLUS', tahun, buatJadwalSiklus(tahun, k), indeks, now) });
    }
    const semuaBaris = grup.flatMap((g) => g.hasil.baris);
    return {
      grup,
      agregat: agregatkan(semuaBaris),
      jatuhTempo: Math.max(0, ...grup.map((g) => g.hasil.periodeJatuhTempo)),
      total: Math.max(0, ...grup.map((g) => g.hasil.jadwal.length)),
    };
  }, [unitTerfilter, kegiatanPerKunci, tahun, indeks, now]);

  const rekap: InfoRekap[] = useMemo(() => {
    const baris =
      tab === 'MINGGUAN' ? mingguan.baris : tab === 'BULANAN' ? bulanan.baris : siklus.grup.flatMap((g) => g.hasil.baris);
    const grup = kelompokkan(baris, (b) => b.unit.kegiatanKunci ?? '');
    return [...grup.entries()].flatMap(([kunci, b]) => {
      const k = kegiatanPerKunci.get(kunci);
      if (!k) return [];
      return [
        {
          kunci,
          label: k.label,
          kelompok: k.kelompok,
          target: teksTarget(k),
          agregat: agregatkan(b),
          baris: b,
        },
      ];
    });
  }, [tab, mingguan, bulanan, siklus, kegiatanPerKunci]);

  const ringkasFilter = [
    `Tahun ${tahun}`,
    wilayah === 'SEMUA' ? 'Semua wilayah' : `Wilayah ${wilayah}`,
    jenisWilayah === 'SEMUA' ? 'Semua jenis' : jenisWilayah,
    kegiatanDipilih === 'SEMUA' ? 'Semua kegiatan' : (kegiatanPerKunci.get(kegiatanDipilih)?.label ?? kegiatanDipilih),
  ].join(' · ');

  const jumlahKartu = tabAda.length;

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50 p-4 text-slate-800 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      {/* Judul */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-600 p-2.5 text-white dark:bg-teal-500">
            <ClipboardList className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ketepatan dan Kelengkapan Laporan Surveilans</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {ringkasFilter} · data per {formatWaktuWita(now)}
            </p>
          </div>
        </div>
        {adalahAdmin && (
          <Link
            href="/dashboard/pengaturan-pemantauan-laporan"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Atur modul &amp; target
          </Link>
        )}
      </header>

      {/* Peringatan */}
      {!tabelPengaturanAda && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Pengaturan pemantauan belum tersimpan di database (jalankan scripts/migrate/26_kegiatan_laporan.sql). Dashboard memakai pengaturan bawaan.
        </p>
      )}
      {gagal.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Data kegiatan ini gagal dibaca dan <strong>tidak ditampilkan</strong> (bukan berarti belum melapor): {gagal.join(', ')}.
          </span>
        </p>
      )}
      {wilayahTakDikenal.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Ada teks wilayah di data yang tidak dikenal, sehingga datanya tidak terhitung. Tambahkan sebagai alias di Pengaturan Wilker:{' '}
            {wilayahTakDikenal
              .slice(0, 8)
              .map((x) => `"${x.nama}" (${x.kegiatan})`)
              .join(', ')}
            {wilayahTakDikenal.length > 8 ? `, dan ${wilayahTakDikenal.length - 8} lainnya` : ''}.
          </span>
        </p>
      )}

      {tab === null ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Belum ada kegiatan yang dipantau.{' '}
          {adalahAdmin ? 'Pilih modul yang dipantau di halaman pengaturan.' : 'Hubungi admin untuk mengatur modul yang dipantau.'}
        </div>
      ) : (
        <>
          {/* Kartu ringkasan eksekutif */}
          <section
            aria-label="Ringkasan evaluasi kinerja"
            className={`grid gap-4 ${jumlahKartu >= 3 ? 'lg:grid-cols-3' : jumlahKartu === 2 ? 'lg:grid-cols-2' : ''}`}
          >
            {tabAda.includes('MINGGUAN') && (
              <KartuRingkasan
                judul="Laporan Mingguan (YTD)"
                ringkasan={mingguan.agregat}
                periodeJatuhTempo={mingguan.periodeJatuhTempo}
                periodeTotal={JUMLAH_PERIODE.MINGGUAN}
                satuan="minggu"
                aktif={tab === 'MINGGUAN'}
                onPilih={() => setTab('MINGGUAN')}
              />
            )}
            {tabAda.includes('BULANAN') && (
              <KartuRingkasan
                judul="Laporan Bulanan (YTD)"
                ringkasan={bulanan.agregat}
                periodeJatuhTempo={bulanan.periodeJatuhTempo}
                periodeTotal={JUMLAH_PERIODE.BULANAN}
                satuan="bulan"
                aktif={tab === 'BULANAN'}
                onPilih={() => setTab('BULANAN')}
              />
            )}
            {tabAda.includes('SIKLUS') && (
              <KartuRingkasan
                judul="Kegiatan Bertarget (YTD)"
                ringkasan={siklus.agregat}
                periodeJatuhTempo={siklus.jatuhTempo}
                periodeTotal={siklus.total}
                satuan="siklus"
                aktif={tab === 'SIKLUS'}
                onPilih={() => setTab('SIKLUS')}
              />
            )}
          </section>

          {/* Tab + filter */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div role="tablist" aria-label="Jenis laporan" className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
                {tabAda.map((j) => (
                  <button
                    key={j}
                    role="tab"
                    type="button"
                    aria-selected={tab === j}
                    onClick={() => setTab(j)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition sm:px-4 ${
                      tab === j
                        ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {NAMA_TAB[j]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tahun
                  <select className={kelasSelect} value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                    {daftarTahun.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Kegiatan
                  <select className={kelasSelect} value={kegiatanDipilih} onChange={(e) => setKegiatanDipilih(e.target.value)}>
                    <option value="SEMUA">Semua kegiatan</option>
                    {kegiatan
                      .filter((k) => k.periode === tab)
                      .map((k) => (
                        <option key={k.kunci} value={k.kunci}>
                          {k.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Wilayah
                  <select className={kelasSelect} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
                    <option value="SEMUA">Semua wilayah</option>
                    {daftarWilayah.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Jenis wilayah
                  <select className={kelasSelect} value={jenisWilayah} onChange={(e) => setJenisWilayah(e.target.value)}>
                    <option value="SEMUA">Semua jenis</option>
                    {daftarJenis.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Legenda */}
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
              {(Object.keys(INFO_STATUS) as (keyof typeof INFO_STATUS)[]).map((s) => {
                const { Ikon, kelasSel, label } = INFO_STATUS[s];
                return (
                  <li key={s} className="inline-flex items-center gap-1.5">
                    <span className={`flex h-5 w-5 items-center justify-center rounded ${kelasSel}`}>
                      <Ikon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>

            <RekapKegiatan data={rekap} />

            {tab === 'SIKLUS' ? (
              siklus.grup.length === 0 ? (
                <MatriksKepatuhan baris={[]} jadwal={[]} jenis="SIKLUS" periodeBerjalan={null} />
              ) : (
                siklus.grup.map((g) => {
                  const k = kegiatanPerKunci.get(g.kunci);
                  return (
                    <div key={g.kunci} className="space-y-2">
                      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {k?.label} <span className="font-normal text-slate-500 dark:text-slate-400">· {k ? teksTarget(k) : ''}</span>
                      </h2>
                      <MatriksKepatuhan
                        baris={g.hasil.baris}
                        jadwal={g.hasil.jadwal}
                        jenis="SIKLUS"
                        periodeBerjalan={tahun === tahunBerjalan ? g.hasil.periodeBerjalan : null}
                      />
                    </div>
                  );
                })
              )
            ) : (
              <MatriksKepatuhan
                baris={(tab === 'MINGGUAN' ? mingguan : bulanan).baris}
                jadwal={(tab === 'MINGGUAN' ? mingguan : bulanan).jadwal}
                jenis={tab}
                periodeBerjalan={tahun === tahunBerjalan ? (tab === 'MINGGUAN' ? mingguan : bulanan).periodeBerjalan : null}
              />
            )}

            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <strong>Cara menghitung.</strong> Kelengkapan = laporan masuk (tepat waktu + terlambat) ÷ periode yang sudah jatuh tempo;
              Ketepatan = laporan tepat waktu ÷ periode yang sudah jatuh tempo. Periode yang belum jatuh tempo tidak dihitung. Satu
              periode dianggap &quot;masuk&quot; bila ada minimal satu data kegiatan pada periode itu; waktu kirim = waktu input data
              yang paling awal. Standar: Kelengkapan ≥ {STANDAR.kelengkapan.hijau}% (hijau), {STANDAR.kelengkapan.kuning}–
              {STANDAR.kelengkapan.hijau - 1}% (kuning), &lt; {STANDAR.kelengkapan.kuning}% (merah); Ketepatan ≥{' '}
              {STANDAR.ketepatan.hijau}% (hijau). Deadline mingguan: Selasa 17:00 WITA pada minggu berikutnya; bulanan: tanggal 10
              pukul 23:59 WITA pada bulan berikutnya; siklus: akhir siklus ditambah tenggang input yang diatur admin. Kegiatan
              bertarget (siklus) dinilai per siklus: tahun dibagi sejumlah target siklus berurutan, dan siklus terpenuhi bila ada
              kegiatan di dalamnya. Tabel sumber yang tidak mencatat waktu input hanya dinilai Kelengkapannya.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
