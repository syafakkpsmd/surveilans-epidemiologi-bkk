// app/api/klinik/tb/export/xlsx/route.ts
// Perlu: npm install exceljs (sudah dipasang untuk HIV)

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getStatusAkses } from "@/lib/auth/getStatusAkses";
import { bolehAksesTabelKlinik } from "@/lib/auth/aksesKlinik";
import { getBarisTb, type BarisTb } from "@/lib/turso/queriesTb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// [label kolom, key di BarisTb] -- urutan sesuai form skrining TBC
const KOLOM: [string, keyof BarisTb][] = [
  ["Tanggal Pelaksanaan", "tanggal_pelaksanaan"], ["Nama Peserta", "nama_peserta"],
  ["Provinsi", "provinsi"], ["Kabupaten/Kota", "kabupaten_kota"], ["NIK", "nik"],
  ["Pekerjaan", "pekerjaan"], ["Tanggal Lahir", "tanggal_lahir"], ["Jenis Kelamin", "jenis_kelamin"],
  ["No. HP", "no_hp"], ["Riwayat Kontak TBC", "riwayat_kontak_tbc"], ["Jenis Kontak TBC", "jenis_kontak_tbc"],
  ["Pernah Terdiagnosa/Berobat TBC", "pernah_terdiagnosa_tbc"], ["Ket. Riwayat TBC", "keterangan_riwayat_tbc"],
  ["Kekurangan Gizi", "kekurangan_gizi"], ["Merokok", "merokok"], ["Perokok Pasif", "perokok_pasif"],
  ["Riwayat DM", "riwayat_dm"], ["ODHIV", "odhiv"], ["Lansia >65th", "lansia"], ["Ibu Hamil", "ibu_hamil"],
  ["Hasil Skrining Gejala TBC", "hasil_skrining_gejala"], ["Terduga TBC", "terduga_tbc"],
  ["Tindak Lanjut Pemeriksaan", "tindak_lanjut_pemeriksaan"], ["Fasyankes Pemeriksaan", "fasyankes_pemeriksaan"],
  ["No. Register SITB", "nomor_register_sitb"], ["Tgl Hasil Diagnosis", "tanggal_hasil_diagnosis"],
  ["Hasil Pemeriksaan Diagnosis", "hasil_pemeriksaan_diagnosis"],
  ["Jenis Pemeriksaan Diagnosis", "jenis_pemeriksaan_diagnosis"], ["Terkonfirmasi TBC", "terkonfirmasi_tbc"],
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

  const baris = await getBarisTb({ tahun, bulan, wilker });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data Skrining TBC");

  const headerRowValues = ["No", ...KOLOM.map(([l]) => l)];
  const jumlahKolom = headerRowValues.length;

  sheet.mergeCells(1, 1, 1, jumlahKolom);
  sheet.getCell(1, 1).value = "LAPORAN INDIVIDU HASIL SKRINING TBC";
  sheet.mergeCells(2, 1, 2, jumlahKolom);
  sheet.getCell(2, 1).value = "BALAI KEKARANTINAAN KESEHATAN KELAS I SAMARINDA";
  sheet.mergeCells(3, 1, 3, jumlahKolom);
  const labelPeriode = bulan ? `${NAMA_BULAN[bulan - 1]} ${tahun}` : `Tahun ${tahun}`;
  const labelLokasi = wilker ? `DI: ${wilker.toUpperCase()}` : "SELURUH WILAYAH KERJA";
  sheet.getCell(3, 1).value = `${labelLokasi} — ${labelPeriode}`;
  for (let r = 1; r <= 3; r++) {
    sheet.getCell(r, 1).font = { bold: true, size: r === 1 ? 13 : 11 };
    sheet.getCell(r, 1).alignment = { horizontal: "center" };
  }
  sheet.addRow([]);

  const headerRow = sheet.addRow(headerRowValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  baris.forEach((b, idx) => {
    const nilai = [idx + 1, ...KOLOM.map(([, key]) => b[key])];
    const row = sheet.addRow(nilai);
    row.eachCell((cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  sheet.addRow([]);
  sheet.addRow([]);
  const baseRow = sheet.rowCount + 1;
  sheet.getCell(baseRow, 1).value = "Mengetahui,";
  sheet.getCell(baseRow + 1, 1).value = "Ketua TIMKER";
  sheet.getCell(baseRow + 4, 1).value = namaKatimker;
  sheet.getCell(baseRow + 5, 1).value = nipKatimker ? `NIP ${nipKatimker}` : "";

  const kolomKanan = jumlahKolom - 3 > 0 ? jumlahKolom - 3 : jumlahKolom;
  sheet.getCell(baseRow, kolomKanan).value = "Pembuat Laporan";
  sheet.getCell(baseRow + 1, kolomKanan).value = "Penanggung Jawab Program TBC";
  sheet.getCell(baseRow + 4, kolomKanan).value = namaPetugas;
  sheet.getCell(baseRow + 5, kolomKanan).value = nipPetugas ? `NIP ${nipPetugas}` : "";

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = `data-tb_${wilker ?? "semua-wilker"}_${bulan ? NAMA_BULAN[bulan - 1] : "tahun"}-${tahun}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}