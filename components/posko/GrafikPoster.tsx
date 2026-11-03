/**
 * Grafik untuk poster info grafis Posko. Sengaja SVG/HTML biasa dengan ukuran tetap (tanpa Recharts,
 * tanpa animasi, tanpa ResizeObserver) supaya hasil unduhan JPEG/PNG/PDF (html-to-image) selalu sama
 * dengan pratinjau.
 */
import type { CSSProperties } from 'react';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const TEKS = '#0F2A38';
const REDUP = '#5b6b78';
const GARIS = '#dbe3ea';
const LATAR = '#f4f8fb';

const fmt = (n: number) => n.toLocaleString('id-ID');

/** Naikkan ke angka "bulat" (1, 2, 5 x 10^k) untuk batas atas sumbu. */
export function batasAtasBulat(nilai: number): number {
  if (nilai <= 0) return 1;
  const pangkat = Math.pow(10, Math.floor(Math.log10(nilai)));
  const sisa = nilai / pangkat;
  const kelipatan = sisa <= 1 ? 1 : sisa <= 2 ? 2 : sisa <= 5 ? 5 : 10;
  return kelipatan * pangkat;
}

// ===================================================================== batang harian (2 seri)
export type TitikHarian = { label: string; a: number; b: number };

export function GrafikBatangHarian({
  data, namaA, namaB, warnaA, warnaB, lebar, tinggi = 230,
}: {
  data: TitikHarian[];
  namaA: string; namaB: string; warnaA: string; warnaB: string;
  lebar: number; tinggi?: number;
}) {
  const kiri = 38, kanan = 8, atas = 30, bawah = 26;
  const areaW = lebar - kiri - kanan;
  const areaH = tinggi - atas - bawah;
  const n = Math.max(data.length, 1);
  const lebarGrup = areaW / n;
  const lebarBatang = Math.max(3, Math.min(18, lebarGrup * 0.36));
  const celah = 2;
  const maks = batasAtasBulat(Math.max(0, ...data.map((d) => Math.max(d.a, d.b))));
  const semuaNol = data.every((d) => d.a === 0 && d.b === 0);
  const yDari = (v: number) => atas + areaH - (v / maks) * areaH;
  const tampilkanNilai = lebarGrup >= 24;
  const labelSelang = lebarGrup >= 26 ? 1 : lebarGrup >= 14 ? 2 : 3;

  return (
    <svg width={lebar} height={tinggi} viewBox={`0 0 ${lebar} ${tinggi}`} style={{ display: 'block', fontFamily: FONT }}>
      {/* legenda */}
      <rect x={kiri} y={6} width={11} height={11} rx={2} fill={warnaA} />
      <text x={kiri + 16} y={15.5} fontSize={12} fill={TEKS}>{namaA}</text>
      <rect x={kiri + 24 + namaA.length * 6.4 + 12} y={6} width={11} height={11} rx={2} fill={warnaB} />
      <text x={kiri + 24 + namaA.length * 6.4 + 28} y={15.5} fontSize={12} fill={TEKS}>{namaB}</text>

      {/* garis bantu */}
      {[0, 0.5, 1].map((t) => {
        const y = yDari(maks * t);
        return (
          <g key={t}>
            <line x1={kiri} x2={lebar - kanan} y1={y} y2={y} stroke={t === 0 ? '#9fb0bd' : GARIS} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 3'} />
            <text x={kiri - 6} y={y + 3.5} fontSize={10} fill={REDUP} textAnchor="end">{fmt(Math.round(maks * t))}</text>
          </g>
        );
      })}

      {semuaNol ? (
        <text x={kiri + areaW / 2} y={atas + areaH / 2} fontSize={13} fill={REDUP} textAnchor="middle">
          Belum ada pergerakan pada periode ini
        </text>
      ) : (
        data.map((d, i) => {
          const x0 = kiri + i * lebarGrup + (lebarGrup - (2 * lebarBatang + celah)) / 2;
          const terakhir = i === data.length - 1;
          const batang = (v: number, x: number, warna: string) => {
            const h = (v / maks) * areaH;
            return (
              <g key={x}>
                <rect x={x} y={yDari(v)} width={lebarBatang} height={Math.max(h, v > 0 ? 1 : 0)} rx={2} fill={warna} />
                {v > 0 && (tampilkanNilai || terakhir) && (
                  <text x={x + lebarBatang / 2} y={yDari(v) - 3} fontSize={9} fill={TEKS} textAnchor="middle" fontWeight={terakhir ? 700 : 400}>
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          };
          return (
            <g key={i}>
              {terakhir && <rect x={kiri + i * lebarGrup} y={atas - 4} width={lebarGrup} height={areaH + 4} fill="#eef6fb" />}
              {batang(d.a, x0, warnaA)}
              {batang(d.b, x0 + lebarBatang + celah, warnaB)}
              {(i % labelSelang === 0 || terakhir) && (
                <text x={kiri + i * lebarGrup + lebarGrup / 2} y={tinggi - 9} fontSize={9.5} fill={terakhir ? TEKS : REDUP} textAnchor="middle" fontWeight={terakhir ? 700 : 400}>
                  {d.label}
                </text>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

// ===================================================================== donut + legenda
export type IrisanDonut = { label: string; nilai: number; warna: string };

export function DonutPoster({
  data, lebar, ukuran = 170, tengah,
}: {
  data: IrisanDonut[];
  lebar: number;
  ukuran?: number;
  /** teks kecil di bawah angka total di tengah donut */
  tengah?: string;
}) {
  const total = data.reduce((a, d) => a + d.nilai, 0);
  const r = ukuran * 0.36;
  const tebal = ukuran * 0.17;
  const keliling = 2 * Math.PI * r;
  const c = ukuran / 2;
  let dipakai = 0;

  const barisLegenda: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: TEKS, padding: '2px 0' };

  return (
    <div style={{ width: lebar, fontFamily: FONT }}>
      <svg width={ukuran} height={ukuran} viewBox={`0 0 ${ukuran} ${ukuran}`} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={total === 0 ? GARIS : LATAR} strokeWidth={tebal} />
        {total > 0 &&
          data.filter((d) => d.nilai > 0).map((d) => {
            const panjang = (d.nilai / total) * keliling;
            const irisan = (
              <circle
                key={d.label}
                cx={c} cy={c} r={r} fill="none" stroke={d.warna} strokeWidth={tebal}
                strokeDasharray={`${panjang} ${keliling - panjang}`}
                strokeDashoffset={-dipakai}
                transform={`rotate(-90 ${c} ${c})`}
              />
            );
            dipakai += panjang;
            return irisan;
          })}
        <text x={c} y={c + 2} fontSize={ukuran * 0.17} fontWeight={800} fill={TEKS} textAnchor="middle">{fmt(total)}</text>
        {tengah && <text x={c} y={c + ukuran * 0.13} fontSize={10.5} fill={REDUP} textAnchor="middle">{tengah}</text>}
      </svg>
      <div style={{ marginTop: 8 }}>
        {data.map((d) => (
          <div key={d.label} style={barisLegenda}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.warna, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{fmt(d.nilai)}</span>
            <span style={{ color: REDUP, width: 46, textAlign: 'right' }}>
              {total > 0 ? `${Math.round((d.nilai / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================================================================== batang horizontal (HTML)
export type BarisHorizontal = {
  label: string;
  nilai: number;
  /** seri kedua (mis. meninggal), opsional */
  nilai2?: number;
  /** keterangan kecil setelah label, mis. "+3 hari ini" */
  tambahan?: string;
};

export function BatangHorizontal({
  data, lebar, warna, nama, warna2, nama2, labelLebar = 230, pesanKosong = 'Belum ada data.',
}: {
  data: BarisHorizontal[];
  lebar: number;
  warna: string; nama: string;
  warna2?: string; nama2?: string;
  labelLebar?: number;
  pesanKosong?: string;
}) {
  const adaSeri2 = !!warna2 && data.some((d) => (d.nilai2 ?? 0) > 0);
  const maks = batasAtasBulat(Math.max(0, ...data.map((d) => Math.max(d.nilai, d.nilai2 ?? 0))));
  const tinggiBatang = adaSeri2 ? 11 : 16;

  if (data.length === 0) {
    return <p style={{ margin: 0, padding: '14px 16px', background: LATAR, borderRadius: 10, fontSize: 13.5, color: REDUP, width: lebar, boxSizing: 'border-box', fontFamily: FONT }}>{pesanKosong}</p>;
  }

  const lajur = (nilai: number, warnaBatang: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: tinggiBatang + 2 }}>
      <div style={{ height: tinggiBatang, width: `${(nilai / maks) * 100}%`, minWidth: nilai > 0 ? 3 : 0, background: warnaBatang, borderRadius: 3 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: TEKS, lineHeight: 1 }}>{fmt(nilai)}</span>
    </div>
  );

  return (
    <div style={{ width: lebar, fontFamily: FONT }}>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: TEKS, marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: warna }} />{nama}
        </span>
        {adaSeri2 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: warna2 }} />{nama2}
          </span>
        )}
      </div>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: `1px solid ${GARIS}` }}>
          <div style={{ width: labelLebar, flexShrink: 0, fontSize: 12.5, lineHeight: 1.25, color: TEKS }}>
            {d.label}
            {d.tambahan && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: warna }}>{d.tambahan}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {lajur(d.nilai, warna)}
            {adaSeri2 && lajur(d.nilai2 ?? 0, warna2!)}
          </div>
        </div>
      ))}
    </div>
  );
}
