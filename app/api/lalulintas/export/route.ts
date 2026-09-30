// app/api/lalulintas/export/route.ts
//
// GET /api/lalulintas/export?tab=...&tahun=...&granularitas=mingguan|bulanan
//     &awal=...&akhir=...&wilker=...&namaKatimker=...&nipKatimker=...&namaPetugas=...&nipPetugas=...
// Perlu: exceljs (sudah terpasang untuk modul klinik lain)
//
// Dikunci: hanya role Petugas/Petugas Klinik/Admin yang boleh unduh
// (lihat lib/auth/aksesLaluLintas.ts). Melihat pratinjau tetap publik,
// lihat route preview.

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehUnduhLaluLintas } from "@/lib/auth/aksesLaluLintas";
import { ambilTabLaluLintas } from "@/lib/lalulintas/config";
import { getPenumpangKapalMentah } from "@/lib/turso/queriesPenumpangKapal";
import { getAbkKapal, type SumberAbkKapal } from "@/lib/supabase/queriesAbkKapal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BORDER_TIPIS = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
} as const;

function bacaFilter(params: URLSearchParams) {
  const tahun = Number(params.get("tahun"));
  const granularitas = params.get("granularitas") === "bulanan" ? "bulanan" : "mingguan";
  const awal = Number(params.get("awal")) || 1;
  const akhir = Number(params.get("akhir")) || (granularitas === "bulanan" ? 12 : 53);
  const wilkerParam = params.get("wilker");
  const wilker = wilkerParam && wilkerParam !== "semua" ? wilkerParam : undefined;
  return { tahun, granularitas: granularitas as "mingguan" | "bulanan", awal, akhir, wilker };
}

function tulisJudulDanTtd(
  sheet: ExcelJS.Worksheet,
  judulLaporan: string,
  labelPeriode: string,
  labelWilker: string,
  jumlahKolom: number,
  namaKatimker: string,
  nipKatimker: string,
  namaPetugas: string,
  nipPetugas: string
) {
  const barisJudul = [
    judulLaporan,
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
}

function tulisBlokTtd(sheet: ExcelJS.Worksheet, jumlahKolom: number, namaKatimker: string, nipKatimker: string, namaPetugas: string, nipPetugas: string) {
  sheet.addRow([]);
  sheet.addRow([]);
  const baseRow = sheet.rowCount + 1;
  sheet.getCell(baseRow, 1).value = "Mengetahui,";
  sheet.getCell(baseRow + 1, 1).value = "Ketua TIMKER";
  sheet.getCell(baseRow + 4, 1).value = namaKatimker;
  sheet.getCell(baseRow + 5, 1).value = nipKatimker ? `NIP ${nipKatimker}` : "";

  const kolomKanan = Math.max(3, jumlahKolom - 3);
  sheet.getCell(baseRow, kolomKanan).value = "Pembuat Laporan";
  sheet.getCell(baseRow + 1, kolomKanan).value = "Penanggung Jawab";
  sheet.getCell(baseRow + 4, kolomKanan).value = namaPetugas;
  sheet.getCell(baseRow + 5, kolomKanan).value = nipPetugas ? `NIP ${nipPetugas}` : "";
}

export async function GET(req: NextRequest) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || !bolehUnduhLaluLintas(role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const tab = ambilTabLaluLintas(params.get("tab"));
  if (!tab) return NextResponse.json({ error: "Parameter tab tidak dikenal" }, { status: 400 });

  const filter = bacaFilter(params);
  if (!filter.tahun) return NextResponse.json({ error: "Parameter tahun wajib diisi" }, { status: 400 });

  const namaKatimker = params.get("namaKatimker") ?? "";
  const nipKatimker = params.get("nipKatimker") ?? "";
  const namaPetugas = params.get("namaPetugas") ?? "";
  const nipPetugas = params.get("nipPetugas") ?? "";

  const labelPeriode =
    filter.granularitas === "bulanan"
      ? `Tahun ${filter.tahun}, Bulan ${filter.awal}-${filter.akhir}`
      : `Tahun ${filter.tahun}, Minggu ${filter.awal}-${filter.akhir}`;
  const labelWilker = filter.wilker ? `DI: ${filter.wilker.toUpperCase()}` : "SELURUH WILAYAH KERJA";

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tab.judulHalaman.slice(0, 31));

  if (tab.key === "penumpang-kapal") {
    const baris = await getPenumpangKapalMentah(filter);
    const header = ["No", "Wilayah Kerja", "Tanggal Tiba", "Tanggal Berangkat", "Nama Kapal", "ABK Datang", "ABK Berangkat", "Penumpang Datang", "Penumpang Berangkat", "SIAOS", "Keterangan"];
    tulisJudulDanTtd(sheet, tab.judulLaporan, labelPeriode, labelWilker, header.length, namaKatimker, nipKatimker, namaPetugas, nipPetugas);

    const headerRow = sheet.addRow(header);
    headerRow.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = BORDER_TIPIS;
    });

    baris.forEach((b, idx) => {
      const row = sheet.addRow([
        idx + 1, b.wilker, b.tanggal_tiba, b.tanggal_berangkat, b.nama_kapal,
        b.abk_datang, b.abk_berangkat, b.penumpang_datang, b.penumpang_berangkat, b.siaos, b.keterangan,
      ]);
      row.eachCell((c) => (c.border = BORDER_TIPIS));
    });

    sheet.columns.forEach((col, i) => (col.width = i === 4 ? 24 : 14));
    tulisBlokTtd(sheet, header.length, namaKatimker, nipKatimker, namaPetugas, nipPetugas);
  } else {
    const baris = await getAbkKapal(tab.key as SumberAbkKapal, filter);
    const header = ["No", "Tanggal", "Nama Kapal", "Bendera", "Jumlah ABK", "Hasil Pemeriksaan", "Keterangan"];
    tulisJudulDanTtd(sheet, tab.judulLaporan, labelPeriode, labelWilker, header.length, namaKatimker, nipKatimker, namaPetugas, nipPetugas);

    const headerRow = sheet.addRow(header);
    headerRow.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = BORDER_TIPIS;
    });

    baris.forEach((b, idx) => {
      const row = sheet.addRow([idx + 1, b.tanggal, b.nama_kapal, b.bendera, b.jumlah_abk, b.hasil_pemeriksaan, b.keterangan]);
      row.eachCell((c) => (c.border = BORDER_TIPIS));
    });

    sheet.columns.forEach((col, i) => (col.width = i === 2 ? 24 : 16));
    tulisBlokTtd(sheet, header.length, namaKatimker, nipKatimker, namaPetugas, nipPetugas);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const bagianWilker = filter.wilker ? `_${filter.wilker.replace(/[^\w.-]+/g, "-")}` : "";
  const namaFile = `${tab.key}${bagianWilker}_${filter.tahun}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}