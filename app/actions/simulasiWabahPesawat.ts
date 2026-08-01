"use server";

import { createClient } from "@/lib/supabase/server";
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

  const { data: hasilTersimpan, error: errSimpan } = await supabase
    .from("simulasi_wabah_pesawat")
    .insert({
      kegiatan_pesawat_id: input.kegiatanPesawatId ?? null,
      kode_wilker: input.kodeWilker,
      nomor_penerbangan: input.nomorPenerbangan ?? null,
      tanggal_kejadian: input.tanggalKejadian,
      kategori_penyakit_id: input.kategoriPenyakitId,
      total_penumpang: input.totalPenumpang,
      total_kru: input.totalKru,
      jumlah_bergejala: input.jumlahBergejala,
      radius_kontak_baris: input.radiusKontakBaris,
      durasi_penerbangan_jam: input.durasiPenerbanganJam,
      jumlah_ground_crew: input.jumlahGroundCrew,
      penggunaan_apd_persen: input.penggunaanApdPersen,
      estimasi_kontak_erat: estimasiKontakErat,
      daftar_kota_tujuan_lanjutan: input.daftarKotaTujuanLanjutan ?? [],
      risiko_ground_crew: risikoGroundCrew,
      rekomendasi_kebijakan: rekomendasi,
      dibuat_oleh: user.id,
    })
    .select()
    .single();

  if (errSimpan) throw errSimpan;

  return hasilTersimpan;
}