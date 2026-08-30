import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import PetaMiniHotspot from './PetaMiniHotspot';
import type { RingkasanInfografisHarian } from '@/lib/supabase/queries-karhutla-server';

const WARNA = {
  navy: '#0f2a38',
  teal: '#0f4c5c',
  ink: '#1b2733',
  muted: '#5b7083',
  border: '#d5dce1',
  hijau: '#2f9e44',
  kuning: '#f0a202',
  merah: '#d62839',
};

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

export const LEBAR_POSTER = 1080;

export default function InfografisPoster({ data }: { data: RingkasanInfografisHarian }) {
  const totalIspa = data.totalIspaAnak + data.totalIspaDewasa;
  const wilayahTerdampak = data.perWilker.filter((w) => w.jumlahHotspot > 0 || w.kasusIspaAnak + w.kasusIspaDewasa > 0).length;

  const dataTren = data.tren7Hari.map((t) => ({
    label: formatTanggalSingkat(t.tanggal),
    'Kasus ISPA': t.totalIspa,
    'Titik Panas': t.jumlahHotspot,
  }));

  const dataSkdr = [
    { label: data.skdrMingguLalu.label, 'Kasus ISPA (SKDR)': data.skdrMingguLalu.totalKasus },
    { label: data.skdrMingguIni.label, 'Kasus ISPA (SKDR)': data.skdrMingguIni.totalKasus },
  ];

  return (
    <div
      style={{
        width: LEBAR_POSTER,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        background: '#ffffff',
        color: WARNA.ink,
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div style={{ background: WARNA.navy, padding: '28px 48px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- sengaja <img> biasa, BUKAN next/image:
            next/image pakai lazy-load & optimizer eksternal yang bikin html-to-image gagal/kosong saat
            capture poster ini jadi JPEG/PDF. */}
        <img
          src="/logo-header-infografis.png"
          alt="Kemenkes RI - BKK Kelas I Samarinda"
          style={{ height: 84, margin: '0 auto', display: 'block' }}
        />
      </div>

      <div style={{ padding: '32px 48px 8px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: WARNA.teal, textTransform: 'uppercase' }}>
          Info Grafis Harian
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: WARNA.navy }}>
          Kesiagaan Karhutla &amp; ISPA
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 16, color: WARNA.muted }}>
          {formatTanggalPanjang(data.tanggalDitampilkan)} &middot; Kalimantan Timur
        </p>
        {data.pakaiFallback && (
          <div
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '4px 14px',
              borderRadius: 999,
              background: '#fff3d6',
              color: '#8a5a00',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Menampilkan data terakhir tersedia ({formatTanggalPanjang(data.tanggalDitampilkan)}) — data tanggal{' '}
            {formatTanggalSingkat(data.tanggalDiminta)} belum masuk
          </div>
        )}
      </div>

      {/* ---------- KPI RINGKASAN ---------- */}
      <div style={{ display: 'flex', gap: 16, padding: '20px 48px 0' }}>
        <KartuKpi label="Titik Panas" nilai={data.totalHotspot} satuan="titik" warna={data.totalHotspot > 0 ? WARNA.merah : WARNA.hijau} />
        <KartuKpi label="Kasus ISPA" nilai={totalIspa} satuan="kasus" warna={WARNA.teal} />
        <KartuKpi
          label="PM2.5 Rerata"
          nilai={data.pm25Rerata ?? '—'}
          satuan={data.pm25Rerata != null ? 'µg/m³' : ''}
          warna={warnaStatusIspu(data.statusIspuDominan)}
          keterangan={data.statusIspuDominan ?? 'Belum ada data'}
        />
        <KartuKpi label="Wilayah Terdampak" nilai={`${wilayahTerdampak}/7`} satuan="wilker" warna={WARNA.navy} />
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
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: WARNA.navy }}>{w.nama}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: WARNA.muted }}>{w.kode_wilker}</p>
              </div>
              <div style={{ display: 'flex', gap: 14, textAlign: 'right' }}>
                <MiniStat label="Titik Panas" nilai={w.jumlahHotspot} warna={w.jumlahHotspot > 0 ? WARNA.merah : WARNA.muted} />
                <MiniStat label="ISPA" nilai={w.kasusIspaAnak + w.kasusIspaDewasa} warna={WARNA.teal} />
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
          <div style={{ marginTop: 12, height: 340 }}>
            <PetaMiniHotspot hotspots={data.hotspotPoints} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <JudulSeksi>Tren 7 Hari Terakhir</JudulSeksi>
          <div style={{ marginTop: 12, height: 340, border: `1px solid ${WARNA.border}`, borderRadius: 10, padding: '12px 12px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataTren} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Kasus ISPA" stroke={WARNA.teal} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Titik Panas" stroke={WARNA.merah} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: WARNA.muted }}>
            <LegendaGaris warna={WARNA.teal} label="Kasus ISPA" />
            <LegendaGaris warna={WARNA.merah} label="Titik Panas" />
          </div>

          <div style={{ marginTop: 20 }}>
            <JudulSeksi>Perbandingan SKDR Mingguan (ISPA)</JudulSeksi>
            <div style={{ marginTop: 12, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataSkdr} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Bar dataKey="Kasus ISPA (SKDR)" fill={WARNA.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- FOOTER ---------- */}
      <div style={{ marginTop: 28, padding: '16px 48px 28px', borderTop: `1px solid ${WARNA.border}` }}>
        <p style={{ margin: 0, fontSize: 11, color: WARNA.muted, lineHeight: 1.6 }}>
          Sumber data: NASA FIRMS (titik panas), laporan wilayah kerja BKK Kelas I Samarinda (ISPA &amp;
          kualitas udara), SKDR Kementerian Kesehatan RI. Dicetak {new Date().toLocaleString('id-ID', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}{' '}
          WITA.
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: WARNA.navy }}>
          Balai Kekarantinaan Kesehatan Kelas I Samarinda — Kementerian Kesehatan RI
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
    <div style={{ flex: 1, border: `1px solid ${WARNA.border}`, borderRadius: 10, padding: '16px 18px' }}>
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
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: WARNA.navy, borderLeft: `4px solid ${WARNA.teal}`, paddingLeft: 10 }}>
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
