"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { BatangMendatar, Donat, Slide, SlideBlok, Tren } from "@/lib/laporan-bulanan/types";

/**
 * Pratinjau dan mode presentasi. Tata letak meniru generator PPTX (lib/laporan-bulanan/ppt.ts):
 * kanvas tetap 1280 x 720 px (1 inci = 96 px) yang diskalakan mengikuti lebar wadah.
 */
const LEBAR = 1280;
const TINGGI = 720;
const MARGIN = 58;
const Y_MAKS = 658;

/** Ornamen pojok (gaya template Kemenkes). Samakan dengan ORN dan X_JUDUL di ppt.ts (inci x 96). */
const ORN = 106; // 1,1 inci
const X_JUDUL = 120; // 1,25 inci
const WM = 442; // watermark tengah: 4,6 inci

const C = { ink: "#10293A", soft: "#4A6472", paper: "#F2F5F5", surface: "#FFFFFF", line: "#D3DDE0", sea: "#0A7A78", ok: "#2A7A4B", warn: "#8F5B00", bad: "#B3362C" };
/** 10 warna supaya 7 wilayah kerja tidak ada yang kembar. Samakan dengan palet di ppt.ts. */
const PALET = ["#0A7A78", "#C9781F", "#10293A", "#6B8E9B", "#B3362C", "#2A7A4B", "#7A5C99", "#B8A24A", "#D98C8C", "#3F6FB5"];
const FONT = 'Calibri, "Carlito", "Segoe UI", Arial, sans-serif';
const LOGO_SAMPUL = ["/logo-kemenkesri.png", "/logo-bkk.png"];
const LOGO_HEADER = "/logo-header-transparan.png";
const ORNAMEN_KIRI_ATAS = "/ornamen-kiri-atas.png";
const ORNAMEN_KANAN_BAWAH = "/ornamen-kanan-bawah.png";
const ORNAMEN_TENGAH = "/ornamen-tengah.png";
const sembunyikan = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

const warnaNada = (n?: string): string => (n === "ok" ? C.ok : n === "warn" ? C.warn : n === "bad" ? C.bad : n === "muted" ? C.soft : C.ink);
const fmt = (v: unknown): string => (typeof v === "number" ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v) : String(v ?? ""));
const pendek = (s: string, maks: number): string => (s.length > maks ? `${s.slice(0, maks - 1).trimEnd()}…` : s);

