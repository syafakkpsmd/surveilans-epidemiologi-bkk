// lib/input-data/modul-klinik.ts
// Modul input data HIV (VCT), TB (skrining), dan Migrasi Malaria: form satu per satu + unggah Excel
// dengan berbagai model tanggal. MURNI (tanpa database / exceljs), aman dipakai komponen 'use client'.
// Didaftarkan di MODUL (modul.ts). Kolom mengikuti tabel hiv_data, tb_data, dan migrasi_malaria di PostgreSQL;
// panjang `maks` = panjang kolom di database (dijaga oleh scripts/migrate/uji-modul-klinik.ts).
//
// Kunci pencocokan baris saat unggah (wilayah + nama + tanggal): berkas yang diunggah ulang memperbarui baris
// yang sama (sel kosong tidak menimpa isian lama), bukan menggandakannya.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
/** Judul kolom wilayah yang diterima pada berkas (isinya nama wilayah kerja). */
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Pelabuhan', 'Nama KKP', 'KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];
/** Kolom `text` di database tidak berbatas; di aplikasi dibatasi supaya isian tidak tak terkendali. */
const PANJANG = 2000;

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });
const wilker: KolomModul = { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER };

// ------------------------------------------------------------------------------------------
// HIV (VCT): tabel hiv_data
// ------------------------------------------------------------------------------------------
const hiv: ModulInput = {
  kunci: 'hiv',
  label: 'HIV (VCT)',
  tabel: 'hiv_data',
  kolomTanggal: 'tanggal_kegiatan',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'nama',
  namaKunci: 'nama klien',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['tanggal_kegiatan', 'wilayah_kerja', 'nama', 'sex', 'tanggal_lahir', 'kunjungan', 'hasil'],
  kolom: [
    { nama: 'tanggal_kegiatan', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Kegiatan', 'Tanggal Kunjungan', 'Tanggal Tes'], kelompok: 'Kegiatan' },
    wilker,
    T('nama', 'Nama', ['Nama Klien', 'Nama Lengkap'], { wajib: true, kelompok: 'Identitas klien' }),
    T('nik', 'NIK', ['No KTP', 'Nomor KTP'], { maks: 32 }),
    T('sex', 'Jenis Kelamin', ['Sex', 'JK', 'L/P'], { maks: 20 }),
    { nama: 'tanggal_lahir', label: 'Tanggal Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tgl Lahir'] },
    T('alamat', 'Alamat', ['Alamat Domisili'], { maks: PANJANG }),
    T('status_perkawinan', 'Status Perkawinan', ['Status Kawin', 'Status Pernikahan'], { maks: 100 }),
    T('kunjungan', 'Kunjungan', ['Jenis Kunjungan'], { maks: 100, kelompok: 'Kunjungan dan hasil' }),
    T('hasil', 'Hasil', ['Hasil Tes', 'Hasil Test', 'Hasil Pemeriksaan'], { maks: 100 }),
    T('jenis_reagen', 'Jenis Reagen', ['Reagen', 'Nama Reagen']),
    T('hubungan_berisiko', 'Hubungan Berisiko', ['Faktor Risiko', 'Perilaku Berisiko'], { maks: PANJANG }),
  ],
};

// ------------------------------------------------------------------------------------------
// TB (skrining): tabel tb_data
// ------------------------------------------------------------------------------------------
const tb: ModulInput = {
  kunci: 'tb',
  label: 'TB (Skrining)',
  tabel: 'tb_data',
  kolomTanggal: 'tanggal_pelaksanaan',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'nama_peserta',
  namaKunci: 'nama peserta',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['tanggal_pelaksanaan', 'wilayah_kerja', 'nama_peserta', 'jenis_kelamin', 'terduga_tbc', 'terkonfirmasi_tbc'],
  kolom: [
    { nama: 'tanggal_pelaksanaan', label: 'Tanggal Pelaksanaan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Pelaksanaan', 'Tanggal Skrining'], kelompok: 'Pelaksanaan' },
    wilker,
    T('nama_peserta', 'Nama Peserta', ['Nama', 'Nama Lengkap'], { wajib: true, kelompok: 'Identitas peserta' }),
    T('provinsi', 'Provinsi', undefined, { maks: 100 }),
    T('kabupaten_kota', 'Kabupaten/Kota', ['Kab/Kota', 'Kabupaten Kota'], { maks: 100 }),
    T('nik', 'NIK', ['No KTP', 'Nomor KTP'], { maks: 32 }),
    T('pekerjaan', 'Pekerjaan'),
    { nama: 'tanggal_lahir', label: 'Tanggal Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tgl Lahir'] },
    T('jenis_kelamin', 'Jenis Kelamin', ['Sex', 'JK', 'L/P'], { maks: 20 }),
    T('no_hp', 'No HP', ['Nomor HP', 'No Telepon', 'Telepon'], { maks: 50 }),
    T('riwayat_kontak_tbc', 'Riwayat Kontak TBC', ['Kontak TBC'], { maks: 100, kelompok: 'Riwayat dan faktor risiko' }),
    T('jenis_kontak_tbc', 'Jenis Kontak TBC'),
    T('pernah_terdiagnosa_tbc', 'Pernah Terdiagnosa TBC', ['Pernah Didiagnosis TBC'], { maks: 100 }),
    T('keterangan_riwayat_tbc', 'Keterangan Riwayat TBC', undefined, { maks: PANJANG }),
    T('kekurangan_gizi', 'Kekurangan Gizi', ['Gizi Kurang'], { maks: 100 }),
    T('merokok', 'Merokok', undefined, { maks: 100 }),
    T('perokok_pasif', 'Perokok Pasif', undefined, { maks: 100 }),
    T('riwayat_dm', 'Riwayat DM', ['Riwayat Diabetes', 'Diabetes Melitus'], { maks: 100 }),
    T('odhiv', 'ODHIV', ['ODHA'], { maks: 100 }),
    T('lansia', 'Lansia', undefined, { maks: 100 }),
    T('ibu_hamil', 'Ibu Hamil', undefined, { maks: 100 }),
    T('hasil_skrining_gejala', 'Hasil Skrining Gejala', ['Skrining Gejala'], { maks: PANJANG, kelompok: 'Skrining dan tindak lanjut' }),
    T('terduga_tbc', 'Terduga TBC', ['Terduga TB'], { maks: 100 }),
    T('tindak_lanjut_pemeriksaan', 'Tindak Lanjut Pemeriksaan', ['Tindak Lanjut'], { maks: PANJANG }),
    T('fasyankes_pemeriksaan', 'Fasyankes Pemeriksaan', ['Fasyankes', 'Faskes Pemeriksaan']),
    T('nomor_register_sitb', 'Nomor Register SITB', ['No Register SITB', 'Register SITB'], { maks: 100, kelompok: 'Diagnosis' }),
    { nama: 'tanggal_hasil_diagnosis', label: 'Tanggal Hasil Diagnosis', tipe: 'tanggal', alias: ['Tgl Hasil Diagnosis', 'Tanggal Diagnosis'] },
    T('hasil_pemeriksaan_diagnosis', 'Hasil Pemeriksaan Diagnosis', ['Hasil Diagnosis'], { maks: PANJANG }),
    T('jenis_pemeriksaan_diagnosis', 'Jenis Pemeriksaan Diagnosis', ['Jenis Pemeriksaan']),
    T('terkonfirmasi_tbc', 'Terkonfirmasi TBC', ['Terkonfirmasi TB'], { maks: 100 }),
  ],
};

