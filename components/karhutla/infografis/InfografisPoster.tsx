import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import PetaMiniHotspot from './PetaMiniHotspot';
import { LABEL_STATUS, type StatusEvaluasi } from '@/lib/karhutla/constants';
import type { RingkasanInfografisHarian } from '@/lib/supabase/queries-karhutla-server';

/**
 * Palet "AI dashboard" -- versi CERAH dgn perpaduan gradasi biru-teal-ungu
 * (revisi dari versi sebelumnya yang basisnya nyaris hitam #070f1a).
 * Sengaja HINDARI backdrop-filter/CSS filter (blur dsb) karena html-to-image
 * kadang gagal capture properti itu. Gradient, box-shadow, dan border-radius
 * biasa semuanya aman dipakai (sudah terbukti di header & kartu sebelumnya).
 */
const WARNA = {
  bgDeep: '#123a63',
  bgPanel: '#155e8f',
  bgCardGradA: '#1b4d7e',
  bgCardGradB: '#123a63',
  bgCardSolid: '#1b4d7e',
  border: 'rgba(255,255,255,0.16)',
  borderStrong: 'rgba(255,255,255,0.28)',
  cyan: '#3ee8ff',
  teal: '#2fe7c4',
  navy: '#123a63',
  ink: '#f5fafd',
  muted: '#bcdcef',
  hijau: '#3fe08c',
  kuning: '#ffcb4d',
  merah: '#ff7086',
};

/** Gradasi kartu yang dipakai berulang (KPI, breakdown wilker, tabel, chart). */
const GRADASI_KARTU = `linear-gradient(160deg, ${WARNA.bgCardGradA} 0%, ${WARNA.bgCardGradB} 100%)`;