function Grafik({ t, x, y, w, h }: { t: Tren; x: number; y: number; w: number; h: number }) {
  const data = t.label.map((l, i) => {
    const baris: Record<string, string | number | undefined> = { name: l };
    t.seri.forEach((s) => {
      baris[s.nama] = s.nilai[i] ?? undefined;
    });
    return baris;
  });
  const warna = (i: number) => (t.seri[i].warna ? `#${t.seri[i].warna}` : PALET[i % PALET.length]);
  const tunggal = t.seri.length === 1;
  const tumpuk = t.jenis === "batang" && !!t.tumpuk && !tunggal;
  const umum = { data, margin: { top: 26, right: 12, left: 0, bottom: 0 } };
  const fontLegenda = t.seri.length > 4 ? 13 : 14;
  const sumbu = (
    <>
      <CartesianGrid stroke={C.line} vertical={false} />
      <XAxis dataKey="name" tick={{ fill: C.soft, fontSize: 14, fontFamily: FONT }} tickLine={false} axisLine={{ stroke: C.soft }} />
      <YAxis domain={[t.sumbuY?.min ?? 0, t.sumbuY?.maks ?? "auto"]} tick={{ fill: C.soft, fontSize: 13, fontFamily: FONT }} tickLine={false} axisLine={false} width={56} tickFormatter={fmt} />
    </>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {t.satuan ? <div style={{ position: "absolute", left: 4, top: 0, fontSize: 13, color: C.soft }}>{t.satuan}</div> : null}
      <ResponsiveContainer width="100%" height="100%">
        {t.jenis === "batang" ? (
          <BarChart {...umum}>
            {sumbu}
            {t.seri.map((s, i) => (
              <Bar key={s.nama} dataKey={s.nama} fill={warna(i)} stackId={tumpuk ? "tumpuk" : undefined} isAnimationActive={false}>
                {tunggal && t.label.length <= 12 ? <LabelList dataKey={s.nama} position="top" formatter={fmt} style={{ fill: C.ink, fontSize: 13, fontFamily: FONT }} /> : null}
              </Bar>
            ))}
            {!tunggal ? <Legend verticalAlign="bottom" itemSorter={null} wrapperStyle={{ fontSize: fontLegenda, fontFamily: FONT }} /> : null}
          </BarChart>
        ) : (
          <LineChart {...umum}>
            {sumbu}
            {t.seri.map((s, i) => (
              <Line key={s.nama} type="linear" dataKey={s.nama} stroke={warna(i)} strokeWidth={3} dot={{ r: 5, fill: warna(i) }} isAnimationActive={false} connectNulls={false} />
            ))}
            {!tunggal ? <Legend verticalAlign="bottom" itemSorter={null} wrapperStyle={{ fontSize: fontLegenda, fontFamily: FONT }} /> : null}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function GrafikDonat({ d, x, y, w, h }: { d: Donat; x: number; y: number; w: number; h: number }) {
  const total = d.irisan.reduce((a, s) => a + s.nilai, 0);
  const warna = (i: number) => (d.irisan[i].warna ? `#${d.irisan[i].warna}` : PALET[i % PALET.length]);

  // Penyesuaian ukuran otomatis jika ruang tinggi terbatas
  const padat = h < 200;
  const tPie = padat ? Math.min(100, h - 22) : Math.min(130, h - 28);
  const wPie = Math.min(tPie, w * 0.38);

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, fontSize: padat ? 13 : 15, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {d.judul}
      </div>

      {/* Circle Pie Chart */}
      <div style={{ position: "absolute", left: 0, top: padat ? 18 : 24, width: wPie, height: tPie }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={d.irisan} dataKey="nilai" nameKey="label" innerRadius="52%" outerRadius="88%" stroke={C.paper} strokeWidth={2} isAnimationActive={false}>
              {d.irisan.map((_, i) => (
                <Cell key={i} fill={warna(i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: padat ? 13 : 16, fontWeight: 700, color: C.ink }}>{fmt(total)}</div>
          <div style={{ fontSize: 9, color: C.soft }}>total</div>
        </div>
      </div>

      {/* Legenda Kanan: label dan angka berdekatan, angka rata kanan antar baris */}
      <div
        style={{
          position: "absolute",
          left: wPie + 8,
          right: 0,
          top: padat ? 18 : 24,
          height: tPie,
          display: "grid",
          gridTemplateColumns: "max-content max-content",
          columnGap: 16,
          justifyContent: "start",
          alignContent: "center",
          alignItems: "center",
          fontSize: padat ? 11.5 : 13,
          color: C.ink,
        }}
      >
        {d.irisan.map((s, i) => (
          <Fragment key={s.label}>
            <div style={{ display: "flex", alignItems: "center", height: padat ? 18 : 22, whiteSpace: "nowrap" }}>
              <span style={{ width: 9, height: 9, background: warna(i), marginRight: 6, flexShrink: 0, borderRadius: 2 }} />
              <span>{s.label}</span>
            </div>
            <span style={{ fontWeight: 700, textAlign: "right" }}>{fmt(s.nilai)}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function GrafikBatangMendatar({ d, x, y, w, h }: { d: BatangMendatar; x: number; y: number; w: number; h: number }) {
  const data = d.item.map((it) => ({ name: pendek(it.label, 26), nilai: it.nilai }));
  const warna = d.warna ? `#${d.warna}` : C.sea;
  const atas = d.satuan ? 40 : 28;
  const kecil = h < 330;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 4, top: 0, right: 0, fontSize: 16, fontWeight: 700, color: C.ink }}>{d.judul}</div>
      {d.satuan ? <div style={{ position: "absolute", left: 4, top: 20, fontSize: 12, color: C.soft }}>{d.satuan}</div> : null}
      <div style={{ position: "absolute", left: 0, top: atas, width: w, height: h - atas }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }} barCategoryGap={kecil ? "10%" : "18%"}>
            <CartesianGrid stroke={C.line} horizontal={false} />
            <XAxis type="number" tick={{ fill: C.soft, fontSize: 12, fontFamily: FONT }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="name" width={140} interval={0} tick={{ fill: C.ink, fontSize: kecil ? 11 : 13, fontFamily: FONT }} tickLine={false} axisLine={{ stroke: C.soft }} />
            <Bar dataKey="nilai" fill={warna} isAnimationActive={false}>
              <LabelList dataKey="nilai" position="right" formatter={fmt} style={{ fill: C.ink, fontSize: 12, fontFamily: FONT }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Menggambar satu blok pada wilayah (x, y, w). Mengembalikan elemen dan posisi y berikutnya. */
function blok(b: SlideBlok, x: number, y: number, w: number, kunci: string, hProp?: number): [ReactNode, number] {
  const tersisa = Y_MAKS - y;

  if (b.tipe === "statistik") {
    const n = b.items.length;
    const gap = 19;
    const lebar = (w - gap * (n - 1)) / n;
    const h = 144;
    return [
      b.items.map((it, i) => {
        const bx = x + i * (lebar + gap);
        const warna = it.nada ? warnaNada(it.nada) : C.sea;
        return (
          <div key={`${kunci}-s${i}`} style={{ position: "absolute", left: bx, top: y, width: lebar, height: h, background: C.surface, border: `1px solid ${C.line}`, boxSizing: "border-box" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 7, height: h, background: warna }} />
            <div style={{ position: "absolute", left: 24, top: 10, right: 10, fontSize: 16, color: C.soft }}>{it.label}</div>
            <div style={{ position: "absolute", left: 24, top: 40, right: 10, fontSize: it.nilai.length > 10 ? 28 : 35, fontWeight: 700, color: it.nada ? warna : C.ink, whiteSpace: "nowrap", overflow: "hidden" }}>{it.nilai}</div>
            {it.catatan ? <div style={{ position: "absolute", left: 24, top: 100, right: 10, fontSize: 14, color: C.soft }}>{it.catatan}</div> : null}
          </div>
        );
      }),
      y + h + 24,
    ];
  }

  if (b.tipe === "tabel") {
    const padat = !!b.padat;
    const bobot = b.lebar ?? b.kepala.map(() => 1);
    const total = bobot.reduce((a, c) => a + c, 0);
    const kanan = new Set(b.kanan ?? []);
    const panjang = b.baris.some((r) => r.some((c) => c.length > 60));
    // Rumus tinggi ini harus sama dengan tinggiTabel() di buildSlides.ts.
    const tBaris = padat ? (panjang ? 46 : 30) : b.baris.length > 8 ? 35 : panjang ? 60 : 44;
    const tKepala = padat ? 34 : 40;
    const tJudul = b.judul ? 28 : 0;
    const sel = (i: number, kepala: boolean): CSSProperties => ({
      border: `1px solid ${C.line}`,
      padding: padat ? "2px 10px" : "4px 10px",
      textAlign: kanan.has(i) ? "right" : "left",
      fontSize: kepala ? (padat ? 15 : 16) : padat ? 14 : b.baris.length > 8 ? 14 : 15.5,
      fontWeight: kepala ? 700 : 400,
      color: kepala ? "#FFFFFF" : C.ink,
      background: kepala ? C.ink : C.surface,
      verticalAlign: "middle",
      overflow: "hidden",
    });
    return [
      <div key={`${kunci}-t`}>
        {b.judul ? <div style={{ position: "absolute", left: x, top: y, width: w, fontSize: 17, fontWeight: 700, color: C.ink }}>{b.judul}</div> : null}
        <table style={{ position: "absolute", left: x, top: y + tJudul, width: w, tableLayout: "fixed", borderCollapse: "collapse", fontFamily: FONT }}>
          <colgroup>{bobot.map((v, i) => <col key={i} style={{ width: `${(v / total) * 100}%` }} />)}</colgroup>
          <thead>
            <tr style={{ height: tKepala }}>{b.kepala.map((k, i) => <th key={i} style={sel(i, true)}>{k}</th>)}</tr>
          </thead>
          <tbody>
            {b.baris.map((r, ri) => (
              <tr key={ri} style={{ height: tBaris }}>{r.map((c, i) => <td key={i} style={sel(i, false)}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>,
      y + tJudul + tKepala + b.baris.length * tBaris + (padat ? 14 : 19),
    ];
  }

  if (b.tipe === "grafik") {
    const h = hProp ?? Math.max(180, Math.min(460, tersisa));
    return [<Grafik key={`${kunci}-g`} t={b} x={x} y={y} w={w} h={h} />, y + h + 10];
  }

  if (b.tipe === "donat") {
    // Batasi tinggi donat agar proporsional dan tidak membengkak
    const h = hProp ?? Math.min(220, Math.max(160, tersisa));
    return [<GrafikDonat key={`${kunci}-d`} d={b} x={x} y={y} w={w} h={h} />, y + h + 10];
  }
    if (b.tipe === "tumpuk") {
    const n = b.items.length;
    const jarak = 10;
    // Seluruh tinggi yang tersisa dibagi rata, sama seperti di ppt.ts (batasY - y).
    const hSatu = Math.floor((tersisa - jarak * (n - 1)) / n);
    const elemen: ReactNode[] = [];
    b.items.forEach((it, i) => {
      const [node] = blok(it, x, y + i * (hSatu + jarak), w, `${kunci}-tp${i}`, hSatu);
      elemen.push(<div key={i}>{node}</div>);
    });
    return [<div key={`${kunci}-tp`}>{elemen}</div>, y + n * hSatu + (n - 1) * jarak + 10];
  }

  // --- MULTIDONAT ---
  if ((b as any).tipe === "multidonat") {
    const list: Donat[] = (b as any).donatList || [];
    const n = list.length;
    const hTotal = hProp ?? tersisa;
    const hSatu = Math.floor((hTotal - (n - 1) * 12) / n);
    return [
      <div key={`${kunci}-md`}>
        {list.map((dItem, idx) => (
          <GrafikDonat
            key={`${kunci}-md-${idx}`}
            d={dItem}
            x={x}
            y={y + idx * (hSatu + 12)}
            w={w}
            h={hSatu}
          />
        ))}
      </div>,
      y + hTotal + 10,
    ];
  }

  if (b.tipe === "batang_mendatar") {
    const h = hProp ?? Math.min(240, Math.max(180, tersisa));
    return [<GrafikBatangMendatar key={`${kunci}-bm`} d={b} x={x} y={y} w={w} h={h} />, y + h + 10];
  }

  if (b.tipe === "poin") {
    const lebar = w > 860;
    const total = b.items.reduce((a, t) => a + t.length, 0);
    const ukuran = lebar ? 26.7 : total > 420 ? 16 : total > 300 ? 17.3 : 18.7;
    const h = lebar ? Math.min(460, b.items.length * 60 + 20) : Math.max(230, Math.min(460, tersisa));
    return [
      <ul key={`${kunci}-p`} style={{ position: "absolute", left: x, top: y, width: w, height: h, margin: 0, padding: "0 0 0 24px", listStyleType: "disc", fontSize: ukuran, color: C.ink, overflow: "hidden" }}>
        {b.items.map((t, i) => <li key={i} style={{ marginBottom: lebar ? 10 : 8, lineHeight: 1.25 }}>{t}</li>)}
      </ul>,
      y + h + 10,
    ];
  }

  if (b.tipe === "dua_kolom") {
    const gap = 29;
    const wKiri = (w - gap) * b.rasioKiri;

    // Jika kolom berupa tabel, ukur tinggi tabel untuk menyelaraskan tinggi elemen di kanannya
    let hKhusus: number | undefined;
    if (b.kiri.tipe === "tabel") {
      const padat = !!b.kiri.padat;
      const tBaris = padat ? 30 : 44;
      const tKepala = padat ? 34 : 40;
      const tJudul = b.kiri.judul ? 28 : 0;
      hKhusus = tJudul + tKepala + b.kiri.baris.length * tBaris;
    }

    const [kiri, y1] = blok(b.kiri, x, y, wKiri, `${kunci}-k`);
    const [kanan, y2] = blok(b.kanan, x + wKiri + gap, y, w - gap - wKiri, `${kunci}-r`, hKhusus);
    return [<div key={`${kunci}-dk`}>{kiri}{kanan}</div>, Math.max(y1, y2)];
  }

  return [<div key={`${kunci}-x`} style={{ position: "absolute", left: x, top: y, width: w, fontSize: 26.7, color: warnaNada(b.nada) }}>{b.teks}</div>, y + 96];
}

interface Props {
  slide: Slide;
  /** Nomor tampil (mulai 1). */
  nomor: number;
  periodeLabel: string;
  style?: CSSProperties;
}

export default function SlideView({ slide, nomor, periodeLabel, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSkala(e.contentRect.width / LEBAR));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sampul = slide.tipe === "sampul";
  const teksSampul = slide.blok.find((b) => b.tipe === "teks");

  let isi: ReactNode;
  if (sampul) {
    isi = (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, width: 34, height: TINGGI, background: C.sea }} />
        <div style={{ position: "absolute", left: 96, top: 200, width: 1090, height: 165, display: "flex", alignItems: "flex-end", fontSize: 58, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>{slide.judul}</div>
        {slide.subjudul ? <div style={{ position: "absolute", left: 96, top: 380, width: 1090, fontSize: 35, color: "#9FD6D3" }}>{slide.subjudul}</div> : null}
        {teksSampul && teksSampul.tipe === "teks" ? <div style={{ position: "absolute", left: 96, top: 566, width: 680, fontSize: 21, color: "#C7D6DC" }}>{teksSampul.teks}</div> : null}
        <div style={{ position: "absolute", left: 797, top: 494, width: 422, height: 163, display: "flex", alignItems: "center", justifyContent: "center", gap: 29 }}>
          {LOGO_SAMPUL.map((src) => (
            <img key={src} src={src} alt="" onError={sembunyikan} style={{ height: 120, maxWidth: 190, width: "auto", objectFit: "contain" }} />
          ))}
        </div>
      </>
    );
  } else {
    let y = slide.subjudul ? 158 : 110;
    const elemen: ReactNode[] = [];
    slide.blok.forEach((b, i) => {
      const [node, yBaru] = blok(b, MARGIN, y, LEBAR - MARGIN * 2, `b${i}`);
      elemen.push(<div key={i}>{node}</div>);
      y = yBaru;
    });
    isi = (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, width: LEBAR, height: 12, background: C.sea }} />

        {/* Watermark tengah (paling belakang) */}
        <img src={ORNAMEN_TENGAH} alt="" onError={sembunyikan} style={{ position: "absolute", left: "50%", top: "50%", width: WM, height: "auto", transform: "translate(-50%, -50%)" }} />

        {/* Ornamen pojok: kiri atas dan kanan bawah (di belakang isi) */}
        <img src={ORNAMEN_KIRI_ATAS} alt="" onError={sembunyikan} style={{ position: "absolute", left: 0, top: 0, width: ORN, height: "auto" }} />
        <img src={ORNAMEN_KANAN_BAWAH} alt="" onError={sembunyikan} style={{ position: "absolute", right: 0, bottom: 0, width: ORN, height: "auto" }} />

        <div style={{ position: "absolute", left: X_JUDUL, top: 30, width: LEBAR - X_JUDUL - MARGIN - 300, height: 68, fontSize: 40, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slide.judul}</div>
        <img src={LOGO_HEADER} alt="" onError={sembunyikan} style={{ position: "absolute", right: MARGIN, top: 28, height: 40, maxWidth: 280, width: "auto", objectFit: "contain" }} />
        {slide.subjudul ? <div style={{ position: "absolute", left: X_JUDUL, top: 98, width: LEBAR - X_JUDUL - MARGIN, fontSize: 19, color: C.soft }}>{slide.subjudul}</div> : null}
        {elemen}
        <div style={{ position: "absolute", left: MARGIN, top: 672, fontSize: 13, color: C.soft }}>EPIC-AI | BKK Kelas I Samarinda | {periodeLabel}</div>
        <div style={{ position: "absolute", right: ORN + 29, top: 672, fontSize: 13, color: C.soft }}>{nomor}</div>
      </>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: sampul ? C.ink : C.paper, fontFamily: FONT, ...style }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: LEBAR, height: TINGGI, transform: `scale(${skala})`, transformOrigin: "top left" }}>{isi}</div>
    </div>
  );
}