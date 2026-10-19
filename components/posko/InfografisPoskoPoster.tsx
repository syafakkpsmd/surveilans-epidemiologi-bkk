/**
 * Poster info grafis HARIAN Posko Nataru / Idul Fitri (lebar tetap 1080px).
 * Sengaja memakai inline style, <img> biasa, dan TANPA backdrop-filter/blur supaya
 * html-to-image bisa menangkapnya jadi JPEG/PNG/PDF dengan benar (sama seperti poster Karhutla).
 */
import type { CSSProperties, ReactNode, Ref } from 'react';
import { LABEL_POSKO, WILAYAH_POSKO, type DataPosko } from '@/lib/posko/konstanta';
import { hariKe, jumlahkanHarian, ringkasPenyakit, ringkasPtm, tanggalPanjang } from '@/lib/posko/hitung';

export const LEBAR_POSTER = 1080;

const W = {
  navy: '#0b2447',
  teal: '#0F4C5C',
  cyan: '#3ee8ff',
  oranye: '#EA580C',
  merah: '#B71C1C',
  teks: '#0F2A38',
  redup: '#5b6b78',
  garis: '#dbe3ea',
  latar: '#f4f8fb',
  putih: '#ffffff',
};

const fmt = (n: number) => n.toLocaleString('id-ID');

const sel: CSSProperties = { padding: '7px 10px', fontSize: 14, borderTop: `1px solid ${W.garis}` };
const selKanan: CSSProperties = { ...sel, textAlign: 'right' };
const kepala: CSSProperties = {
  padding: '8px 10px', fontSize: 12, fontWeight: 700, color: W.redup, background: W.latar,
  textTransform: 'uppercase', letterSpacing: 0.4,
};

function Seksi({ judul, warna = W.teal, children }: { judul: string; warna?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2
        style={{
          margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: W.teks,
          borderLeft: `6px solid ${warna}`, paddingLeft: 10,
        }}
      >
        {judul}
      </h2>
      {children}
    </section>
  );
}

function Kotak({ label, nilai, sub, warna = W.teal }: { label: string; nilai: number; sub?: string; warna?: string }) {
  return (
    <div style={{ flex: 1, background: W.latar, border: `1px solid ${W.garis}`, borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: W.redup, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 34, fontWeight: 800, color: warna, lineHeight: 1.1 }}>{fmt(nilai)}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: W.redup }}>{sub}</p>}
    </div>
  );
}

const tabel: CSSProperties = {
  width: '100%', borderCollapse: 'collapse', border: `1px solid ${W.garis}`, borderRadius: 10, overflow: 'hidden',
};