// ------------------------------------------------------------------------------------------
// Migrasi Malaria: tabel migrasi_malaria
// ------------------------------------------------------------------------------------------
const migrasiMalaria: ModulInput = {
  kunci: 'migrasi_malaria',
  label: 'Migrasi Malaria',
  tabel: 'migrasi_malaria',
  kolomTanggal: 'tanggal_kegiatan',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'nama_lengkap',
  namaKunci: 'nama responden',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  jenisWilayahBoleh: ['Pelabuhan', 'Bandara'],
  kolomKunciTambahan: ['tanggal_lahir', 'nama_kapal_pesawat'],
  peranBoleh: ['admin', 'petugas', 'petugas_klinik'],
  kolomDaftar: ['tanggal_kegiatan', 'wilayah_kerja', 'nama_lengkap', 'nama_kapal_pesawat', 'jenis_kelamin', 'umur', 'hasil_rdt'],
  kolom: [
    { nama: 'tanggal_kegiatan', label: 'Tanggal Kegiatan', tipe: 'tanggal', wajib: true, alias: ['Tanggal', 'Tgl Kegiatan', 'Tanggal Survei'], kelompok: 'Kegiatan' },
    wilker,
    T('nama_kapal_pesawat', 'Nama Kapal/Pesawat', ['Nama Kapal', 'Nama Pesawat', 'Kapal/Pesawat', 'Alat Angkut']),
    T('nama_lengkap', 'Nama Lengkap', ['Nama', 'Nama Responden'], { wajib: true, kelompok: 'Identitas responden' }),
    { nama: 'tanggal_lahir', label: 'Tanggal Lahir', tipe: 'tanggal', tanggalLahir: true, alias: ['Tgl Lahir'] },
    T('jenis_kelamin', 'Jenis Kelamin', ['Sex', 'JK', 'L/P'], { maks: 20 }),
    { nama: 'umur', label: 'Umur', tipe: 'bilangan', alias: ['Umur (Tahun)', 'Usia'], batasNilai: [0, 120] },
    T('pekerjaan', 'Pekerjaan'),
    T('pendidikan_terakhir', 'Pendidikan Terakhir', ['Pendidikan']),
    T('alamat_asal', 'Alamat Asal', undefined, { maks: PANJANG }),
    T('alamat_tujuan', 'Alamat Tujuan', ['Tujuan'], { maks: PANJANG }),
    T('pernah_sakit_malaria', 'Pernah Sakit Malaria', undefined, { kelompok: 'Pengetahuan dan perilaku' }),
    T('tahu_penyakit_malaria', 'Tahu Penyakit Malaria'),
    T('tahu_gejala_malaria', 'Tahu Gejala Malaria'),
    T('sekitar_pernah_sakit_malaria', 'Sekitar Pernah Sakit Malaria'),
    T('pernah_dapat_informasi_malaria', 'Pernah Dapat Informasi Malaria'),
    T('sekitar_dekat_dengan', 'Sekitar Dekat Dengan'),
    T('punya_ternak', 'Punya Ternak'),
    T('tempat_buang_hajat', 'Tempat Buang Hajat'),
    T('pakai_baju_panjang_repellent', 'Pakai Baju Panjang/Repellent'),
    T('pakai_saat_tidur', 'Pakai Saat Tidur'),
    T('tempat_berobat', 'Tempat Berobat'),
    T('hasil_rdt', 'Hasil RDT', ['RDT', 'Hasil Pemeriksaan RDT'], { kelompok: 'Pemeriksaan' }),
  ],
};

export const MODUL_KLINIK: Record<string, ModulInput> = { hiv, tb, migrasi_malaria: migrasiMalaria };
