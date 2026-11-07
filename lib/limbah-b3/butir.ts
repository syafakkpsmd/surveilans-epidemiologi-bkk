// lib/limbah-b3/butir.ts  (FILE BARU)
// SUMBER TUNGGAL isi formulir "Pemeriksaan Pengelolaan Limbah B3 Klinik". Murni (tanpa database), aman untuk komponen 'use client'.
// Dibangkitkan dari Form_Pemeriksaan_Limbah_B3_Klinik_BKK_Samarinda.xlsx. Mengubah/menambah butir atau seksi cukup di sini:
// kolom form, templat Excel, penilaian, dan dasbor mengikutinya. (Menambah butir juga butuh kolom item_NN baru di tabel.)
// Huruf seksi dipertahankan persis seperti formulir (A, B, C, D, G); E dan F memang tidak ada di formulir sumber.

export interface SeksiB3 { huruf: string; nama: string }
export interface ButirB3 { no: number; seksi: string; teks: string }

export const SEKSI: readonly SeksiB3[] = [
  { huruf: "A", nama: "Identifikasi dan inventarisasi limbah B3" },
  { huruf: "B", nama: "Pemilahan, pengemasan, dan pengumpulan" },
  { huruf: "C", nama: "Penyimpanan sementara (TPS limbah B3)" },
  { huruf: "D", nama: "Pengangkutan dan pengolahan/pemanfaatan" },
  { huruf: "G", nama: "Dokumentasi, kompetensi, dan tindak lanjut" },
] as const;

export const BUTIR: readonly ButirB3[] = [
  { no: 1, seksi: "A", teks: "Apakah klinik mengidentifikasi jenis limbah B3 yang dihasilkan?" },
  { no: 2, seksi: "A", teks: "Apakah sumber/ruangan penghasil limbah B3 telah diidentifikasi?" },
  { no: 3, seksi: "A", teks: "Apakah karakteristik limbah (mis. infeksius, benda tajam, farmasi, kimia) dicatat?" },
  { no: 4, seksi: "A", teks: "Apakah jumlah/volume limbah B3 yang dihasilkan dicatat secara berkala?" },
  { no: 5, seksi: "A", teks: "Apakah tersedia catatan jenis, sumber, karakteristik, dan volume limbah B3?" },
  { no: 6, seksi: "B", teks: "Apakah limbah B3 dipilah sejak dari sumbernya?" },
  { no: 7, seksi: "B", teks: "Apakah limbah infeksius dipisahkan dari limbah non-B3?" },
  { no: 8, seksi: "B", teks: "Apakah benda tajam ditempatkan dalam wadah tahan tusuk dan tidak mudah bocor?" },
  { no: 9, seksi: "B", teks: "Apakah wadah/kantong limbah sesuai dengan jenis dan karakteristik limbah?" },
  { no: 10, seksi: "B", teks: "Apakah wadah diberi label/simbol sesuai ketentuan yang berlaku?" },
  { no: 11, seksi: "B", teks: "Apakah wadah tidak diisi melebihi kapasitas dan ditutup dengan aman?" },
  { no: 12, seksi: "B", teks: "Apakah petugas menggunakan APD saat menangani limbah B3?" },
  { no: 13, seksi: "B", teks: "Apakah tersedia prosedur/SOP penanganan tumpahan atau kecelakaan limbah?" },
  { no: 14, seksi: "C", teks: "Apakah tersedia tempat penyimpanan sementara limbah B3 yang ditetapkan?" },
  { no: 15, seksi: "C", teks: "Apakah lokasi TPS aman, tidak rawan banjir, dan tidak mengganggu pelayanan klinik?" },
  { no: 16, seksi: "C", teks: "Apakah TPS terlindung dari hujan dan aksesnya dibatasi?" },
  { no: 17, seksi: "C", teks: "Apakah lantai TPS kedap air dan mudah dibersihkan?" },
  { no: 18, seksi: "C", teks: "Apakah tersedia ventilasi/pencahayaan yang memadai?" },
  { no: 19, seksi: "C", teks: "Apakah tersedia penandaan/label TPS dan informasi bahaya?" },
  { no: 20, seksi: "C", teks: "Apakah limbah disimpan terpisah sesuai jenis/karakteristiknya?" },
  { no: 21, seksi: "C", teks: "Apakah tersedia penampung tumpahan untuk limbah cair bila diperlukan?" },
  { no: 22, seksi: "C", teks: "Apakah TPS dijaga bersih serta bebas dari vektor/binatang pengganggu?" },
  { no: 23, seksi: "C", teks: "Apakah tersedia akses untuk pengangkutan limbah oleh pihak berwenang?" },
  { no: 24, seksi: "D", teks: "Apakah pengangkutan dilakukan oleh pihak yang memiliki perizinan/persetujuan sesuai ketentuan?" },
  { no: 25, seksi: "D", teks: "Apakah klinik memiliki dokumen kerja sama/kontrak dengan pengangkut atau pengolah?" },
  { no: 26, seksi: "D", teks: "Apakah pengangkutan menggunakan sarana/wadah yang sesuai dan aman?" },
  { no: 27, seksi: "D", teks: "Apakah tersedia manifest/dokumen serah terima atau pelacakan limbah?" },
  { no: 28, seksi: "D", teks: "Apakah jadwal pengangkutan dan bukti serah terima terdokumentasi?" },
  { no: 29, seksi: "D", teks: "Apakah klinik menyimpan bukti pengolahan akhir dari pihak penerima?" },
  { no: 30, seksi: "G", teks: "Apakah tersedia SOP pengelolaan limbah B3 yang mudah diakses petugas?" },
  { no: 31, seksi: "G", teks: "Apakah petugas mendapat pelatihan/sosialisasi pengelolaan limbah B3?" },
  { no: 32, seksi: "G", teks: "Apakah tersedia pencatatan inspeksi, insiden, dan tindakan perbaikan?" },
  { no: 33, seksi: "G", teks: "Apakah rekomendasi pemeriksaan sebelumnya telah ditindaklanjuti?" },
] as const;

export const NILAI_BUTIR = ['Ya', 'Tidak', 'N/A'] as const;
export type NilaiButir = (typeof NILAI_BUTIR)[number];

/** Nama kolom tabel untuk butir nomor n: item_01 ... item_33. */
export const namaKolomButir = (no: number): string => `item_${String(no).padStart(2, '0')}`;
export const KOLOM_BUTIR: readonly string[] = BUTIR.map((b) => namaKolomButir(b.no));

/**
 * Ambang warna skor kepatuhan (% butir "Ya" dari butir yang dinilai). BUKAN ketentuan resmi: hanya untuk pewarnaan di dasbor.
 * Sesuaikan dengan kebijakan BKK masing-masing.
 */
export const AMBANG_SKOR = { baik: 80, cukup: 60 } as const;
