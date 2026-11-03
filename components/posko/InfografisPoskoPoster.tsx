/**
 * Poster info grafis HARIAN Posko Nataru / Idul Fitri (lebar tetap 1080px).
 * - Tanggal yang dipilih = TANGGAL LAPORAN; data yang ditampilkan = data H-1 (hari sebelumnya).
 * - Memakai inline style, <img> biasa, dan tanpa backdrop-filter/blur supaya html-to-image bisa menangkapnya
 *   jadi JPEG/PNG/PDF dengan benar (sama seperti poster Karhutla).
 */
import type { CSSProperties, ReactNode, Ref } from 'react';
import { LABEL_POSKO, WILAYAH_POSKO, type DataPosko } from '@/lib/posko/konstanta';
import {
  donutJenisKelamin,
  hariKe,
  jumlahkanHarian,
  ringkasPenyakit,
  ringkasPtm,
  tambahHari,
  tanggalPanjang,
  tanggalPendek,
  trenHarian,
} from '@/lib/posko/hitung';
import {
  BatangHorizontal,
  DonutPoster,
  GrafikBatangHarian,
  type BarisHorizontal,
  type TitikHarian,
} from './GrafikPoster';

export const LEBAR_POSTER = 1080;

const W = {
  navy: '#0b2447',
  teal: '#0F4C5C',
  cyan: '#3ee8ff',
  oranye: '#EA580C',
  merah: '#B71C1C',
  biru: '#2563EB',
  merahMuda: '#DB2777',
  teks: '#0F2A38',
  redup: '#5b6b78',
  garis: '#dbe3ea',
  latar: '#f4f8fb',
  putih: '#ffffff',
};

// Daftar penyakit potensial KLB prioritas jika data masih 0 kasus
export const DAFTAR_KLB_PRIORITAS = [
  'Diare Akut',
  'ISPA',
  'Suspek Dengue',
  'Pneumonia',
  'Keracunan Pangan',
  'Suspek Campak',
  'Suspek Demam Tifoid',
  'ILI (Penyakit Serupa Influenza)',
];

const KIRI = 620; // lebar kolom grafik
const KANAN = 340; // lebar kolom donut
const JARAK = 24;

const fmt = (n: number) => n.toLocaleString('id-ID');

const sel: CSSProperties = { padding: '7px 10px', fontSize: 14, borderTop: `1px solid ${W.garis}` };
const selKanan: CSSProperties = { ...sel, textAlign: 'right' };
const kepala: CSSProperties = {
  padding: '8px 10px', fontSize: 12, fontWeight: 700, color: W.redup, background: W.latar,
  textTransform: 'uppercase', letterSpacing: 0.4,
};
const tabel: CSSProperties = {
  width: '100%', borderCollapse: 'collapse', border: `1px solid ${W.garis}`, borderRadius: 10, overflow: 'hidden',
};

function Seksi({ judul, warna = W.teal, keterangan, children }: { judul: string; warna?: string; keterangan?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: W.teks, borderLeft: `6px solid ${warna}`, paddingLeft: 10 }}>
        {judul}
      </h2>
      {keterangan && <p style={{ margin: '4px 0 10px 16px', fontSize: 12.5, color: W.redup, lineHeight: 1.4 }}>{keterangan}</p>}
      {!keterangan && <div style={{ height: 10 }} />}
      {children}
    </section>
  );
}

function DuaKolom({ kiri, kanan }: { kiri: ReactNode; kanan: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: JARAK, alignItems: 'flex-start' }}>
      <div style={{ width: KIRI, flexShrink: 0 }}>{kiri}</div>
      <div style={{ width: KANAN, flexShrink: 0 }}>{kanan}</div>
    </div>
  );
}

function Kotak({ label, nilai, sub, warna = W.teal }: { label: string; nilai: number; sub?: string; warna?: string }) {
  return (
    <div style={{ flex: 1, background: W.latar, border: `1px solid ${W.garis}`, borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: W.redup, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 34, fontWeight: 800, color: warna, lineHeight: 1.1 }}>{fmt(nilai)}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: W.redup }}>{sub}</p>}
    </div>
  );
}

