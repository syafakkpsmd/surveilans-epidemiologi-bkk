// app/api/klinik/hiv/export/pdf/route.ts
//
// Perlu: npm install pdfkit
//        npm install --save-dev @types/pdfkit
//
// Parameter query sama persis dengan route Excel.

import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getBarisHivVct } from "@/lib/turso/queriesHivVct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// [label, lebar dalam pt] -- landscape A4 lebarnya ~842pt, dikurangi margin
const KOLOM_TANPA_WILKER: [string, number][] = [
  ["No", 24], ["NIK", 70], ["Nama", 80], ["Sex", 28], ["Tgl Lahir", 55],
  ["Alamat", 110], ["Status Kawin", 55], ["Tgl Kegiatan", 55],
  ["Kunjungan", 50], ["Hasil", 45], ["Jenis Reagen", 55], ["Hub. Beresiko", 55],
];
const KOLOM_DENGAN_WILKER: [string, number][] = [
  ["No", 22], ["Wilker", 55], ["NIK", 65], ["Nama", 75], ["Sex", 24], ["Tgl Lahir", 50],
  ["Alamat", 90], ["Status Kawin", 50], ["Tgl Kegiatan", 50],
  ["Kunjungan", 45], ["Hasil", 40], ["Jenis Reagen", 48], ["Hub. Beresiko", 48],
];

export async function GET(req: NextRequest) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const tahun = Number(params.get("tahun"));
  if (!tahun) {
    return NextResponse.json({ error: "Parameter tahun wajib diisi" }, { status: 400 });
  }
  const bulanParam = params.get("bulan");
  const bulan = bulanParam && bulanParam !== "semua" ? Number(bulanParam) : undefined;
  const wilkerParam = params.get("wilker");
  const wilker = wilkerParam && wilkerParam !== "semua" ? wilkerParam : undefined;

  const namaKatimker = params.get("namaKatimker") ?? "";
  const nipKatimker = params.get("nipKatimker") ?? "";
  const namaPetugas = params.get("namaPetugas") ?? "";
  const nipPetugas = params.get("nipPetugas") ?? "";

  const baris = await getBarisHivVct({ tahun, bulan, wilker });
  const kolom = wilker ? KOLOM_TANPA_WILKER : KOLOM_DENGAN_WILKER;

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const labelPeriode = bulan ? `${NAMA_BULAN[bulan - 1]} ${tahun}` : `Tahun ${tahun}`;
  const labelWilker = wilker ? `DI: ${wilker.toUpperCase()}` : "SELURUH WILAYAH KERJA";

  function gambarJudulDanHeader() {
    doc.fontSize(13).font("Helvetica-Bold").text("DATA INDIVIDU MOBILE VCT PP HIV", { align: "center" });
    doc.fontSize(11).text("BALAI KEKARANTINAAN KESEHATAN KELAS I SAMARINDA", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`${labelWilker} — ${labelPeriode}`, { align: "center" });
    doc.moveDown(0.8);
  }

  function gambarHeaderTabel(): number {
    const startX = doc.page.margins.left;
    let x = startX;
    const y = doc.y;
    doc.fontSize(7).font("Helvetica-Bold");
    kolom.forEach(([label, lebar]) => {
      doc.rect(x, y, lebar, 24).stroke();
      doc.text(label, x + 2, y + 2, { width: lebar - 4, height: 20 });
      x += lebar;
    });
    doc.y = y + 24;
    return y;
  }

  gambarJudulDanHeader();
  gambarHeaderTabel();
  doc.font("Helvetica").fontSize(7);

  const tinggiBaris = 16;
  baris.forEach((b, idx) => {
    if (doc.y + tinggiBaris > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      gambarJudulDanHeader();
      gambarHeaderTabel();
      doc.font("Helvetica").fontSize(7);
    }

    const nilai = wilker
      ? [String(idx + 1), b.nik, b.nama, b.sex, b.tanggal_lahir, b.alamat, b.status_perkawinan, b.tanggal_kegiatan, b.kunjungan, b.hasil, b.jenis_reagen, b.hubungan_beresiko]
      : [String(idx + 1), b.wilker, b.nik, b.nama, b.sex, b.tanggal_lahir, b.alamat, b.status_perkawinan, b.tanggal_kegiatan, b.kunjungan, b.hasil, b.jenis_reagen, b.hubungan_beresiko];

    let x = doc.page.margins.left;
    const y = doc.y;
    kolom.forEach(([, lebar], i) => {
      doc.rect(x, y, lebar, tinggiBaris).stroke();
      doc.text(nilai[i] ?? "", x + 2, y + 2, { width: lebar - 4, height: tinggiBaris - 4, ellipsis: true });
      x += lebar;
    });
    doc.y = y + tinggiBaris;
  });

  // ---- Blok tanda tangan ----
  if (doc.y + 90 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  doc.moveDown(2);
  const yTtd = doc.y;
  doc.fontSize(9).font("Helvetica");
  doc.text("Mengetahui,", doc.page.margins.left, yTtd);
  doc.text("Ketua TIMKER 4", doc.page.margins.left, yTtd + 14);
  doc.moveDown(4);
  doc.text(namaKatimker, doc.page.margins.left, yTtd + 70);
  if (nipKatimker) doc.text(`NIP ${nipKatimker}`, doc.page.margins.left, yTtd + 84);

  const xKanan = doc.page.width - doc.page.margins.right - 220;
  doc.text("Pembuat Laporan", xKanan, yTtd);
  doc.text("Penanggung Jawab Program Mobile VCT", xKanan, yTtd + 14);
  doc.text(namaPetugas, xKanan, yTtd + 70);
  if (nipPetugas) doc.text(`NIP ${nipPetugas}`, xKanan, yTtd + 84);

  doc.end();

  const buffer: Buffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const namaFile = `data-hiv-vct_${wilker ?? "semua-wilker"}_${bulan ? NAMA_BULAN[bulan - 1] : "tahun"}-${tahun}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}