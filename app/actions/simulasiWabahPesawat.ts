"use server";

import { randomUUID } from "node:crypto";
import { getPengguna } from "@/lib/auth/session";
import { getDbClient } from "@/lib/db/client";
import { keJson, parseKolomJson } from "@/lib/db/json";
import {
  estimasiKontakEratPesawat,
  estimasiRisikoGroundCrew,
  buatRekomendasiKebijakanPesawat,
} from "@/lib/sir/model";

export async function jalankanSimulasiWabahPesawat(input: {
  kegiatanPesawatId?: string;
  kodeWilker: string;
  nomorPenerbangan?: string;
  tanggalKejadian: string;
  kategoriPenyakitId: number;
  totalPenumpang: number;
  totalKru: number;
  jumlahBergejala: number;
  radiusKontakBaris: number;
  durasiPenerbanganJam: number;
  jumlahGroundCrew: number;
  penggunaanApdPersen: number;
  daftarKotaTujuanLanjutan?: { kota: string; jumlahPenumpang: number }[];
}) {
  const user = await getPengguna();
  if (!user) throw new Error("Harus login");

  if (!["admin", "petugas"].includes(user.role)) {
    throw new Error("Hanya admin/petugas yang bisa menjalankan simulasi");
  }

  const db = getDbClient();

  const { rows: [parameterPenyakit] } = await db.execute({
    sql: "SELECT * FROM referensi_parameter_penyakit WHERE id = ? LIMIT 1",
    args: [input.kategoriPenyakitId],
  });

  if (!parameterPenyakit) {
    throw new Error("Kategori penyakit tidak ditemukan");
  }

  const totalOrang = input.totalPenumpang + input.totalKru;

  const { estimasiKontakErat } = estimasiKontakEratPesawat({
    totalPenumpang: totalOrang,
    jumlahBergejala: input.jumlahBergejala,
    radiusKontakBaris: input.radiusKontakBaris,
  });

  const risikoGroundCrew = estimasiRisikoGroundCrew({
    jumlahGroundCrew: input.jumlahGroundCrew,
    durasiKontakJam: input.durasiPenerbanganJam,
    penggunaanApdPersen: input.penggunaanApdPersen,
    jumlahBergejala: input.jumlahBergejala,
    totalPenumpang: totalOrang,
    r0: parameterPenyakit.r0_default,
    serialIntervalHari: parameterPenyakit.serial_interval_hari,
  });

  const rekomendasi = buatRekomendasiKebijakanPesawat({
    estimasiKontakErat,
    estimasiGroundCrewTerinfeksi: risikoGroundCrew.estimasiGroundCrewTerinfeksi,
    masaInkubasiHari: parameterPenyakit.masa_inkubasi_hari ?? 14,
    adaKotaTujuanLanjutan: (input.daftarKotaTujuanLanjutan?.length ?? 0) > 0,
  });

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO simulasi_wabah_pesawat
            (id, kegiatan_pesawat_id, kode_wilker, nomor_penerbangan, tanggal_kejadian,
             kategori_penyakit_id, total_penumpang, total_kru, jumlah_bergejala,
             radius_kontak_baris, durasi_penerbangan_jam, jumlah_ground_crew,
             penggunaan_apd_persen, estimasi_kontak_erat, daftar_kota_tujuan_lanjutan,
             risiko_ground_crew, rekomendasi_kebijakan, dibuat_oleh)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.kegiatanPesawatId ?? null,
      input.kodeWilker,
      input.nomorPenerbangan ?? null,
      input.tanggalKejadian,
      input.kategoriPenyakitId,
      input.totalPenumpang,
      input.totalKru,
      input.jumlahBergejala,
      input.radiusKontakBaris,
      input.durasiPenerbanganJam,
      input.jumlahGroundCrew,
      input.penggunaanApdPersen,
      estimasiKontakErat,
      keJson(input.daftarKotaTujuanLanjutan ?? []),
      keJson(risikoGroundCrew),
      rekomendasi,
      user.id,
    ],
  });

  const { rows: [hasilTersimpan] } = await db.execute({
    sql: "SELECT * FROM simulasi_wabah_pesawat WHERE id = ?",
    args: [id],
  });

  return parseKolomJson(hasilTersimpan, ["daftar_kota_tujuan_lanjutan", "risiko_ground_crew"]);
}