function formatTanggalPanjang(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTanggalSingkat(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

/** Warna status berdasar tingkat keparahan ISPU/PM2.5 — konsisten dgn token risiko RBA. */
function warnaStatusIspu(status: string | null): string {
  if (!status) return WARNA.muted;
  const t = status.toLowerCase();
  if (t.includes('baik') || t.includes('sedang')) return WARNA.hijau;
  if (t.includes('tidak sehat') && !t.includes('sangat') && !t.includes('berbahaya')) return WARNA.kuning;
  return WARNA.merah;
}

function warnaStatusEvaluasi(status: StatusEvaluasi): string {
  if (status === 'MS') return WARNA.hijau;
  if (status === 'TMS') return WARNA.merah;
  return WARNA.muted;
}

export const LEBAR_POSTER = 1080;

export default function InfografisPoster({ data }: { data: RingkasanInfografisHarian }) {
  const totalIspa = data.totalIspaAnak + data.totalIspaDewasa;
  const wilayahTerdampak = data.perWilker.filter((w) => w.jumlahHotspot > 0 || w.kasusIspaAnak + w.kasusIspaDewasa > 0).length;

  const dataTren = data.tren7Hari.map((t) => ({
    label: formatTanggalSingkat(t.tanggal),
    'Kasus ISPA': t.totalIspa,
    'Titik Panas': t.jumlahHotspot,
  }));

  const dataSkdrWilayah = data.skdrPerWilayah.map((w) => ({
    // ganti underscore jadi spasi supaya "Tanjung_Santan" tampil "Tanjung Santan" dst.
    label: w.wilayah.replace(/_/g, ' '),
    'Minggu Lalu': w.mingguLalu,
    'Minggu Ini': w.mingguIni,
  }));

  return (
    <div
      style={{
        width: LEBAR_POSTER,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        background: `linear-gradient(165deg, ${WARNA.bgDeep} 0%, ${WARNA.bgPanel} 55%, #1a8f9e 100%)`,
        color: WARNA.ink,
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div
        style={{
          background: `linear-gradient(120deg, ${WARNA.navy} 0%, #1a8f9e 100%)`,
          backgroundImage: `radial-gradient(rgba(62,232,255,0.22) 1px, transparent 1px), linear-gradient(120deg, ${WARNA.navy} 0%, #1a8f9e 100%)`,
          backgroundSize: '20px 20px, 100% 100%',
          padding: '30px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          borderBottom: `1px solid ${WARNA.borderStrong}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- sengaja <img> biasa, BUKAN next/image:
            next/image pakai lazy-load & optimizer eksternal yang bikin html-to-image gagal/kosong saat
            capture poster ini jadi JPEG/PDF. */}
        <img
          src="/logo-header-infografis.png"
          alt="Kemenkes RI - BKK Kelas I Samarinda"
          style={{ height: 76, flexShrink: 0, display: 'block', mixBlendMode: 'lighten' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 2, color: WARNA.cyan, textTransform: 'uppercase' }}>
              Info Grafis Harian
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
            Kualitas Udara &amp; ISPA pada masa Karhutla
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#a9c2d1' }}>
            {formatTanggalPanjang(data.tanggalDitampilkan)} &middot; Kalimantan Timur
          </p>
          
          {data.pakaiFallback && (
            <div
              style={{
              background: `linear-gradient(160deg, #050d1a 0%, #0e2a4d 40%, #17678a 82%, #1ba3a0 100%)`,
              backgroundImage: `radial-gradient(rgba(62,232,255,0.22) 1px, transparent 1px), linear-gradient(160deg, #050d1a 0%, #0e2a4d 40%, #17678a 82%, #1ba3a0 100%)`,
              backgroundSize: '20px 20px, 100% 100%',
              padding: '30px 48px',
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              borderBottom: `1px solid ${WARNA.borderStrong}`,
            }}
          >
              Menampilkan data terakhir tersedia ({formatTanggalPanjang(data.tanggalDitampilkan)}) — data tanggal{' '}
              {formatTanggalSingkat(data.tanggalDiminta)} belum masuk
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#7a1620', letterSpacing: -0.5 }}>Ber</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#e0303e', letterSpacing: -0.5, marginLeft: 1 }}>AKHLAK</span>
            <svg
              style={{ position: 'absolute', top: -9, right: -3 }}
              width={15}
              height={13}
              viewBox="0 0 22 20"
            >
              <path d="M0 0 L14 0 L22 10 L14 20 L0 20 L8 10 Z" fill="#e0303e" />
              <path d="M0 0 L14 0 L18 5 L4 5 Z" fill="#f4a3a8" opacity={0.55} />
            </svg>
          </div>
          <p style={{ fontSize: 8, fontWeight: 700, color: '#fdfdfd', margin: '2px 0 0', letterSpacing: 0.2 }}>
            <b style={{ color: '#ff6b6b' }}>B</b>erorientasi Pelayanan{' '}
            <b style={{ color: '#ff6b6b' }}>A</b>kuntabel{' '}
            <b style={{ color: '#ff6b6b' }}>K</b>ompeten
          </p>
          <p style={{ fontSize: 8, fontWeight: 700, color: '#fdfdfd', margin: 0, letterSpacing: 0.2 }}>
            <b style={{ color: '#ff6b6b' }}>H</b>armonis{' '}
            <b style={{ color: '#ff6b6b' }}>L</b>oyal{' '}
            <b style={{ color: '#ff6b6b' }}>A</b>daptif{' '}
            <b style={{ color: '#ff6b6b' }}>K</b>olaboratif
          </p>
        </div>
      </div>

      {/* ---------- KPI RINGKASAN ---------- */}
      <div style={{ display: 'flex', gap: 16, padding: '24px 48px 0' }}>
        <KartuKpi label="Titik Panas" nilai={data.totalHotspot} satuan="titik" warna={data.totalHotspot > 0 ? WARNA.merah : WARNA.hijau} />
        <KartuKpi label="Kasus ISPA" nilai={totalIspa} satuan="kasus" warna={WARNA.cyan} />
        <KartuKpi
          label="PM2.5 Rerata"
          nilai={data.pm25Rerata ?? '—'}
          satuan={data.pm25Rerata != null ? 'µg/m³' : ''}
          warna={warnaStatusIspu(data.statusIspuDominan)}
          keterangan={data.statusIspuDominan ?? 'Belum ada data'}
        />
        <KartuKpi label="Wilayah Terdampak" nilai={`${wilayahTerdampak}/7`} satuan="wilker" warna={WARNA.teal} />
      </div>

      {/* ---------- BREAKDOWN PER WILAYAH KERJA ---------- */}
      <div style={{ padding: '28px 48px 0' }}>
        <JudulSeksi>Rincian per Wilayah Kerja</JudulSeksi>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
          {data.perWilker.map((w) => (
            <div
              key={w.kode_wilker}
              style={{
                border: `1px solid ${WARNA.border}`,
                background: GRADASI_KARTU,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{w.nama}</p>
              <div style={{ display: 'flex', gap: 14, textAlign: 'right' }}>
                <MiniStat label="Titik Panas" nilai={w.jumlahHotspot} warna={w.jumlahHotspot > 0 ? WARNA.merah : WARNA.muted} />
                <MiniStat label="ISPA" nilai={w.kasusIspaAnak + w.kasusIspaDewasa} warna={WARNA.cyan} />
                <MiniStat label="PM2.5" nilai={w.pm25Rerata ?? '—'} warna={warnaStatusIspu(w.statusIspu)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- PETA MINI + TREN 7 HARI ---------- */}
      <div style={{ display: 'flex', gap: 16, padding: '28px 48px 0' }}>
        <div style={{ flex: '0 0 300px' }}>
          <JudulSeksi>Sebaran Titik Panas</JudulSeksi>
          <div style={{ marginTop: 12, height: 460, borderRadius: 16, overflow: 'hidden', border: `1px solid ${WARNA.border}` }}>
            <PetaMiniHotspot hotspots={data.hotspotPoints} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <JudulSeksi>Tren 7 Hari Terakhir</JudulSeksi>
          <div
            style={{
              marginTop: 12,
              height: 340,
              background: GRADASI_KARTU,
              border: `1px solid ${WARNA.border}`,
              borderRadius: 10,
              padding: '12px 12px 0',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataTren} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradIspa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WARNA.cyan} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={WARNA.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradHotspot" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WARNA.merah} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={WARNA.merah} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: WARNA.muted }} />
                <YAxis tick={{ fontSize: 11, fill: WARNA.muted }} />
                <Area type="monotone" dataKey="Kasus ISPA" stroke={WARNA.cyan} strokeWidth={2.5} fill="url(#gradIspa)" dot={{ r: 3, fill: WARNA.cyan }} />
                <Area type="monotone" dataKey="Titik Panas" stroke={WARNA.merah} strokeWidth={2.5} fill="url(#gradHotspot)" dot={{ r: 3, fill: WARNA.merah }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: WARNA.muted }}>
            <LegendaGaris warna={WARNA.cyan} label="Kasus ISPA" />
            <LegendaGaris warna={WARNA.merah} label="Titik Panas" />
          </div>
        </div>
      </div>

      {/* ---------- TABEL KUALITAS UDARA PER WILAYAH KERJA ---------- */}
      <div style={{ padding: '28px 48px 0' }}>
        <JudulSeksi>Kualitas Udara per Wilayah Kerja</JudulSeksi>
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${WARNA.border}`,
            borderRadius: 10,
            overflow: 'hidden',
            background: GRADASI_KARTU,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'rgba(34,211,238,0.08)' }}>
                <ThKualitasUdara align="left">WILKER</ThKualitasUdara>
                <ThKualitasUdara>PM2.5 (µg/m³)</ThKualitasUdara>
                <ThKualitasUdara>PM10 (µg/m³)</ThKualitasUdara>
                <ThKualitasUdara>Suhu (°C)</ThKualitasUdara>
                <ThKualitasUdara>HCHO (mg/m³)</ThKualitasUdara>
                <ThKualitasUdara>TVOC (mg/m³)</ThKualitasUdara>
                <ThKualitasUdara>KELEMBAPAN (%)</ThKualitasUdara>
                <ThKualitasUdara>STATUS</ThKualitasUdara>
              </tr>
            </thead>
            <tbody>
              {data.perWilker.map((w, i) => (
                <tr key={w.kode_wilker} style={{ borderTop: `1px solid ${WARNA.border}`, background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <TdKualitasUdara align="left" bold>
                    {w.nama}
                  </TdKualitasUdara>
                  <TdKualitasUdara>{w.pm25Rerata ?? '—'}</TdKualitasUdara>
                  <TdKualitasUdara>{w.pm10Rerata ?? '—'}</TdKualitasUdara>
                  <TdKualitasUdara>{w.suhuRerata ?? '—'}</TdKualitasUdara>
                  <TdKualitasUdara>{w.hchoRerata ?? '—'}</TdKualitasUdara>
                  <TdKualitasUdara>{w.tvocRerata ?? '—'}</TdKualitasUdara>
                  <TdKualitasUdara>{w.kelembapanRerata ?? '—'}</TdKualitasUdara>
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        color: warnaStatusEvaluasi(w.statusEvaluasi),
                        background: `${warnaStatusEvaluasi(w.statusEvaluasi)}22`,
                      }}
                    >
                      {LABEL_STATUS[w.statusEvaluasi]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- SKDR MINGGUAN PER WILAYAH ---------- */}
      <div style={{ padding: '28px 48px 0' }}>
        <JudulSeksi>Perbandingan SKDR Mingguan (ISPA) per Wilayah</JudulSeksi>
        <div
          style={{
            marginTop: 12,
            height: 300,
            background: GRADASI_KARTU,
            border: `1px solid ${WARNA.border}`,
            borderRadius: 10,
            padding: '12px 12px 0',
          }}
        >
          {dataSkdrWilayah.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSkdrWilayah} margin={{ top: 8, right: 12, left: -12, bottom: 64 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: WARNA.muted }}
                  interval={0}
                  angle={-40}
                  textAnchor="end"
                  height={86}
                />
                <YAxis tick={{ fontSize: 11, fill: WARNA.muted }} allowDecimals={false} />
                <Bar dataKey="Minggu Lalu" fill="rgba(45,212,191,0.35)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Minggu Ini" fill={WARNA.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ margin: 0, padding: '40px 0', textAlign: 'center', fontSize: 13, color: WARNA.muted }}>
              Belum ada data SKDR per wilayah untuk periode ini.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: WARNA.muted }}>
          <LegendaGaris warna="rgba(45,212,191,0.6)" label={`Minggu Lalu (${data.skdrMingguLalu.label})`} />
          <LegendaGaris warna={WARNA.teal} label={`Minggu Ini (${data.skdrMingguIni.label})`} />
        </div>
      </div>

      {/* ---------- FOOTER ---------- */}
      <div style={{ marginTop: 28, padding: '16px 48px 28px', borderTop: `1px solid ${WARNA.border}` }}>
        <p
          style={{ margin: 0, fontSize: 11, color: WARNA.muted, lineHeight: 1.6 }}
          suppressHydrationWarning
        >
          Sumber data: NASA FIRMS (titik panas), laporan wilayah kerja BKK Kelas I Samarinda (ISPA &
          kualitas udara), SKDR Kementerian Kesehatan RI. Dicetak {new Date().toLocaleString('id-ID', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: WARNA.cyan }}>
          Balai Kekarantinaan Kesehatan Kelas I Samarinda — Direktorat Jenderal Penanggulangan Penyakit Kementerian Kesehatan RI
        </p>
      </div>
    </div>
  );
}

function KartuKpi({
  label,
  nilai,
  satuan,
  warna,
  keterangan,
}: {
  label: string;
  nilai: number | string;
  satuan: string;
  warna: string;
  keterangan?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${WARNA.border}`,
        borderTop: `3px solid ${warna}`,
        background: GRADASI_KARTU,
        borderRadius: 10,
        padding: '16px 18px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: WARNA.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 30, fontWeight: 800, color: warna, lineHeight: 1 }}>
        {nilai} <span style={{ fontSize: 13, fontWeight: 600 }}>{satuan}</span>
      </p>
      {keterangan && <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: warna }}>{keterangan}</p>}
    </div>
  );
}

function MiniStat({ label, nilai, warna }: { label: string; nilai: number | string; warna: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: warna }}>{nilai}</p>
      <p style={{ margin: 0, fontSize: 10, color: WARNA.muted }}>{label}</p>
    </div>
  );
}

function JudulSeksi({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff', borderLeft: `4px solid ${WARNA.cyan}`, paddingLeft: 10 }}>
      {children}
    </h2>
  );
}

function LegendaGaris({ warna, label }: { warna: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 3, background: warna, display: 'inline-block', borderRadius: 2 }} />
      {label}
    </span>
  );
}

function ThKualitasUdara({ children, align = 'center' }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <th
      style={{
        padding: '10px 14px',
        textAlign: align,
        fontSize: 11,
        fontWeight: 700,
        color: WARNA.cyan,
        letterSpacing: 0.3,
      }}
    >
      {children}
    </th>
  );
}

function TdKualitasUdara({ children, align = 'center', bold = false }: { children: React.ReactNode; align?: 'left' | 'center'; bold?: boolean }) {
  return (
    <td style={{ padding: '9px 14px', textAlign: align, fontWeight: bold ? 700 : 500, color: bold ? '#ffffff' : WARNA.ink }}>
      {children}
    </td>
  );
}