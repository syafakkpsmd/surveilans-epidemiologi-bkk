import PptxGenJS from "pptxgenjs";
import fs from "node:fs";
import path from "node:path";
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
/** 10 warna; harus sama dengan PALET di SlideView.tsx. */
const PALET = ["0A7A78", "C9781F", "10293A", "6B8E9B", "B3362C", "2A7A4B", "7A5C99", "B8A24A", "D98C8C", "3F6FB5"];
const FONT = "Calibri";
const W = 13.333;
const MARGIN = 0.6;
const Y_MAKS = 6.85;
/** Ornamen pojok (gaya template Kemenkes): lebar ornamen dan posisi awal judul di kanan ornamen kiri atas (inci). */
const ORN = 1.1;
const X_JUDUL = 1.25;
/** Watermark ornamen di tengah slide (lebar, inci). */
const WM = 4.6;
const GARIS: PptxGenJS.BorderProps = { type: "solid", pt: 0.5, color: C.line };

const warnaNada = (n?: string): string => (n === "ok" ? C.ok : n === "warn" ? C.warn : n === "bad" ? C.bad : n === "muted" ? C.soft : C.ink);
const pendek = (s: string, maks: number): string => (s.length > maks ? `${s.slice(0, maks - 1).trimEnd()}…` : s);
const fmtId = (v: number): string => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v);

type Logo = { data: string; rasio: number };

/** Membaca logo PNG dari folder public; null jika file tidak ada. */
function muatLogo(nama: string): Logo | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", nama));
    const rasio = buf.readUInt32BE(16) / buf.readUInt32BE(20); // lebar / tinggi dari header PNG
    return { data: `image/png;base64,${buf.toString("base64")}`, rasio };
  } catch {
    return null;
  }
}

