"use server";

import { randomUUID } from "node:crypto";
import { getPengguna } from "@/lib/auth/session";
import { getDbClient } from "@/lib/db/client";
import { keJson, parseKolomJson } from "@/lib/db/json";
import {
  simulasiKapal,
  estimasiRisikoTkbm,
  estimasiRisikoPetugas,
  hitungRisikoRelatifKota,
  buatRekomendasiKebijakan,
} from "@/lib/sir/model";

export async function jalankanSimulasiWabahKapal(input: {
  kegiatanCopId?: string;
  wilayahKerja: string;
  namaKapal: string;
  tanggalKejadian: string;
  kategoriPenyakitId: number;
  totalAbk: number;
  abkBergejala: number;
  r0Override?: number;
  efektivitasIsolasiPersen: number;
  jumlahTkbm: number;
  durasiKontakJam: number;
  penggunaanApdPersen: number;
  jumlahPetugasKesehatan: number;
  jumlahPetugasNonKesehatan: number;
  durasiKontakPetugasJam: number;
  daftarKotaTujuanLanjutan?: { kota: string; jumlahAbk: number }[];
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

  const hasilKapal = simulasiKapal({
    totalAbk: input.totalAbk,
    abkBergejala: input.abkBergejala,
    parameterPenyakit: {
      r0Default: parameterPenyakit.r0_default,
      serialIntervalHari: parameterPenyakit.serial_interval_hari,
    },
    r0Override: input.r0Override,
    efektivitasIsolasiPersen: input.efektivitasIsolasiPersen,
  });

  const risikoTkbm = estimasiRisikoTkbm({
    jumlahTkbm: input.jumlahTkbm,
    durasiKontakJam: input.durasiKontakJam,
    penggunaanApdPersen: input.penggunaanApdPersen,
    iSaatKontak: input.abkBergejala,
    totalAbk: input.totalAbk,
    beta: hasilKapal.betaDipakai,
  });

  const risikoPetugas = estimasiRisikoPetugas({
    jumlahPetugasKesehatan: input.jumlahPetugasKesehatan,
    jumlahPetugasNonKesehatan: input.jumlahPetugasNonKesehatan,
    durasiKontakJam: input.durasiKontakPetugasJam,
    penggunaanApdPersen: 80,
    iSaatKontak: input.abkBergejala,
    totalPopulasiSumber: input.totalAbk,
    beta: hasilKapal.betaDipakai,
  });

  const { rows: [populasiWilker] } = await db.execute({
    sql: `SELECT populasi_kota_sekitar FROM referensi_populasi_wilker
           WHERE jenis_wilker = 'Pelabuhan' AND wilayah_kerja = ? LIMIT 1`,
    args: [input.wilayahKerja],
  });

  const risikoRelatifKota = hitungRisikoRelatifKota(
    risikoTkbm.estimasiTkbmTerinfeksi +
      risikoPetugas.estimasiPetugasKesehatanTerinfeksi +
      risikoPetugas.estimasiPetugasNonKesehatanTerinfeksi,
    populasiWilker?.populasi_kota_sekitar
  );

  const rekomendasi = buatRekomendasiKebijakan({
    rEfektifDenganIsolasi: hasilKapal.rEfektifDenganIsolasi,
    rEfektifTanpaIsolasi: hasilKapal.rEfektifTanpaIsolasi,
    estimasiTkbmTerinfeksi: risikoTkbm.estimasiTkbmTerinfeksi,
    estimasiPetugasKesehatanTerinfeksi: risikoPetugas.estimasiPetugasKesehatanTerinfeksi,
    estimasiPetugasNonKesehatanTerinfeksi: risikoPetugas.estimasiPetugasNonKesehatanTerinfeksi,
    masaInkubasiHari: parameterPenyakit.masa_inkubasi_hari ?? 14,
    risikoRelatifKota,
  });

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO simulasi_wabah_kapal
            (id, kegiatan_cop_id, wilayah_kerja, nama_kapal, tanggal_kejadian,
             kategori_penyakit_id, total_abk, abk_bergejala, r0_override,
             efektivitas_isolasi_persen, jumlah_tkbm, durasi_kontak_jam,
             penggunaan_apd_persen, jumlah_petugas_kesehatan, jumlah_petugas_non_kesehatan,
             hasil_kurva_kapal, hasil_kurva_tkbm, risiko_petugas,
             r_efektif_kapal, r_efektif_tanpa_isolasi, r_efektif_tkbm,
             estimasi_kasus_impor_kota, rekomendasi_kebijakan,
             daftar_kota_tujuan_lanjutan, dibuat_oleh)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.kegiatanCopId ?? null,
      input.wilayahKerja,
      input.namaKapal,
      input.tanggalKejadian,
      input.kategoriPenyakitId,
      input.totalAbk,
      input.abkBergejala,
      input.r0Override ?? null,
      input.efektivitasIsolasiPersen,
      input.jumlahTkbm,
      input.durasiKontakJam,
      input.penggunaanApdPersen,
      input.jumlahPetugasKesehatan,
      input.jumlahPetugasNonKesehatan,
      keJson({
        tanpaIsolasi: hasilKapal.kurvaTanpaIsolasi,
        denganIsolasi: hasilKapal.kurvaDenganIsolasi,
      }),
      keJson(risikoTkbm),
      keJson(risikoPetugas),
      hasilKapal.rEfektifDenganIsolasi,
      hasilKapal.rEfektifTanpaIsolasi,
      null,
      risikoTkbm.estimasiTkbmTerinfeksi,
      rekomendasi,
      keJson(input.daftarKotaTujuanLanjutan ?? []),
      user.id,
    ],
  });

  const { rows: [hasilTersimpan] } = await db.execute({
    sql: "SELECT * FROM simulasi_wabah_kapal WHERE id = ?",
    args: [id],
  });

  return parseKolomJson(hasilTersimpan, [
    "hasil_kurva_kapal",
    "hasil_kurva_tkbm",
    "risiko_petugas",
    "daftar_kota_tujuan_lanjutan",
  ]);
}