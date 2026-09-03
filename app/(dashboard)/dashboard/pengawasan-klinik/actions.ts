// app/(dashboard)/dashboard/pengawasan-klinik/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { hitungStatusKepatuhan } from '@/lib/pengawasan-klinik/hitungKepatuhan';
import { revalidatePath } from 'next/cache';

export async function simpanPengawasanKlinik(formData: FormData) {
  const supabase = await createClient();

  const getString = (key: string): string | null => {
    const val = formData.get(key);
    return typeof val === 'string' && val.length > 0 ? val : null;
  };

  const klinikId = getString('klinik_id');
  const tanggalKegiatan = getString('tanggal_kegiatan');

  if (!klinikId) {
    return { error: 'Klinik/RS wajib dipilih.' };
  }
  if (!tanggalKegiatan) {
    return { error: 'Tanggal kegiatan wajib diisi.' };
  }

  const getBool = (key: string) => formData.get(key) === 'true';
  const dataChecklist = {
    papan_nama_vaksinasi: getBool('papan_nama_vaksinasi'),
    papan_nama_ruangan_vaksinasi: getBool('papan_nama_ruangan_vaksinasi'),
    ada_vaksinator_bersertifikat: getBool('ada_vaksinator_bersertifikat'),
    sio_ada: getBool('sio_ada'),
    mou_limbah_ada: getBool('mou_limbah_ada'),
    mou_limbah_berlaku: getBool('mou_limbah_berlaku'),
    sop_pelayanan_vaksinasi: getBool('sop_pelayanan_vaksinasi'),
    sop_syok_anafilaktik: getBool('sop_syok_anafilaktik'),
    alur_pelayanan_terpasang: getBool('alur_pelayanan_terpasang'),
    pendaftaran_komputer_jaringan: getBool('pendaftaran_komputer_jaringan'),
    ruang_tunggu_terpisah: getBool('ruang_tunggu_terpisah'),
    ruang_periksa_screening: getBool('ruang_periksa_screening'),
    ruang_vaksinasi: getBool('ruang_vaksinasi'),
    ruang_tindakan: getBool('ruang_tindakan'),
    apotek_cold_chain_room: getBool('apotek_cold_chain_room'),
    ruang_laboratorium: getBool('ruang_laboratorium'),
    ruang_administrasi_komputer: getBool('ruang_administrasi_komputer'),
    toilet_urin: getBool('toilet_urin'),
    vaccine_refrigerator_freezer: getBool('vaccine_refrigerator_freezer'),
    vaccine_carrier: getBool('vaccine_carrier'),
    termometer: getBool('termometer'),
    freeze_tag: getBool('freeze_tag'),
    log_tag: getBool('log_tag'),
    avr: getBool('avr'),
    genset: getBool('genset'),
    anafilaktik_kit: getBool('anafilaktik_kit'),
    pengelolaan_limbah_medis: getBool('pengelolaan_limbah_medis'),
    safety_box: getBool('safety_box'),
    tempat_sampah_tertutup: getBool('tempat_sampah_tertutup'),
    printer_passbook: getBool('printer_passbook'),
  };

  if (dataChecklist.sio_ada && !getString('sio_berlaku_sampai')) {
    return { error: 'Masa berlaku SIO wajib diisi jika SIO tersedia.' };
  }

  const hasil = hitungStatusKepatuhan(dataChecklist);

  const { data: pengawasan, error } = await supabase
    .from('pengawasan_klinik')
    .insert({
      klinik_id: klinikId,
      tanggal_kegiatan: tanggalKegiatan,
      waktu_mulai_layanan: getString('waktu_mulai_layanan'),
      waktu_tutup_layanan: getString('waktu_tutup_layanan'),
      ...dataChecklist,
      nomor_sip_dokter: getString('nomor_sip_dokter'),
      nomor_sio: getString('nomor_sio'),
      sio_berlaku_sampai: getString('sio_berlaku_sampai'),
      nama_petugas_1: getString('nama_petugas_1'),
      catatan: getString('catatan'),
      persentase_kepatuhan: hasil.persentaseKepatuhan,
      status_kepatuhan: hasil.status,
      item_bermasalah: hasil.itemBermasalah,
      skor_kritikal_gagal: hasil.jumlahKritikalGagal,
      skor_pendukung_gagal: hasil.jumlahPendukungGagal,
      submitted_by: null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/pengawasan-klinik');
  return { success: true, pengawasanId: pengawasan.id, status: hasil.status };
}

export async function simpanDokumenPengawasan(
  pengawasanId: string,
  jenisDokumen: string,
  cloudinaryUrl: string,
  cloudinaryPublicId: string
) {
  const supabase = await createClient();

  const { error } = await supabase.from('pengawasan_klinik_dokumen').insert({
    pengawasan_id: pengawasanId,
    jenis_dokumen: jenisDokumen,
    cloudinary_url: cloudinaryUrl,
    cloudinary_public_id: cloudinaryPublicId,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function tambahKlinikBaru(namaKlinik: string, alamat: string, jenisFasilitas: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('klinik_binaan')
    .insert({ nama_klinik: namaKlinik, alamat_klinik: alamat, jenis_fasilitas: jenisFasilitas })
    .select('id, nama_klinik')
    .single();

  if (error) return { error: error.message };
  return { success: true, klinik: data };
}

export async function updateLokasiKlinik(klinikId: string, latitude: number, longitude: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('klinik_binaan')
    .update({ latitude, longitude })
    .eq('id', klinikId);

  if (error) return { error: error.message };
  return { success: true };
}