/** Menggambar deret logo rata kanan mulai dari xKanan. */
function gambarLogo(s: PptxGenJS.Slide, logos: Logo[], xKanan: number, y: number, h: number, gap: number) {
  let x = xKanan;
  for (const l of [...logos].reverse()) {
    const w = h * l.rasio;
    x -= w;
    s.addImage({ data: l.data, x, y, w, h });
    x -= gap;
  }
}

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
function gambarBlok(pptx: PptxGenJS, s: PptxGenJS.Slide, b: SlideBlok, x: number, y: number, w: number, batasY: number = Y_MAKS): number {
  const tersisa = batasY - y;

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
    const padat = !!b.padat;
    const skala = w / (b.lebar ?? b.kepala.map(() => 1)).reduce((a, c) => a + c, 0);
    const colW = (b.lebar ?? b.kepala.map(() => 1)).map((v) => v * skala);
    const kanan = new Set(b.kanan ?? []);
    const panjang = b.baris.some((r) => r.some((c) => c.length > 60));
    // Tinggi (inci) harus sejalan dengan SlideView (px / 96) dan tinggiTabel() di slides.ts.
    const tinggi = padat ? (panjang ? 0.48 : 0.31) : b.baris.length > 8 ? 0.36 : panjang ? 0.62 : 0.46;
    const tKepala = padat ? 0.35 : 0.42;
    const tJudul = b.judul ? 0.29 : 0;
    const rapat = padat || b.baris.length > 8;
    const opsiSel = (i: number, header: boolean) => ({
      fontFace: FONT,
      fontSize: header ? (padat ? 11 : 12) : padat ? 10.5 : b.baris.length > 8 ? 10.5 : 11.5,
      bold: header,
      color: header ? "FFFFFF" : C.ink,
      align: (kanan.has(i) ? "right" : "left") as "right" | "left",
      valign: "middle" as const,
      fill: { color: header ? C.ink : C.surface },
      border: [GARIS, GARIS, GARIS, GARIS] as [PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps],
      margin: [rapat ? 0.02 : 0.05, 0.1, rapat ? 0.02 : 0.05, 0.1] as [number, number, number, number],
    });
    if (b.judul) s.addText(b.judul, { x, y, w, h: tJudul, fontFace: FONT, fontSize: 13, bold: true, color: C.ink, valign: "top", isTextBox: true, margin: 0 });
    const rows = [b.kepala.map((h, i) => ({ text: h, options: opsiSel(i, true) })), ...b.baris.map((r) => r.map((c, i) => ({ text: c, options: opsiSel(i, false) })))];
    s.addTable(rows, { x, y: y + tJudul, w, colW, rowH: [tKepala, ...b.baris.map(() => tinggi)] });
    return y + tJudul + tKepala + b.baris.length * tinggi + (padat ? 0.15 : 0.2);
  }

  if (b.tipe === "grafik") {
    const data = dataGrafik(b);
    const h = Math.max(2.4, Math.min(4.8, tersisa));
    const banyakSeri = b.seri.length;
    const tumpuk = b.jenis === "batang" && !!b.tumpuk && banyakSeri > 1;
    const umum = {
      x,
      y,
      w,
      h,
      chartColors: b.seri.map((se, i) => se.warna ?? PALET[i % PALET.length]),
      showLegend: banyakSeri > 1,
      legendPos: "b" as const,
      legendFontFace: FONT,
      legendFontSize: banyakSeri > 4 ? 10 : 11,
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
        barGrouping: tumpuk ? "stacked" : "clustered",
        barGapWidthPct: banyakSeri > 1 ? 40 : 60,
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

  if (b.tipe === "donat") {
    const h = Math.max(2.3, Math.min(5, tersisa));
    const total = b.irisan.reduce((a, it) => a + it.nilai, 0);
    // Tinggi terbatas (di bawah tabel): total digabung ke judul dan legenda di kanan.
    const kecil = h < 3.4;
    const atas = kecil ? 0.32 : 0.55;
    s.addText(kecil ? `${b.judul} (total ${fmtId(total)})` : b.judul, { x, y, w, h: 0.3, fontFace: FONT, fontSize: 13, bold: true, color: C.ink, valign: "top", isTextBox: true, margin: 0 });
    if (!kecil) s.addText(`Total: ${fmtId(total)}`, { x, y: y + 0.28, w, h: 0.25, fontFace: FONT, fontSize: 10, color: C.soft, valign: "top", isTextBox: true, margin: 0 });
    s.addChart(
      pptx.ChartType.doughnut,
      [{ name: b.judul, labels: b.irisan.map((it) => it.label), values: b.irisan.map((it) => it.nilai) }],
      {
        x,
        y: y + atas,
        w,
        h: h - atas,
        holeSize: 58,
        chartColors: b.irisan.map((it, i) => it.warna ?? PALET[i % PALET.length]),
        showLegend: true,
        legendPos: kecil ? "r" : "b",
        legendFontFace: FONT,
        legendFontSize: 12,
        showPercent: true,
        showValue: false,
        showLabel: false,
        dataLabelColor: "FFFFFF",
        dataLabelFontFace: FONT,
        dataLabelFontSize: 12,
        dataLabelFormatCode: "0%",
      },
    );
    return y + h + 0.1;
  }

  if (b.tipe === "batang_mendatar") {
    const h = Math.max(2.3, Math.min(5, tersisa));
    const atas = b.satuan ? 0.48 : 0.31;
    s.addText(b.judul, { x, y, w, h: 0.3, fontFace: FONT, fontSize: 13, bold: true, color: C.ink, valign: "top", isTextBox: true, margin: 0 });
    if (b.satuan) s.addText(b.satuan, { x, y: y + 0.26, w, h: 0.22, fontFace: FONT, fontSize: 10, color: C.soft, valign: "top", isTextBox: true, margin: 0 });
    // PowerPoint menggambar kategori dari bawah ke atas, jadi urutan dibalik agar yang terbesar berada di atas.
    const item = [...b.item].reverse();
    s.addChart(
      pptx.ChartType.bar,
      [{ name: b.satuan ?? "Jumlah", labels: item.map((it) => pendek(it.label, 26)), values: item.map((it) => it.nilai) }],
      {
        x,
        y: y + atas,
        w,
        h: h - atas,
        barDir: "bar",
        barGrouping: "clustered",
        barGapWidthPct: 40,
        chartColors: [b.warna ?? C.sea],
        showLegend: false,
        showValue: true,
        dataLabelFontFace: FONT,
        dataLabelFontSize: 10,
        dataLabelColor: C.ink,
        dataLabelPosition: "outEnd",
        dataLabelFormatCode: "#,##0",
        catAxisLabelFontFace: FONT,
        catAxisLabelFontSize: 10.5,
        catAxisLabelColor: C.ink,
        valAxisLabelFontFace: FONT,
        valAxisLabelFontSize: 10,
        valAxisLabelColor: C.soft,
        valAxisLabelFormatCode: "#,##0",
        valGridLine: { color: C.line, size: 0.5 },
        catGridLine: { style: "none" },
      },
    );
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
    if (b.tipe === "tumpuk") {
    const n = b.items.length;
    const jarak = 0.1;
    const tinggi = (batasY - y - jarak * (n - 1)) / n;
    let yi = y;
    for (const it of b.items) {
      gambarBlok(pptx, s, it, x, yi, w, yi + tinggi);
      yi += tinggi + jarak;
    }
    return yi - jarak;
  }

    if (b.tipe === "dua_kolom") {
    const gap = 0.3;
    const wKiri = (w - gap) * b.rasioKiri;
    const y1 = gambarBlok(pptx, s, b.kiri, x, y, wKiri, batasY);
    const y2 = gambarBlok(pptx, s, b.kanan, x + wKiri + gap, y, w - gap - wKiri, batasY);
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

  // Halaman judul: logo Kemenkes RI + BKK. Slide lainnya: logo header infografis.
  const logosSampul = [muatLogo("logo-kemenkesri.png"), muatLogo("logo-bkk.png")].filter((l): l is Logo => l !== null);
  const logoHeader = muatLogo("logo-header-transparan.png");
  const ornKiriAtas = muatLogo("ornamen-kiri-atas.png");
  const ornKananBawah = muatLogo("ornamen-kanan-bawah.png");
  const ornTengah = muatLogo("ornamen-tengah.png");

  slides.forEach((sl, idx) => {
    const s = pptx.addSlide();
    if (sl.tipe === "sampul") {
      s.background = { color: C.ink };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.sea }, line: { type: "none" } });
      s.addText(sl.judul, { x: 1, y: 2.3, w: 11, h: 1.5, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", valign: "bottom", fit: "shrink", isTextBox: true });
      if (sl.subjudul) s.addText(sl.subjudul, { x: 1, y: 3.9, w: 11, h: 0.6, fontFace: FONT, fontSize: 26, color: "9FD6D3", isTextBox: true });
      const teks = sl.blok.find((b) => b.tipe === "teks");
      if (teks && teks.tipe === "teks") s.addText(teks.teks, { x: 1, y: 5.9, w: 7, h: 0.5, fontFace: FONT, fontSize: 16, color: "C7D6DC", isTextBox: true });
      if (logosSampul.length > 0) {
        const px = 8.3, py = 5.15, pw = 4.4, ph = 1.7, gap = 0.3;
        const sumRasio = logosSampul.reduce((a, l) => a + l.rasio, 0);
        const h = Math.min(1.25, (4.0 - gap * (logosSampul.length - 1)) / sumRasio);
        const total = h * sumRasio + gap * (logosSampul.length - 1);
        gambarLogo(s, logosSampul, px + (pw + total) / 2, py + (ph - h) / 2, h, gap);
      }
      return;
    }
    s.background = { color: C.paper };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: C.sea }, line: { type: "none" } });

    // Watermark tengah (paling belakang)
    if (ornTengah) {
      const hWm = WM / ornTengah.rasio;
      s.addImage({ data: ornTengah.data, x: (W - WM) / 2, y: (7.5 - hWm) / 2, w: WM, h: hWm });
    }

    // Ornamen pojok kiri atas dan kanan bawah (diletakkan paling awal agar berada di belakang isi)
    if (ornKiriAtas) s.addImage({ data: ornKiriAtas.data, x: 0, y: 0, w: ORN, h: ORN / ornKiriAtas.rasio });
    if (ornKananBawah) {
      const hOrn = ORN / ornKananBawah.rasio;
      s.addImage({ data: ornKananBawah.data, x: W - ORN, y: 7.5 - hOrn, w: ORN, h: hOrn });
    }

    // Logo header kanan atas; lebar judul dipersempit agar tidak bertabrakan
    const hHeader = 0.42;
    const wHeader = logoHeader ? Math.min(hHeader * logoHeader.rasio, 3.0) : 0;
    s.addText(sl.judul, { x: X_JUDUL, y: 0.35, w: W - X_JUDUL - MARGIN - (wHeader > 0 ? wHeader + 0.3 : 0), h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: C.ink, fit: "shrink", isTextBox: true });
    if (logoHeader) {
      s.addImage({ data: logoHeader.data, x: W - MARGIN - wHeader, y: 0.3, w: wHeader, h: wHeader / logoHeader.rasio });
    }

    let y = 1.15;
    if (sl.subjudul) {
      s.addText(sl.subjudul, { x: X_JUDUL, y: 1.02, w: W - X_JUDUL - MARGIN, h: 0.4, fontFace: FONT, fontSize: 14, color: C.soft, isTextBox: true });
      y = 1.65;
    }
    for (const b of sl.blok) y = gambarBlok(pptx, s, b, MARGIN, y, W - MARGIN * 2);
    s.addText(`EPIC-AI | BKK Kelas I Samarinda | ${meta.periode}`, { x: MARGIN, y: 7.0, w: 9, h: 0.3, fontFace: FONT, fontSize: 10, color: C.soft, isTextBox: true });
    s.addText(String(idx + 1), { x: W - ORN - 0.3 - 1, y: 7.0, w: 1, h: 0.3, fontFace: FONT, fontSize: 10, color: C.soft, align: "right", isTextBox: true });
  });

  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}