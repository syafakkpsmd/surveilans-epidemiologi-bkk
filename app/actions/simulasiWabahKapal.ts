"use server";

import { createClient } from "@/lib/supabase/server";
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
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Harus login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profil || !["admin", "petugas"].includes(profil.role)) {
    throw new Error("Hanya admin/petugas yang bisa menjalankan simulasi");
  }

  const { data: parameterPenyakit, error: errParam } = await supabase
    .from("referensi_parameter_penyakit")
    .select("*")
    .eq("id", input.kategoriPenyakitId)
    .single();

  if (errParam || !parameterPenyakit) {
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

  const { data: populasiWilker } = await supabase
    .from("referensi_populasi_wilker")
    .select("populasi_kota_sekitar")
    .eq("jenis_wilker", "Pelabuhan")
    .eq("wilayah_kerja", input.wilayahKerja)
    .maybeSingle();

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

  const { data: hasilTersimpan, error: errSimpan } = await supabase
    .from("simulasi_wabah_kapal")
    .insert({
      kegiatan_cop_id: input.kegiatanCopId ?? null,
      wilayah_kerja: input.wilayahKerja,
      nama_kapal: input.namaKapal,
      tanggal_kejadian: input.tanggalKejadian,
      kategori_penyakit_id: input.kategoriPenyakitId,
      total_abk: input.totalAbk,
      abk_bergejala: input.abkBergejala,
      r0_override: input.r0Override ?? null,
      efektivitas_isolasi_persen: input.efektivitasIsolasiPersen,
      jumlah_tkbm: input.jumlahTkbm,
      durasi_kontak_jam: input.durasiKontakJam,
      penggunaan_apd_persen: input.penggunaanApdPersen,
      jumlah_petugas_kesehatan: input.jumlahPetugasKesehatan,
      jumlah_petugas_non_kesehatan: input.jumlahPetugasNonKesehatan,
      hasil_kurva_kapal: {
        tanpaIsolasi: hasilKapal.kurvaTanpaIsolasi,
        denganIsolasi: hasilKapal.kurvaDenganIsolasi,
      },
      hasil_kurva_tkbm: risikoTkbm,
      risiko_petugas: risikoPetugas,
      r_efektif_kapal: hasilKapal.rEfektifDenganIsolasi,
      r_efektif_tanpa_isolasi: hasilKapal.rEfektifTanpaIsolasi,
      r_efektif_tkbm: null,
      estimasi_kasus_impor_kota: risikoTkbm.estimasiTkbmTerinfeksi,
      rekomendasi_kebijakan: rekomendasi,
      dibuat_oleh: user.id,
    })
    .select()
    .single();

  if (errSimpan) throw errSimpan;

  return hasilTersimpan;
}