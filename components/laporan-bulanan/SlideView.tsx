"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Slide, SlideBlok, Tren } from "@/lib/laporan-bulanan/types";

/**
 * Pratinjau dan mode presentasi. Tata letak meniru generator PPTX (lib/laporan-bulanan/ppt.ts):
 * kanvas tetap 1280 x 720 px (1 inci = 96 px) yang diskalakan mengikuti lebar wadah.
 */
const LEBAR = 1280;
const TINGGI = 720;
const MARGIN = 58;
const Y_MAKS = 658;

const C = { ink: "#10293A", soft: "#4A6472", paper: "#F2F5F5", surface: "#FFFFFF", line: "#D3DDE0", sea: "#0A7A78", ok: "#2A7A4B", warn: "#8F5B00", bad: "#B3362C" };
const PALET = ["#0A7A78", "#C9781F", "#10293A", "#6B8E9B", "#B3362C", "#2A7A4B"];
const FONT = 'Calibri, "Carlito", "Segoe UI", Arial, sans-serif';

const warnaNada = (n?: string): string => (n === "ok" ? C.ok : n === "warn" ? C.warn : n === "bad" ? C.bad : n === "muted" ? C.soft : C.ink);
const fmt = (v: unknown): string => (typeof v === "number" ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v) : String(v ?? ""));

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
  const umum = { data, margin: { top: 26, right: 12, left: 0, bottom: 0 } };
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
              <Bar key={s.nama} dataKey={s.nama} fill={warna(i)} isAnimationActive={false}>
                {tunggal && t.label.length <= 12 ? <LabelList dataKey={s.nama} position="top" formatter={fmt} style={{ fill: C.ink, fontSize: 13, fontFamily: FONT }} /> : null}
              </Bar>
            ))}
            {!tunggal ? <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 14, fontFamily: FONT }} /> : null}
          </BarChart>
        ) : (
          <LineChart {...umum}>
            {sumbu}
            {t.seri.map((s, i) => (
              <Line key={s.nama} type="linear" dataKey={s.nama} stroke={warna(i)} strokeWidth={3} dot={{ r: 5, fill: warna(i) }} isAnimationActive={false} connectNulls={false} />
            ))}
            {!tunggal ? <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 14, fontFamily: FONT }} /> : null}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Menggambar satu blok pada wilayah (x, y, w). Mengembalikan elemen dan posisi y berikutnya. */
function blok(b: SlideBlok, x: number, y: number, w: number, kunci: string): [ReactNode, number] {
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
    const bobot = b.lebar ?? b.kepala.map(() => 1);
    const total = bobot.reduce((a, c) => a + c, 0);
    const kanan = new Set(b.kanan ?? []);
    const panjang = b.baris.some((r) => r.some((c) => c.length > 60));
    const tBaris = b.baris.length > 8 ? 35 : panjang ? 60 : 44;
    const sel = (i: number, kepala: boolean): CSSProperties => ({
      border: `1px solid ${C.line}`,
      padding: "4px 10px",
      textAlign: kanan.has(i) ? "right" : "left",
      fontSize: kepala ? 16 : b.baris.length > 8 ? 14 : 15.5,
      fontWeight: kepala ? 700 : 400,
      color: kepala ? "#FFFFFF" : C.ink,
      background: kepala ? C.ink : C.surface,
      verticalAlign: "middle",
      overflow: "hidden",
    });
    return [
      <table key={`${kunci}-t`} style={{ position: "absolute", left: x, top: y, width: w, tableLayout: "fixed", borderCollapse: "collapse", fontFamily: FONT }}>
        <colgroup>{bobot.map((v, i) => <col key={i} style={{ width: `${(v / total) * 100}%` }} />)}</colgroup>
        <thead>
          <tr style={{ height: 40 }}>{b.kepala.map((k, i) => <th key={i} style={sel(i, true)}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {b.baris.map((r, ri) => (
            <tr key={ri} style={{ height: tBaris }}>{r.map((c, i) => <td key={i} style={sel(i, false)}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>,
      y + 40 + b.baris.length * tBaris + 19,
    ];
  }

  if (b.tipe === "grafik") {
    const h = Math.max(230, Math.min(460, tersisa));
    return [<Grafik key={`${kunci}-g`} t={b} x={x} y={y} w={w} h={h} />, y + h + 10];
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
    const [kiri, y1] = blok(b.kiri, x, y, wKiri, `${kunci}-k`);
    const [kanan, y2] = blok(b.kanan, x + wKiri + gap, y, w - gap - wKiri, `${kunci}-r`);
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
        {teksSampul && teksSampul.tipe === "teks" ? <div style={{ position: "absolute", left: 96, top: 566, width: 1090, fontSize: 21, color: "#C7D6DC" }}>{teksSampul.teks}</div> : null}
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
        <div style={{ position: "absolute", left: MARGIN, top: 30, width: LEBAR - MARGIN * 2, height: 68, fontSize: 40, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slide.judul}</div>
        {slide.subjudul ? <div style={{ position: "absolute", left: MARGIN, top: 98, width: LEBAR - MARGIN * 2, fontSize: 19, color: C.soft }}>{slide.subjudul}</div> : null}
        {elemen}
        <div style={{ position: "absolute", left: MARGIN, top: 672, fontSize: 13, color: C.soft }}>EPIC-AI | BKK Kelas I Samarinda | {periodeLabel}</div>
        <div style={{ position: "absolute", right: MARGIN, top: 672, fontSize: 13, color: C.soft }}>{nomor}</div>
      </>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: sampul ? C.ink : C.paper, fontFamily: FONT, ...style }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: LEBAR, height: TINGGI, transform: `scale(${skala})`, transformOrigin: "top left" }}>{isi}</div>
    </div>
  );
}