export default function InfografisPoskoPoster({
  data,
  tanggal,
  ref,
}: {
  data: DataPosko;
  tanggal: string;
  ref?: Ref<HTMLDivElement>;
}) {
  const periode = data.periode!;
  const judul = LABEL_POSKO[data.posko];

  const harianHari = data.harian.filter((r) => r.tanggal === tanggal);
  const harianKum = data.harian.filter((r) => r.tanggal <= tanggal);
  const th = jumlahkanHarian(harianHari);
  const tk = jumlahkanHarian(harianKum);

  const pHari = ringkasPenyakit(data.penyakit.filter((r) => r.tanggal === tanggal));
  const pKum = ringkasPenyakit(data.penyakit.filter((r) => r.tanggal <= tanggal));
  const ptmHari = ringkasPtm(data.ptm.filter((r) => r.tanggal === tanggal));
  const ptmKum = ringkasPtm(data.ptm.filter((r) => r.tanggal <= tanggal));

  const penyakitHariIni = pHari.perJenis.filter((p) => p.kasusTotal > 0 || p.matiTotal > 0);
  const barisWilayah = WILAYAH_POSKO.map((w) => ({
    wilayah: w,
    ...jumlahkanHarian(harianHari.filter((r) => r.wilayah === w)),
  }));

  const hari = hariKe(periode.tanggalMulai, tanggal);
  const totalHari = hariKe(periode.tanggalMulai, periode.tanggalSelesai);

  return (
    <div
      ref={ref}
      style={{
        width: LEBAR_POSTER, background: W.putih, color: W.teks,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: `linear-gradient(160deg, #050d1a 0%, ${W.navy} 40%, #17678a 82%, #1ba3a0 100%)`,
          padding: '30px 48px', display: 'flex', alignItems: 'center', gap: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- sengaja <img> biasa (bukan next/image) agar html-to-image tidak kosong */}
        <img
          src="/logo-header-infografis.png"
          alt="Kemenkes RI - BKK Kelas I Samarinda"
          style={{ height: 76, flexShrink: 0, display: 'block', mixBlendMode: 'lighten' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 2, color: W.cyan, textTransform: 'uppercase' }}>
            Info Grafis Harian
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>
            {judul} {periode.tahun}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#a9c2d1' }}>
            {tanggalPanjang(tanggal)} &middot; Hari ke-{hari} dari {totalHari} &middot; Samarinda, APT Pranoto &amp; Lhoktuan
          </p>
        </div>
      </div>

      <div style={{ padding: '30px 48px 24px' }}>
        {/* POLIKLINIK */}
        <Seksi judul="Kunjungan Poliklinik">
          <div style={{ display: 'flex', gap: 12 }}>
            <Kotak label="Total Hari Ini" nilai={th.poliklinik} sub={`Kumulatif ${fmt(tk.poliklinik)}`} />
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
        <Seksi judul="Pergerakan Alat Angkut (Kapal Penumpang & Pesawat)">
          <table style={tabel}>
            <thead>
              <tr>
                <th style={{ ...kepala, textAlign: 'left' }} rowSpan={2}>Arah</th>
                <th style={{ ...kepala, textAlign: 'center' }} colSpan={3}>Hari Ini</th>
                <th style={{ ...kepala, textAlign: 'center', borderLeft: `1px solid ${W.garis}` }} colSpan={3}>Kumulatif</th>
              </tr>
              <tr>
                {['Kapal', 'Pesawat', 'Total', 'Kapal', 'Pesawat', 'Total'].map((h, i) => (
                  <th key={`${h}${i}`} style={{ ...kepala, textAlign: 'right', ...(i === 3 ? { borderLeft: `1px solid ${W.garis}` } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { arah: 'Datang', a: th.kapalDatang, b: th.pesawatDatang, c: th.alatAngkutDatang, d: tk.kapalDatang, e: tk.pesawatDatang, f: tk.alatAngkutDatang },
                { arah: 'Berangkat', a: th.kapalBerangkat, b: th.pesawatBerangkat, c: th.alatAngkutBerangkat, d: tk.kapalBerangkat, e: tk.pesawatBerangkat, f: tk.alatAngkutBerangkat },
                { arah: 'Total', a: th.kapalDatang + th.kapalBerangkat, b: th.pesawatDatang + th.pesawatBerangkat, c: th.alatAngkutTotal, d: tk.kapalDatang + tk.kapalBerangkat, e: tk.pesawatDatang + tk.pesawatBerangkat, f: tk.alatAngkutTotal },
              ].map((r) => (
                <tr key={r.arah} style={r.arah === 'Total' ? { fontWeight: 800, background: W.latar } : undefined}>
                  <td style={sel}>{r.arah}</td>
                  <td style={selKanan}>{fmt(r.a)}</td>
                  <td style={selKanan}>{fmt(r.b)}</td>
                  <td style={{ ...selKanan, fontWeight: 700 }}>{fmt(r.c)}</td>
                  <td style={{ ...selKanan, borderLeft: `1px solid ${W.garis}` }}>{fmt(r.d)}</td>
                  <td style={selKanan}>{fmt(r.e)}</td>
                  <td style={{ ...selKanan, fontWeight: 700 }}>{fmt(r.f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Seksi>

        {/* ORANG */}
        <Seksi judul="Pergerakan Orang" warna={W.oranye}>
          <table style={tabel}>
            <thead>
              <tr>
                <th style={{ ...kepala, textAlign: 'left' }} rowSpan={2}>Kelompok</th>
                <th style={{ ...kepala, textAlign: 'center' }} colSpan={2}>Hari Ini</th>
                <th style={{ ...kepala, textAlign: 'center', borderLeft: `1px solid ${W.garis}` }} colSpan={2}>Kumulatif</th>
              </tr>
              <tr>
                {['Datang', 'Berangkat', 'Datang', 'Berangkat'].map((h, i) => (
                  <th key={`${h}${i}`} style={{ ...kepala, textAlign: 'right', ...(i === 2 ? { borderLeft: `1px solid ${W.garis}` } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { n: 'ABK Kapal Penumpang', a: th.abkDatang, b: th.abkBerangkat, c: tk.abkDatang, d: tk.abkBerangkat },
                { n: 'Penumpang Kapal', a: th.penumpangKapalDatang, b: th.penumpangKapalBerangkat, c: tk.penumpangKapalDatang, d: tk.penumpangKapalBerangkat },
                { n: 'Crew Pesawat', a: th.crewDatang, b: th.crewBerangkat, c: tk.crewDatang, d: tk.crewBerangkat },
                { n: 'Penumpang Pesawat', a: th.penumpangPesawatDatang, b: th.penumpangPesawatBerangkat, c: tk.penumpangPesawatDatang, d: tk.penumpangPesawatBerangkat },
                { n: 'TOTAL ORANG', a: th.orangDatang, b: th.orangBerangkat, c: tk.orangDatang, d: tk.orangBerangkat },
              ].map((r) => {
                const total = r.n === 'TOTAL ORANG';
                return (
                  <tr key={r.n} style={total ? { fontWeight: 800, background: W.latar } : undefined}>
                    <td style={sel}>{r.n}</td>
                    <td style={selKanan}>{fmt(r.a)}</td>
                    <td style={selKanan}>{fmt(r.b)}</td>
                    <td style={{ ...selKanan, borderLeft: `1px solid ${W.garis}` }}>{fmt(r.c)}</td>
                    <td style={selKanan}>{fmt(r.d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Seksi>

        {/* PENYAKIT POTENSIAL KLB */}
        <Seksi judul="Penyakit Potensial KLB" warna={W.merah}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Kotak label="Kasus Hari Ini" nilai={pHari.total.kasusTotal} sub={`Kumulatif ${fmt(pKum.total.kasusTotal)}`} warna={W.oranye} />
            <Kotak label="Meninggal Hari Ini" nilai={pHari.total.matiTotal} sub={`Kumulatif ${fmt(pKum.total.matiTotal)}`} warna={W.merah} />
            <Kotak label="Kejadian KLB Hari Ini" nilai={th.jumlahKlb} sub={`Kumulatif ${fmt(tk.jumlahKlb)}`} warna={W.merah} />
          </div>
          {penyakitHariIni.length === 0 ? (
            <p style={{ margin: 0, padding: '12px 14px', background: W.latar, borderRadius: 10, fontSize: 14, color: W.redup }}>
              Tidak ada kasus penyakit potensial KLB yang dilaporkan pada tanggal ini.
            </p>
          ) : (
            <table style={tabel}>
              <thead>
                <tr>
                  <th style={{ ...kepala, textAlign: 'left' }}>Jenis Penyakit</th>
                  {['L <5', 'L ≥5', 'P <5', 'P ≥5', 'Kasus', 'Meninggal'].map((h) => (
                    <th key={h} style={{ ...kepala, textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {penyakitHariIni.map((p) => (
                  <tr key={p.jenis}>
                    <td style={sel}>{p.jenis}</td>
                    <td style={selKanan}>{fmt(p.kasusLkLt5)}</td>
                    <td style={selKanan}>{fmt(p.kasusLkGe5)}</td>
                    <td style={selKanan}>{fmt(p.kasusPrLt5)}</td>
                    <td style={selKanan}>{fmt(p.kasusPrGe5)}</td>
                    <td style={{ ...selKanan, fontWeight: 700 }}>{fmt(p.kasusTotal)}</td>
                    <td style={{ ...selKanan, fontWeight: 700, color: p.matiTotal > 0 ? W.merah : W.teks }}>{fmt(p.matiTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seksi>

        {/* PTM */}
        <Seksi judul="Penyakit Tidak Menular">
          <table style={tabel}>
            <thead>
              <tr>
                <th style={{ ...kepala, textAlign: 'left' }}>Jenis</th>
                <th style={{ ...kepala, textAlign: 'right' }}>Hari Ini</th>
                <th style={{ ...kepala, textAlign: 'right' }}>Kumulatif</th>
              </tr>
            </thead>
            <tbody>
              {ptmHari.perJenis.map((p, i) => (
                <tr key={p.jenis}>
                  <td style={sel}>{p.jenis}</td>
                  <td style={{ ...selKanan, fontWeight: 700 }}>{fmt(p.jumlah)}</td>
                  <td style={selKanan}>{fmt(ptmKum.perJenis[i]?.jumlah ?? 0)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800, background: W.latar }}>
                <td style={sel}>TOTAL</td>
                <td style={selKanan}>{fmt(ptmHari.total)}</td>
                <td style={selKanan}>{fmt(ptmKum.total)}</td>
              </tr>
            </tbody>
          </table>
        </Seksi>

        {/* PER WILAYAH */}
        <Seksi judul="Rekap per Wilayah Kerja (Hari Ini)">
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
