// app/api/klinik/hiv/export/xlsx/route.ts
//
// Perlu: npm install exceljs
//
// Contoh pemanggilan dari client:
// /api/klinik/hiv/export/xlsx?tahun=2026&bulan=2&wilker=Samarinda
//   &namaKatimker=...&nipKatimker=...&namaPetugas=...&nipPetugas=...
// (bulan diisi "semua" atau dihilangkan untuk unduh 1 tahun penuh)
// (wilker diisi "semua" atau dihilangkan untuk unduh semua wilayah kerja)

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getBarisHivVct } from "@/lib/turso/queriesHivVct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const HEADER_TABEL = [
  "No", "NIK", "Nama", "Sex", "Tgl. Lahir", "Alamat", "Status Perkawinan",
  "Tanggal Kegiatan", "Kunjungan", "Hasil", "Jenis Reagen", "Hubungan Beresiko",
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data HIV VCT");

  const jumlahKolom = wilker ? HEADER_TABEL.length : HEADER_TABEL.length + 1; // +1 kolom Wilayah Kerja kalau gabungan

  // ---- Judul ----
  sheet.mergeCells(1, 1, 1, jumlahKolom);
  sheet.getCell(1, 1).value = "DATA INDIVIDU MOBILE VCT PP HIV";
  sheet.mergeCells(2, 1, 2, jumlahKolom);
  sheet.getCell(2, 1).value = "BALAI KEKARANTINAAN KESEHATAN KELAS I SAMARINDA";
  sheet.mergeCells(3, 1, 3, jumlahKolom);
  const labelPeriode = bulan ? `${NAMA_BULAN[bulan - 1]} ${tahun}` : `Tahun ${tahun}`;
  const labelWilker = wilker ? `DI: ${wilker.toUpperCase()}` : "SELURUH WILAYAH KERJA";
  sheet.getCell(3, 1).value = `${labelWilker} — ${labelPeriode}`;
  for (let r = 1; r <= 3; r++) {
    sheet.getCell(r, 1).font = { bold: true, size: r === 1 ? 13 : 11 };
    sheet.getCell(r, 1).alignment = { horizontal: "center" };
  }
  sheet.addRow([]);

  // ---- Header tabel ----
  const headerRowValues = wilker
    ? HEADER_TABEL
    : [...HEADER_TABEL.slice(0, 1), "Wilayah Kerja", ...HEADER_TABEL.slice(1)];
  const headerRow = sheet.addRow(headerRowValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // ---- Data ----
  baris.forEach((b, idx) => {
    const nilai = wilker
      ? [idx + 1, b.nik, b.nama, b.sex, b.tanggal_lahir, b.alamat, b.status_perkawinan, b.tanggal_kegiatan, b.kunjungan, b.hasil, b.jenis_reagen, b.hubungan_beresiko]
      : [idx + 1, b.wilker, b.nik, b.nama, b.sex, b.tanggal_lahir, b.alamat, b.status_perkawinan, b.tanggal_kegiatan, b.kunjungan, b.hasil, b.jenis_reagen, b.hubungan_beresiko];
    const row = sheet.addRow(nilai);
    row.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });

  sheet.columns.forEach((col, i) => {
    col.width = i === 5 ? 28 : 16; // kolom Alamat sedikit lebih lebar
  });

  // ---- Blok tanda tangan ----
  sheet.addRow([]);
  sheet.addRow([]);
  const baseRow = sheet.rowCount + 1;
  sheet.getCell(baseRow, 1).value = "Mengetahui,";
  sheet.getCell(baseRow + 1, 1).value = `Ketua TIMKER`;
  sheet.getCell(baseRow + 4, 1).value = namaKatimker;
  sheet.getCell(baseRow + 5, 1).value = nipKatimker ? `NIP ${nipKatimker}` : "";

  const kolomKanan = jumlahKolom - 3;
  sheet.getCell(baseRow, kolomKanan).value = "Pembuat Laporan";
  sheet.getCell(baseRow + 1, kolomKanan).value = "Penanggung Jawab Program Mobile VCT";
  sheet.getCell(baseRow + 4, kolomKanan).value = namaPetugas;
  sheet.getCell(baseRow + 5, kolomKanan).value = nipPetugas ? `NIP ${nipPetugas}` : "";

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `data-hiv-vct_${wilker ?? "semua-wilker"}_${bulan ? NAMA_BULAN[bulan - 1] : "tahun"}-${tahun}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}