import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { gambarTren, type PabrikKanvas } from "./chart";
import { kelompokkan } from "./registri";
import { BULAN, labelRentang } from "./periode";
import type { BahanLaporan, Kartu, OpsiLaporanWord, Tabel } from "./types";
import { OPSI_WORD_DEFAULT } from "./types";

const FONT = "Arial";
/** Lebar isi halaman A4 (DXA): 11906 - margin kiri 1701 - margin kanan 1418. */
const LEBAR_ISI = 8787;
const INK = "10293A";
const TEAL = "0A7A78";
const TINT = "E0F0EF";
const TEPI = { style: BorderStyle.SINGLE, size: 4, color: "C9D6DA" };
const SEMUA_TEPI = { top: TEPI, bottom: TEPI, left: TEPI, right: TEPI };
const HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ---------- Bangunan dasar ---------- */

const teks = (t: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text: t, font: FONT, bold: o.bold, italics: o.italics, size: o.size, color: o.color });

function para(t: string, o: { rata?: (typeof AlignmentType)[keyof typeof AlignmentType]; italics?: boolean; color?: string; sesudah?: number; keepNext?: boolean } = {}) {
  return new Paragraph({
    alignment: o.rata ?? AlignmentType.JUSTIFIED,
    spacing: { after: o.sesudah ?? 120, line: 300 },
    keepNext: o.keepNext,
    children: [teks(t, { italics: o.italics, color: o.color })],
  });
}

const h1 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, pageBreakBefore: true, children: [new TextRun({ text: t, font: FONT })] });
const h2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const h3 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] });

const butir = (t: string) => new Paragraph({ numbering: { reference: "butir", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 288 }, children: [teks(t)] });
const nomor = (t: string, ref: string) => new Paragraph({ numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 288 }, children: [teks(t)] });
const subjudulKecil = (t: string) => new Paragraph({ spacing: { before: 120, after: 60 }, keepNext: true, children: [teks(t, { bold: true, size: 21 })] });

function sel(t: string, lebar: number, o: { header?: boolean; kanan?: boolean; tebal?: boolean; ukuran?: number; jaga?: boolean } = {}) {
  return new TableCell({
    width: { size: lebar, type: WidthType.DXA },
    borders: SEMUA_TEPI,
    shading: o.header ? { type: ShadingType.CLEAR, fill: TINT, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: o.kanan ? AlignmentType.RIGHT : AlignmentType.LEFT,
        keepNext: o.jaga,
        children: [teks(t, { bold: o.header || o.tebal, size: o.ukuran ?? 19, color: o.header ? INK : undefined })],
      }),
    ],
  });
}

function lebarKolom(bobot: number[]): number[] {
  const total = bobot.reduce((a, b) => a + b, 0);
  const l = bobot.map((b) => Math.floor((b / total) * LEBAR_ISI));
  l[l.length - 1] += LEBAR_ISI - l.reduce((a, b) => a + b, 0);
  return l;
}

/** Tabel kecil dijaga utuh dalam satu halaman; kolom Keterangan dibuang bila tidak ada satu pun catatan. */
function tabelKartu(kartu: Kartu[]) {
  const adaCatatan = kartu.some((k) => k.catatan);
  const l = adaCatatan ? lebarKolom([3, 1.8, 3.2]) : lebarKolom([6, 3]);
  const kepala = new TableRow({
    tableHeader: true,
    children: [sel("Indikator", l[0], { header: true, jaga: true }), sel("Nilai", l[1], { header: true, kanan: true, jaga: true }), ...(adaCatatan ? [sel("Keterangan", l[2], { header: true, jaga: true })] : [])],
  });
  return new Table({
    width: { size: LEBAR_ISI, type: WidthType.DXA },
    columnWidths: l,
    rows: [
      kepala,
      ...kartu.map((k, i) => {
        const jaga = i < kartu.length - 1;
        return new TableRow({
          cantSplit: true,
          children: [sel(k.label, l[0], { jaga }), sel(k.nilai, l[1], { kanan: true, tebal: true, jaga }), ...(adaCatatan ? [sel(k.catatan ?? "-", l[2], { jaga })] : [])],
        });
      }),
    ],
  });
}

function tabelData(t: Tabel) {
  const l = lebarKolom(t.lebar ?? t.kepala.map(() => 1));
  const kanan = new Set(t.kanan ?? []);
  return new Table({
    width: { size: LEBAR_ISI, type: WidthType.DXA },
    columnWidths: l,
    rows: [
      new TableRow({ tableHeader: true, children: t.kepala.map((k, i) => sel(k, l[i], { header: true, kanan: kanan.has(i), ukuran: 18 })) }),
      ...t.baris.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => sel(c, l[i], { kanan: kanan.has(i), ukuran: 18 })) })),
    ],
  });
}

