import PptxGenJS from "pptxgenjs";
import type { Slide, SlideBlok, Tren } from "./types";

/** Palet sama dengan tampilan "Laporan rapat bulanan" di Spectra AI. */
const C = {
  ink: "10293A",
  soft: "4A6472",
  paper: "F2F5F5",
  surface: "FFFFFF",
  line: "D3DDE0",
  sea: "0A7A78",
  ok: "2A7A4B",
  warn: "8F5B00",
  bad: "B3362C",
};
const PALET = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B"];
const FONT = "Calibri";
const W = 13.333;
const MARGIN = 0.6;
const Y_MAKS = 6.85;
const GARIS: PptxGenJS.BorderProps = { type: "solid", pt: 0.5, color: C.line };

const warnaNada = (n?: string): string => (n === "ok" ? C.ok : n === "warn" ? C.warn : n === "bad" ? C.bad : n === "muted" ? C.soft : C.ink);

function dataGrafik(t: Tren) {
  return t.seri.map((se) => {
    let n = se.nilai.length;
    while (n > 0 && se.nilai[n - 1] == null) n--;
    // Grafik garis: bulan tanpa data dibiarkan kosong (terputus), bukan digambar sebagai nol.
    // Grafik batang: bulan tanpa data digambar sebagai 0.
    const nilai = se.nilai.slice(0, n).map((v) => (v == null ? (t.jenis === "garis" ? null : 0) : v));
    return { name: se.nama, labels: t.label.slice(0, n), values: nilai as number[] };
  });
}

/** Menggambar satu blok pada wilayah (x, y, w) dan mengembalikan posisi y berikutnya. */
function gambarBlok(pptx: PptxGenJS, s: PptxGenJS.Slide, b: SlideBlok, x: number, y: number, w: number): number {
  const tersisa = Y_MAKS - y;

  if (b.tipe === "statistik") {
    const n = b.items.length;
    const gap = 0.2;
    const lebar = (w - gap * (n - 1)) / n;
    const h = 1.5;
    b.items.forEach((it, i) => {
      const bx = x + i * (lebar + gap);
      s.addShape(pptx.ShapeType.rect, { x: bx, y, w: lebar, h, fill: { color: C.surface }, line: { color: C.line, width: 1 } });
      s.addShape(pptx.ShapeType.rect, { x: bx, y, w: 0.07, h, fill: { color: it.nada ? warnaNada(it.nada) : C.sea }, line: { type: "none" } });
      s.addText(it.label, { x: bx + 0.25, y: y + 0.1, w: lebar - 0.35, h: 0.32, fontFace: FONT, fontSize: 12, color: C.soft, isTextBox: true, margin: 0 });
      s.addText(it.nilai, { x: bx + 0.25, y: y + 0.44, w: lebar - 0.35, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: it.nada ? warnaNada(it.nada) : C.ink, fit: "shrink", isTextBox: true, margin: 0 });
      if (it.catatan) s.addText(it.catatan, { x: bx + 0.25, y: y + 1.05, w: lebar - 0.35, h: 0.4, fontFace: FONT, fontSize: 10.5, color: C.soft, valign: "top", isTextBox: true, margin: 0 });
    });
    return y + h + 0.25;
  }

  if (b.tipe === "tabel") {
    const skala = w / (b.lebar ?? b.kepala.map(() => 1)).reduce((a, c) => a + c, 0);
    const colW = (b.lebar ?? b.kepala.map(() => 1)).map((v) => v * skala);
    const kanan = new Set(b.kanan ?? []);
    const opsiSel = (i: number, header: boolean) => ({
      fontFace: FONT,
      fontSize: header ? 12 : b.baris.length > 8 ? 10.5 : 11.5,
      bold: header,
      color: header ? "FFFFFF" : C.ink,
      align: (kanan.has(i) ? "right" : "left") as "right" | "left",
      valign: "middle" as const,
      fill: { color: header ? C.ink : C.surface },
      border: [GARIS, GARIS, GARIS, GARIS] as [PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps],
      margin: [b.baris.length > 8 ? 0.02 : 0.05, 0.1, b.baris.length > 8 ? 0.02 : 0.05, 0.1] as [number, number, number, number],
    });
    const rows = [b.kepala.map((h, i) => ({ text: h, options: opsiSel(i, true) })), ...b.baris.map((r) => r.map((c, i) => ({ text: c, options: opsiSel(i, false) })))];
    const tinggi = b.baris.length > 8 ? 0.36 : b.baris.some((r) => r.some((c) => c.length > 60)) ? 0.62 : 0.46;
    s.addTable(rows, { x, y, w, colW, rowH: [0.42, ...b.baris.map(() => tinggi)] });
    return y + 0.42 + b.baris.length * tinggi + 0.2;
  }

  if (b.tipe === "grafik") {
    const data = dataGrafik(b);
    const h = Math.max(2.4, Math.min(4.8, tersisa));
    const banyakSeri = b.seri.length;
    const umum = {
      x,
      y,
      w,
      h,
      chartColors: b.seri.map((se, i) => se.warna ?? PALET[i % PALET.length]),
      showLegend: banyakSeri > 1,
      legendPos: "b" as const,
      legendFontFace: FONT,
      legendFontSize: 11,
      catAxisLabelFontFace: FONT,
      catAxisLabelFontSize: 11,
      catAxisLabelColor: C.soft,
      valAxisLabelFontFace: FONT,
      valAxisLabelFontSize: 10,
      valAxisLabelColor: C.soft,
      valAxisLabelFormatCode: "#,##0",
      valGridLine: { color: C.line, size: 0.5 },
      catGridLine: { style: "none" as const },
      showValAxisTitle: !!b.satuan,
      valAxisTitle: b.satuan ?? "",
      valAxisTitleFontSize: 10,
      valAxisTitleColor: C.soft,
      ...(b.sumbuY?.min != null ? { valAxisMinVal: b.sumbuY.min } : {}),
      ...(b.sumbuY?.maks != null ? { valAxisMaxVal: b.sumbuY.maks } : {}),
    };
    if (b.jenis === "batang") {
      s.addChart(pptx.ChartType.bar, data, {
        ...umum,
        barDir: "col",
        barGrouping: "clustered",
        barGapWidthPct: 60,
        showValue: banyakSeri === 1 && b.label.length <= 12,
        dataLabelFontFace: FONT,
        dataLabelFontSize: 10,
        dataLabelColor: C.ink,
        dataLabelPosition: "outEnd",
        dataLabelFormatCode: "#,##0",
      });
    } else {
      s.addChart(pptx.ChartType.line, data, { ...umum, lineSize: 3, lineDataSymbolSize: 7, displayBlanksAs: "gap" });
    }
    return y + h + 0.1;
  }

  if (b.tipe === "poin") {
    const lebar = w > 9;
    const total = b.items.reduce((a, t) => a + t.length, 0);
    const ukuran = lebar ? 20 : total > 420 ? 12 : total > 300 ? 13 : 14;
    const h = lebar ? Math.min(4.8, b.items.length * 0.62 + 0.2) : Math.max(2.4, Math.min(4.8, tersisa));
    s.addText(
      b.items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < b.items.length - 1, paraSpaceAfter: lebar ? 8 : 6 } })),
      { x, y, w, h, fontFace: FONT, fontSize: ukuran, color: C.ink, valign: "top", isTextBox: true, margin: 0 },
    );
    return y + h + 0.1;
  }

  if (b.tipe === "dua_kolom") {
    const gap = 0.3;
    const wKiri = (w - gap) * b.rasioKiri;
    const y1 = gambarBlok(pptx, s, b.kiri, x, y, wKiri);
    const y2 = gambarBlok(pptx, s, b.kanan, x + wKiri + gap, y, w - gap - wKiri);
    return Math.max(y1, y2);
  }

  s.addText(b.teks, { x, y, w, h: 0.9, fontFace: FONT, fontSize: 20, color: warnaNada(b.nada), valign: "top", isTextBox: true, margin: 0 });
  return y + 1;
}