/** Logo BerAKHLAK (SVG, gradien merah/putih, dengan tanda segitiga di atas). Aman untuk html-to-image. */
function LogoBerAkhlak({ lebar = 170 }: { lebar?: number }) {
  const MERAH = '#ffffff'; // Diubah jadi putih agar kontras dengan background gelap header
  const WARNA_TEKS_SEKUNDER = '#cbd5e1'; // Abu-abu terang agar teks core values terbaca jelas
  return (
    <svg width={lebar} height={(lebar * 108) / 310} viewBox="0 0 310 108" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="gradAkhlak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff7b7b" />
          <stop offset="70%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#fca5a5" />
        </linearGradient>
      </defs>
      {/* tanda segitiga / chevron */}
      <polyline
        points="266,4 292,18 266,34"
        fill="none"
        stroke="url(#gradAkhlak)"
        strokeWidth={8}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <text
        x={0}
        y={66}
        fontSize={56}
        fontWeight={800}
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
        textLength={296}
        lengthAdjust="spacingAndGlyphs"
      >
        <tspan fill={MERAH}>Ber</tspan>
        <tspan fill="url(#gradAkhlak)">AKHLAK</tspan>
      </text>
      <text x={0} y={87} fontSize={11.5} fill={WARNA_TEKS_SEKUNDER} fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif">
        <tspan fill="#ff7b7b" fontWeight={800}>Ber</tspan>
        <tspan>orientasi Pelayanan </tspan>
        <tspan fill="#ff7b7b" fontWeight={800}>A</tspan>
        <tspan>kuntabel </tspan>
        <tspan fill="#ff7b7b" fontWeight={800}>K</tspan>
        <tspan>ompeten</tspan>
      </text>
      <text x={0} y={103} fontSize={11.5} fill={WARNA_TEKS_SEKUNDER} fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif">
        <tspan fill="#ff7b7b" fontWeight={800}>H</tspan>
        <tspan>armonis </tspan>
        <tspan fill="#ff7b7b" fontWeight={800}>L</tspan>
        <tspan>oyal </tspan>
        <tspan fill="#ff7b7b" fontWeight={800}>A</tspan>
        <tspan>daptif </tspan>
        <tspan fill="#ff7b7b" fontWeight={800}>K</tspan>
        <tspan>olaboratif</tspan>
      </text>
    </svg>
  );
}