const keterangan = (t: string, atasTabel: boolean) =>
  new Paragraph({ alignment: AlignmentType.CENTER, keepNext: atasTabel, spacing: { before: atasTabel ? 160 : 60, after: atasTabel ? 80 : 200 }, children: [teks(t, { italics: true, size: 19, color: "4A6472" })] });

/* ---------- Dokumen ---------- */

export async function rakitDocx(bahan: BahanLaporan, opsiParsial: Partial<OpsiLaporanWord>, pabrik: PabrikKanvas): Promise<Uint8Array> {
  const opsi: OpsiLaporanWord = { ...OPSI_WORD_DEFAULT, ...opsiParsial, penandatangan: { ...OPSI_WORD_DEFAULT.penandatangan, ...opsiParsial.penandatangan } };
  const rentang = labelRentang(bahan.tahun, bahan.bulanAkhir);
  const namaBulanAkhir = BULAN[bahan.bulanAkhir - 1];
  const hasil = bahan.hasil.filter((h) => !opsi.modulDikecualikan.includes(h.kunci));
  const kelompok = kelompokkan(hasil);

  /* ----- Sampul ----- */
  const sampul: Paragraph[] = [
    new Paragraph({ spacing: { before: 2600 }, alignment: AlignmentType.CENTER, children: [teks(opsi.judul, { bold: true, size: 52, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [teks(opsi.subjudul, { bold: true, size: 32, color: TEAL })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [teks(`Periode ${rentang}`, { size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3600 }, children: [teks(opsi.instansi.toUpperCase(), { bold: true, size: 26, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [teks("Kementerian Kesehatan Republik Indonesia", { size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [teks(String(bahan.tahun), { size: 24 })] }),
  ];

  /* ----- Daftar isi ----- */
  const daftarIsi: (Paragraph | TableOfContents)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [teks("DAFTAR ISI", { bold: true, size: 26 })] }),
    new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-3" }),
  ];

  /* ----- Bab I ----- */
  const bab1: Paragraph[] = [
    h1("BAB I PENDAHULUAN"),
    h2("A. Latar Belakang"),
    para(
      `${opsi.instansi} menyelenggarakan kegiatan surveilans kesehatan di pelabuhan dan bandar udara pada wilayah kerjanya. Laporan ini merangkum hasil kegiatan ${opsi.subjudul} selama periode ${rentang}, disusun dari data yang tercatat pada aplikasi EPIC-AI.`,
    ),
    para(`Data disajikan per bulan mulai Januari sampai ${namaBulanAkhir} ${bahan.tahun}, sehingga perkembangan dari bulan ke bulan dapat dibandingkan dan dijadikan dasar tindak lanjut.`),
    h2("B. Dasar Hukum"),
    ...opsi.dasarHukum.map((d) => nomor(d, "dasarhukum")),
    h2("C. Tujuan"),
    nomor(`Menyajikan capaian kegiatan surveilans selama periode ${rentang}.`, "tujuan"),
    nomor("Mengidentifikasi hal yang perlu diperhatikan dan ditindaklanjuti oleh tim kerja maupun pimpinan.", "tujuan"),
    h2("D. Ruang Lingkup"),
    para("Laporan ini mencakup modul-modul berikut pada aplikasi EPIC-AI:", { keepNext: true }),
    ...kelompok.flatMap((g) => [butir(`${g.kelompok}: ${g.item.map((h) => h.judul).join(", ")}.`)]),
  ];

  /* ----- Bab II ----- */
  const bab2: (Paragraph | Table)[] = [h1("BAB II HASIL KEGIATAN")];
  let noTabel = 0;
  let noGambar = 0;
  for (let gi = 0; gi < kelompok.length; gi++) {
    const g = kelompok[gi];
    bab2.push(h2(`${HURUF[gi] ?? gi + 1}. ${g.kelompok}`));
    for (let mi = 0; mi < g.item.length; mi++) {
      const h = g.item[mi];
      bab2.push(h3(`${mi + 1}. ${h.judul}`));
      if (h.status === "kosong") {
        bab2.push(para(`Belum ada data ${h.judul} untuk periode ${rentang}.`, { italics: true }));
        continue;
      }
      if (h.status === "gagal") {
        bab2.push(para("Data modul ini tidak dapat dimuat saat laporan dibuat, sehingga bagian ini perlu dilengkapi setelah laporan dibuat ulang.", { italics: true, color: "8F5B00" }));
        continue;
      }
      const d = h.data;
      bab2.push(para(`Ringkasan indikator ${d.judul} selama ${rentang}:`, { keepNext: true }));
      if (d.kartu.length > 0) {
        noTabel++;
        bab2.push(keterangan(`Tabel ${noTabel}. Indikator utama ${d.judul}`, true));
        bab2.push(tabelKartu(d.kartu));
        bab2.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      }
      if (d.tren) {
        const g2 = await gambarTren(d.tren, pabrik);
        const lebarPx = 580;
        noGambar++;
        bab2.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 120 },
            children: [new ImageRun({ type: "png", data: g2.png, transformation: { width: lebarPx, height: Math.round((lebarPx * g2.tinggi) / g2.lebar) }, altText: { title: d.judul, description: `Grafik ${d.tren.jenis} ${d.judul} Januari sampai ${namaBulanAkhir} ${bahan.tahun}`, name: `grafik-${d.kunci}` } })],
          }),
        );
        bab2.push(keterangan(`Gambar ${noGambar}. Tren bulanan ${d.judul}, Januari sampai ${namaBulanAkhir} ${bahan.tahun}`, false));
      }
      if (d.tabel) {
        noTabel++;
        bab2.push(keterangan(`Tabel ${noTabel}. Rincian ${d.judul}`, true));
        bab2.push(tabelData(d.tabel));
        bab2.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      }
      if (d.temuan && d.temuan.length > 0) {
        bab2.push(subjudulKecil("Hal yang perlu diperhatikan"));
        bab2.push(...d.temuan.map(butir));
      }
      if (d.narasi && d.narasi.length > 0) {
        bab2.push(subjudulKecil("Pembahasan"));
        bab2.push(...d.narasi.map((n) => para(n)));
      }
    }
  }

  /* ----- Bab III ----- */
  const semuaTemuan = hasil.flatMap((h) => (h.status === "ok" ? (h.data.temuan ?? []).map((t) => `${h.data.judul}: ${t}`) : []));
  const bab3: Paragraph[] = [
    h1("BAB III PEMBAHASAN DAN REKOMENDASI"),
    h2("A. Hal yang Perlu Diperhatikan"),
    ...(semuaTemuan.length > 0 ? semuaTemuan.map(butir) : [para(`Tidak ada hal yang ditandai otomatis dari data periode ${rentang}.`)]),
    h2("B. Catatan dan Rekomendasi Tim"),
    ...(opsi.catatan.length > 0 ? opsi.catatan.map((c) => nomor(c, "catatan")) : [para("Bagian ini diisi oleh Tim Kerja setelah pembahasan hasil pada Bab II.", { italics: true })]),
  ];

  /* ----- Bab IV + tanda tangan ----- */
  const p = opsi.penandatangan;
  const tanggal = opsi.tanggal ?? `............................ ${bahan.tahun}`;
  const geser = 4800;
  const ttd = (t: string, tebal = false) => new Paragraph({ indent: { left: geser }, children: [teks(t, { bold: tebal })] });
  const bab4: Paragraph[] = [
    h1("BAB IV PENUTUP"),
    para(`Demikian laporan ${opsi.subjudul} periode ${rentang} ini disusun sebagai bahan evaluasi dan tindak lanjut. Data pada laporan bersumber dari aplikasi EPIC-AI dan dapat berubah apabila terdapat pembaruan data pada bulan berikutnya.`),
    new Paragraph({ spacing: { before: 480 }, indent: { left: geser }, keepNext: true, children: [teks(`${opsi.kota}, ${tanggal}`)] }),
    new Paragraph({ indent: { left: geser }, keepNext: true, children: [teks(p.jabatan)] }),
    new Paragraph({ spacing: { before: 1300 }, indent: { left: geser }, keepNext: true, children: [teks(p.nama ?? "(...........................................)", { bold: !!p.nama })] }),
    ...(p.nip ? [ttd(`NIP. ${p.nip}`)] : []),
  ];

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9D6DA", space: 4 } },
        children: [teks(`${opsi.subjudul} | ${rentang}`, { size: 17, color: "4A6472" })],
      }),
    ],
  });
  const footer = new Footer({
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Halaman ", PageNumber.CURRENT], font: FONT, size: 18, color: "4A6472" })] })],
  });

  const halaman = { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1701, right: 1418 } };
  const rujukanNomor = (ref: string) => ({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 397 } } } }],
  });

  const doc = new Document({
    creator: "EPIC-AI",
    title: `${opsi.judul} ${opsi.subjudul} ${rentang}`,
    description: `${opsi.instansi}`,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, color: INK }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 22, bold: true, color: TEAL }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "butir", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
        rujukanNomor("dasarhukum"),
        rujukanNomor("tujuan"),
        rujukanNomor("catatan"),
      ],
    },
    sections: [
      { properties: { page: halaman }, children: sampul },
      {
        properties: { page: { ...halaman, pageNumbers: { start: 1 } } },
        headers: { default: header },
        footers: { default: footer },
        children: [...daftarIsi, ...bab1, ...bab2, ...bab3, ...bab4],
      },
    ],
  });

  return new Uint8Array(await Packer.toArrayBuffer(doc));
}
