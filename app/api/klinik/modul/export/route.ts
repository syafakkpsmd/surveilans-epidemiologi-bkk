// app/api/klinik/modul/export/route.ts
//
// GET /api/klinik/modul/export?modul=...&tahun=...&bulan=...&wilker=...
//     &namaKatimker=...&nipKatimker=...&namaPetugas=...&nipPetugas=...
// Perlu: exceljs (sudah terpasang untuk HIV/TB)

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { MODUL_KLINIK } from "@/lib/klinik/modulTabelConfig";
import { bacaFilterModul, getBarisModul } from "@/lib/turso/queriesModulKlinik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const BORDER_TIPIS = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
} as const;

export async function GET(req: NextRequest) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehAksesTabelKlinik(role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const parsed = bacaFilterModul(params);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const cfg = MODUL_KLINIK[parsed.modul];
  const { tahun, bulan, wilker } = parsed.filter;

  const namaKatimker = params.get("namaKatimker") ?? "";
  const nipKatimker = params.get("nipKatimker") ?? "";
  const namaPetugas = params.get("namaPetugas") ?? "";
  const nipPetugas = params.get("nipPetugas") ?? "";

  const baris = await getBarisModul(parsed.modul, parsed.filter);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(cfg.judulHalaman.slice(0, 31));

  // Kolom "Wilayah Kerja" hanya muncul kalau tidak difilter 1 wilker (pola sama dengan HIV/TB)
  const labelKolom = cfg.kolom.map((k) => k.label);
  const headerValues = wilker
    ? ["No", ...labelKolom]
    : ["No", "Wilayah Kerja", ...labelKolom];
  const jumlahKolom = headerValues.length;

  // ---- Judul ----
  const labelPeriode = bulan ? `${NAMA_BULAN[bulan - 1]} ${tahun}` : `Tahun ${tahun}`;
  const labelWilker = wilker ? `DI: ${wilker.toUpperCase()}` : "SELURUH WILAYAH KERJA";
  const barisJudul = [
    cfg.judulLaporan,
    "BALAI KEKARANTINAAN KESEHATAN KELAS I SAMARINDA",
    `${labelWilker} — ${labelPeriode}`,
  ];
  barisJudul.forEach((teks, i) => {
    sheet.mergeCells(i + 1, 1, i + 1, jumlahKolom);
    const cell = sheet.getCell(i + 1, 1);
    cell.value = teks;
    cell.font = { bold: true, size: i === 0 ? 13 : 11 };
    cell.alignment = { horizontal: "center" };
  });
  sheet.addRow([]);

  // ---- Header tabel ----
  const headerRow = sheet.addRow(headerValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER_TIPIS;
  });

  // ---- Data ----
  baris.forEach((b, idx) => {
    const nilaiKolom = cfg.kolom.map((k) => b[k.key]);
    const nilai = wilker
      ? [idx + 1, ...nilaiKolom]
      : [idx + 1, b.wilker, ...nilaiKolom];
    const row = sheet.addRow(nilai);
    row.eachCell((cell) => {
      cell.border = BORDER_TIPIS;
    });
  });

  // Lebar kolom menyesuaikan panjang judul kolom (min 12, maks 40)
  sheet.columns.forEach((col, i) => {
    const label = headerValues[i] ?? "";
    col.width = i === 0 ? 6 : Math.min(40, Math.max(12, label.length + 4));
  });

  // ---- Blok tanda tangan ----
  sheet.addRow([]);
  sheet.addRow([]);
  const baseRow = sheet.rowCount + 1;
  sheet.getCell(baseRow, 1).value = "Mengetahui,";
  sheet.getCell(baseRow + 1, 1).value = "Ketua TIMKER";
  sheet.getCell(baseRow + 4, 1).value = namaKatimker;
  sheet.getCell(baseRow + 5, 1).value = nipKatimker ? `NIP ${nipKatimker}` : "";

  const kolomKanan = Math.max(3, jumlahKolom - 3);
  sheet.getCell(baseRow, kolomKanan).value = "Pembuat Laporan";
  sheet.getCell(baseRow + 1, kolomKanan).value = cfg.labelPJ;
  sheet.getCell(baseRow + 4, kolomKanan).value = namaPetugas;
  sheet.getCell(baseRow + 5, kolomKanan).value = nipPetugas ? `NIP ${nipPetugas}` : "";

  const buffer = await workbook.xlsx.writeBuffer();
  const potongNamaWilker = (wilker ?? "semua-wilker").replace(/[^\w.-]+/g, "-");
  const namaFile = `data-${cfg.slugFile}_${potongNamaWilker}_${bulan ? NAMA_BULAN[bulan - 1] : "tahun"}-${tahun}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}