export default function InfografisPoskoPoster({
  data,
  tanggalLaporan,
  ref,
}: {
  data: DataPosko;
  /** tanggal laporan; data yang tampil adalah data hari sebelumnya (H-1) */
  tanggalLaporan: string;
  ref?: Ref<HTMLDivElement>;
}) {
  const periode = data.periode!;
  const judul = LABEL_POSKO[data.posko];
  const tanggalData = tambahHari(tanggalLaporan, -1);

  const harianHari = data.harian.filter((r) => r.tanggal === tanggalData);
  const harianKum = data.harian.filter((r) => r.tanggal <= tanggalData);
  const th = jumlahkanHarian(harianHari);
  const tk = jumlahkanHarian(harianKum);

  const pHari = ringkasPenyakit(data.penyakit.filter((r) => r.tanggal === tanggalData));
  const pKum = ringkasPenyakit(data.penyakit.filter((r) => r.tanggal <= tanggalData));
  const ptmHari = ringkasPtm(data.ptm.filter((r) => r.tanggal === tanggalData));
  const ptmKum = ringkasPtm(data.ptm.filter((r) => r.tanggal <= tanggalData));

  const hari = hariKe(periode.tanggalMulai, tanggalData);
  const totalHari = hariKe(periode.tanggalMulai, periode.tanggalSelesai);
  const rentang = `${tanggalPendek(periode.tanggalMulai)} – ${tanggalPendek(tanggalData)}`;

  // ---- grafik harian (alat angkut & orang) ----
  const dataHarian = (ambil: (t: ReturnType<typeof jumlahkanHarian>) => { a: number; b: number }): TitikHarian[] =>
    trenHarian(harianKum, (rows) => ambil(jumlahkanHarian(rows))).map((x) => ({
      label: x.name, a: Number(x.a), b: Number(x.b),
    }));
  const trenAlat = dataHarian((t) => ({ a: t.alatAngkutDatang, b: t.alatAngkutBerangkat }));
  const trenOrang = dataHarian((t) => ({ a: t.orangDatang, b: t.orangBerangkat }));

  const donutAlat = [
    { label: 'Kapal penumpang', nilai: tk.kapalDatang + tk.kapalBerangkat, warna: W.teal },
    { label: 'Pesawat', nilai: tk.pesawatDatang + tk.pesawatBerangkat, warna: W.oranye },
  ];
  const donutOrang = [
    { label: 'Kapal (ABK + penumpang)', nilai: tk.abkDatang + tk.abkBerangkat + tk.penumpangKapalDatang + tk.penumpangKapalBerangkat, warna: W.teal },
    { label: 'Pesawat (crew + penumpang)', nilai: tk.crewDatang + tk.crewBerangkat + tk.penumpangPesawatDatang + tk.penumpangPesawatBerangkat, warna: W.oranye },
  ];

  // ---- Penyakit Potensial KLB ----
  const kasusHariIni = new Map(pHari.perJenis.map((p) => [p.jenis, p.kasusTotal]));

  const penyakitTerisi = pKum.perJenis
    .filter((p) => p.kasusTotal > 0 || p.matiTotal > 0)
    .sort((a, b) => b.kasusTotal - a.kasusTotal || b.matiTotal - a.matiTotal);

  let penyakitTampil: typeof pKum.perJenis = [];
  let sisaPenyakit = 0;

  if (penyakitTerisi.length > 0) {
    // Jika ada kasus yang terlaporkan
    penyakitTampil = penyakitTerisi.slice(0, 10);
    sisaPenyakit = penyakitTerisi.length - penyakitTampil.length;
  } else {
    // Jika MASIH KOSONG (0 Kasus):
    // Tampilkan penyakit prioritas dengan nilai 0
    penyakitTampil = DAFTAR_KLB_PRIORITAS.map((jenis) => ({
      jenis,
      kasusTotal: 0,
      matiTotal: 0,
    })) as typeof pKum.perJenis;
  }

  const barPenyakit: BarisHorizontal[] = penyakitTampil.map((p) => ({
    label: p.jenis,
    nilai: p.kasusTotal,
    nilai2: p.matiTotal,
    tambahan: (kasusHariIni.get(p.jenis) ?? 0) > 0 ? `+${kasusHariIni.get(p.jenis)}` : undefined,
  }));
  
  const [lkKasus, prKasus] = donutJenisKelamin(pKum.total, 'kasus');

  // ---- PTM ----
  const ptmHariIni = new Map(ptmHari.perJenis.map((p) => [p.jenis, p.jumlah]));
  const barPtm: BarisHorizontal[] = [...ptmKum.perJenis]
    .sort((a, b) => b.jumlah - a.jumlah)
    .map((p) => ({
      label: p.jenis,
      nilai: p.jumlah,
      tambahan: (ptmHariIni.get(p.jenis) ?? 0) > 0 ? `+${ptmHariIni.get(p.jenis)}` : undefined,
    }));

  const barisWilayah = WILAYAH_POSKO.map((w) => ({
    wilayah: w,
    ...jumlahkanHarian(harianHari.filter((r) => r.wilayah === w)),
  }));

  return (
    <div
      ref={ref}
      style={{
        width: LEBAR_POSTER,
        background: W.putih,
        color: W.teks,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: `linear-gradient(100deg, #050d1a 0%, ${W.navy} 30%, #17678a 72%, #1ba3a0 100%)`,
          padding: '24px 24px 24px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo Kemenkes */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-header-transparan.png"
          alt="Kemenkes RI - BKK Kelas I Samarinda"
          style={{ height: 70, flexShrink: 0, display: 'block' }}
        />
        
        {/* Judul & Keterangan */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 2, color: W.cyan, textTransform: 'uppercase' }}>
            Info Grafis Harian
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>
            {judul} {periode.tahun}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600, color: '#e3eef5' }}>
            Laporan {tanggalPanjang(tanggalLaporan)}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#a9c2d1', lineHeight: 1.35 }}>
            Data {tanggalPanjang(tanggalData)} (H-1) &middot; Hari ke-{hari} dari {totalHari} &middot; Samarinda, APT Pranoto &amp; Lhoktuan
          </p>
        </div>

        {/* Logo BerAKHLAK */}
        <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
          <LogoBerAkhlak lebar={170} />
        </div>
      </div>

      <div style={{ padding: '28px 48px 24px' }}>
        {/* POLIKLINIK */}
        <Seksi judul="Kunjungan Poliklinik">
          <div style={{ display: 'flex', gap: 12 }}>
            <Kotak label="Total" nilai={th.poliklinik} sub={`Kumulatif ${fmt(tk.poliklinik)}`} />
            {barisWilayah.map((b) => (
              <Kotak
                key={b.wilayah}
                label={b.wilayah}
                nilai={b.poliklinik}
                sub={`Kumulatif ${fmt(harianKum.filter((r) => r.wilayah === b.wilayah).reduce((a, r) => a + r.poliklinik, 0))}`}
                warna={W.oranye}
              />
            ))}
          </div>
        </Seksi>

        {/* ALAT ANGKUT */}
        <Seksi
          judul="Pengawasan Alat Angkut (Kapal Penumpang & Pesawat)"
          keterangan={`Data ${tanggalPendek(tanggalData)}: datang ${fmt(th.alatAngkutDatang)} · berangkat ${fmt(th.alatAngkutBerangkat)} · total ${fmt(th.alatAngkutTotal)}.  Kumulatif ${rentang}: datang ${fmt(tk.alatAngkutDatang)} · berangkat ${fmt(tk.alatAngkutBerangkat)}.`}
        >
          <DuaKolom
            kiri={<GrafikBatangHarian data={trenAlat} namaA="Datang" namaB="Berangkat" warnaA={W.teal} warnaB={W.oranye} lebar={KIRI} />}
            kanan={<DonutPoster data={donutAlat} lebar={KANAN} tengah="alat angkut" />}
          />
        </Seksi>

        {/* ORANG */}
        <Seksi
          judul="Pengawasan Penumpang, ABK & Crew"
          warna={W.oranye}
          keterangan={`Data ${tanggalPendek(tanggalData)}: datang ${fmt(th.orangDatang)} · berangkat ${fmt(th.orangBerangkat)}.  Kumulatif ${rentang}: datang ${fmt(tk.orangDatang)} · berangkat ${fmt(tk.orangBerangkat)}.  (ABK kapal + penumpang kapal + crew pesawat + penumpang pesawat)`}
        >
          <DuaKolom
            kiri={<GrafikBatangHarian data={trenOrang} namaA="Datang" namaB="Berangkat" warnaA={W.teal} warnaB={W.merah} lebar={KIRI} />}
            kanan={<DonutPoster data={donutOrang} lebar={KANAN} tengah="orang" />}
          />
        </Seksi>

        {/* PENYAKIT POTENSIAL KLB */}
        <Seksi
          judul="Penyakit Potensial KLB"
          warna={W.merah}
          keterangan={`Grafik kumulatif ${rentang}. Tanda +N = tambahan kasus pada ${tanggalPendek(tanggalData)}.`}
        >
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <Kotak label={`Kasus ${tanggalPendek(tanggalData)}`} nilai={pHari.total.kasusTotal} sub={`Kumulatif ${fmt(pKum.total.kasusTotal)}`} warna={W.oranye} />
            <Kotak label={`Meninggal ${tanggalPendek(tanggalData)}`} nilai={pHari.total.matiTotal} sub={`Kumulatif ${fmt(pKum.total.matiTotal)}`} warna={W.merah} />
            <Kotak label={`Kejadian KLB ${tanggalPendek(tanggalData)}`} nilai={th.jumlahKlb} sub={`Kumulatif ${fmt(tk.jumlahKlb)}`} warna={W.merah} />
          </div>
          <DuaKolom
            kiri={
              <>
                <BatangHorizontal
                  data={barPenyakit}
                  lebar={KIRI}
                  warna={W.oranye} nama="Kasus"
                  warna2={W.merah} nama2="Meninggal"
                  pesanKosong="Tidak ada kasus penyakit potensial KLB yang dilaporkan sampai tanggal ini."
                />
                {sisaPenyakit > 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: W.redup }}>dan {sisaPenyakit} jenis penyakit lainnya.</p>
                )}
              </>
            }
            kanan={
              <>
                <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 700, color: W.teks, textAlign: 'center' }}>Kasus menurut jenis kelamin</p>
                <DonutPoster
                  data={[
                    { label: lkKasus.kategori, nilai: lkKasus.jumlah, warna: W.biru },
                    { label: prKasus.kategori, nilai: prKasus.jumlah, warna: W.merahMuda },
                  ]}
                  lebar={KANAN}
                  tengah="kasus"
                />
              </>
            }
          />
        </Seksi>

        {/* PTM */}
        <Seksi
          judul="Penyakit Tidak Menular"
          keterangan={`Grafik kumulatif ${rentang}. Tanda +N = tambahan kasus pada ${tanggalPendek(tanggalData)}.`}
        >
          <DuaKolom
            kiri={<BatangHorizontal data={barPtm} lebar={KIRI} warna={W.teal} nama="Kasus" pesanKosong="Belum ada data penyakit tidak menular." />}
            kanan={
              <>
                <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 700, color: W.teks, textAlign: 'center' }}>Kasus menurut jenis kelamin</p>
                <DonutPoster
                  data={[
                    { label: 'Laki-laki', nilai: ptmKum.totalLk, warna: W.biru },
                    { label: 'Perempuan', nilai: ptmKum.totalPr, warna: W.merahMuda },
                    ...(ptmKum.tanpaRincian > 0 ? [{ label: 'Tanpa rincian', nilai: ptmKum.tanpaRincian, warna: '#9fb0bd' }] : []),
                  ]}
                  lebar={KANAN}
                  tengah="kasus"
                />
              </>
            }
          />
        </Seksi>

        {/* PER WILAYAH */}
        <Seksi judul={`Rekap per Wilayah Kerja (${tanggalPendek(tanggalData)})`}>
          <table style={tabel}>
            <thead>
              <tr>
                <th style={{ ...kepala, textAlign: 'left' }}>Wilayah Kerja</th>
                {['Poliklinik', 'Alat Angkut Datang', 'Alat Angkut Berangkat', 'Orang Datang', 'Orang Berangkat', 'KLB'].map((h) => (
                  <th key={h} style={{ ...kepala, textAlign: 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barisWilayah.map((b) => (
                <tr key={b.wilayah}>
                  <td style={sel}>{b.wilayah}</td>
                  <td style={selKanan}>{fmt(b.poliklinik)}</td>
                  <td style={selKanan}>{fmt(b.alatAngkutDatang)}</td>
                  <td style={selKanan}>{fmt(b.alatAngkutBerangkat)}</td>
                  <td style={selKanan}>{fmt(b.orangDatang)}</td>
                  <td style={selKanan}>{fmt(b.orangBerangkat)}</td>
                  <td style={selKanan}>{fmt(b.jumlahKlb)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800, background: W.latar }}>
                <td style={sel}>TOTAL</td>
                <td style={selKanan}>{fmt(th.poliklinik)}</td>
                <td style={selKanan}>{fmt(th.alatAngkutDatang)}</td>
                <td style={selKanan}>{fmt(th.alatAngkutBerangkat)}</td>
                <td style={selKanan}>{fmt(th.orangDatang)}</td>
                <td style={selKanan}>{fmt(th.orangBerangkat)}</td>
                <td style={selKanan}>{fmt(th.jumlahKlb)}</td>
              </tr>
            </tbody>
          </table>
        </Seksi>

        <p style={{ margin: '4px 0 0', fontSize: 12, color: W.redup, textAlign: 'center' }}>
          Sumber: data posko, kunjungan poliklinik, kapal penumpang &amp; pesawat BKK Kelas I Samarinda &middot; EPIC-AI
        </p>
      </div>
    </div>
  );
}