export async function rakitPptx(slides: Slide[], meta: { periode: string; judul: string }): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "EPIC-AI - BKK Kelas I Samarinda";
  pptx.company = "Balai Kekarantinaan Kesehatan Kelas I Samarinda";
  pptx.title = `${meta.judul} ${meta.periode}`;

  slides.forEach((sl, idx) => {
    const s = pptx.addSlide();
    if (sl.tipe === "sampul") {
      s.background = { color: C.ink };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.sea }, line: { type: "none" } });
      s.addText(sl.judul, { x: 1, y: 2.3, w: 11, h: 1.5, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", valign: "bottom", fit: "shrink", isTextBox: true });
      if (sl.subjudul) s.addText(sl.subjudul, { x: 1, y: 3.9, w: 11, h: 0.6, fontFace: FONT, fontSize: 26, color: "9FD6D3", isTextBox: true });
      const teks = sl.blok.find((b) => b.tipe === "teks");
      if (teks && teks.tipe === "teks") s.addText(teks.teks, { x: 1, y: 5.9, w: 11, h: 0.5, fontFace: FONT, fontSize: 16, color: "C7D6DC", isTextBox: true });
      return;
    }
    s.background = { color: C.paper };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: C.sea }, line: { type: "none" } });
    s.addText(sl.judul, { x: MARGIN, y: 0.35, w: W - MARGIN * 2, h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: C.ink, fit: "shrink", isTextBox: true });
    let y = 1.15;
    if (sl.subjudul) {
      s.addText(sl.subjudul, { x: MARGIN, y: 1.02, w: W - MARGIN * 2, h: 0.4, fontFace: FONT, fontSize: 14, color: C.soft, isTextBox: true });
      y = 1.65;
    }
    for (const b of sl.blok) y = gambarBlok(pptx, s, b, MARGIN, y, W - MARGIN * 2);
    s.addText(`EPIC-AI | BKK Kelas I Samarinda | ${meta.periode}`, { x: MARGIN, y: 7.0, w: 9, h: 0.3, fontFace: FONT, fontSize: 10, color: C.soft, isTextBox: true });
    s.addText(String(idx + 1), { x: W - MARGIN - 1, y: 7.0, w: 1, h: 0.3, fontFace: FONT, fontSize: 10, color: C.soft, align: "right", isTextBox: true });
  });

  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}
