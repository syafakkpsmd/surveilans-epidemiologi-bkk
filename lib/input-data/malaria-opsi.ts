// Pilihan jawaban survei Migrasi Malaria. Satu-satunya tempat mengubah daftar pilihan di form.
export const JENIS_KELAMIN = ['Laki-laki', 'Perempuan'];
export const PEKERJAAN = ['PNS/TNI/POLRI', 'Petani', 'Nelayan', 'IRT', 'Pedagang', 'Swasta', 'Wiraswasta', 'Pensiunan', 'Pelajar/Mahasiswa', 'Lainnya'];
export const PENDIDIKAN = ['Tidak Lulus SD', 'SD/Sederajat', 'SMP/Sederajat', 'SMA/Sederajat', 'Perguruan Tinggi'];
export const YA_TIDAK = ['Ya', 'Tidak'];
export const BUANG_HAJAT = ['Jamban', 'Sungai', 'Kebun'];
export const HASIL_RDT = ['Reaktif', 'Non Reaktif', 'Invalid'];

// Pilihan ganda (disimpan digabung ", " sesuai cara query dashboard membacanya).
export const DEKAT_DENGAN = ['Hutan', 'Sungai', 'Rawa', 'Lagun', 'Perkebunan', 'Tidak semuanya'];
export const SAAT_TIDUR = ['Kelambu', 'Repellent', 'Tidak'];
// Di tangkapan layar daftar ini terpotong setelah "Herbal": tambahkan pilihan lain di sini bila ada.
export const TEMPAT_BEROBAT = ['Minum obat warung', 'Mantri/Bidan Praktek/Dokter', 'Puskesmas/Pustu/Rumah Sakit/Fasyankes Lainnya', 'Herbal'];

export const DAFTAR_GANDA: Record<string, string[]> = {
  sekitar_dekat_dengan: DEKAT_DENGAN,
  pakai_saat_tidur: SAAT_TIDUR,
  tempat_berobat: TEMPAT_BEROBAT,
};
/** Pilihan yang meniadakan pilihan lain pada kelompoknya. */
export const EKSKLUSIF: Record<string, string> = { sekitar_dekat_dengan: 'Tidak semuanya', pakai_saat_tidur: 'Tidak' };