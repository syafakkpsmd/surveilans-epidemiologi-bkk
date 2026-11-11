// lib/omkaba/dokumen.ts
// Daftar 13 dokumen pendukung pada berkas Sinkarkes "Rekapitulasi Lalu Lintas OMKABA" (nilai: Ada / Tidak Ada).
// MURNI. Dipakai modul input (modul-omkaba.ts), kueri dasbor, dan komponen dasbor, supaya nama kolom selalu sama.
export interface DokumenOmkaba {
  /** Nama kolom di tabel omkaba_sertifikat. */
  kolom: string;
  /** Label ringkas untuk form, tabel, dan dasbor. */
  label: string;
  /** Judul kolom persis seperti di berkas Sinkarkes (dicocokkan tanpa memedulikan huruf besar/kecil dan spasi). */
  sinkarkes: string;
}

export const DAFTAR_DOKUMEN: DokumenOmkaba[] = [
  { kolom: 'dok_surat_permohonan', label: 'Surat Permohonan', sinkarkes: 'Surat Permohonan dari Exportir / Importir' },
  { kolom: 'dok_coa', label: 'Certificate of Analysis', sinkarkes: 'Certificate of Analysis dari laboratorium terakredisasi/Negara asal' },
  { kolom: 'dok_packing_list', label: 'Packing List', sinkarkes: 'Packing list' },
  { kolom: 'dok_invoice', label: 'Invoice', sinkarkes: 'Invoice' },
  { kolom: 'dok_peb_pib', label: 'PEB / PIB', sinkarkes: 'Pemberitahuan Export Barang (PEB) Pemberitahuan Impor Barang (PIB)' },
  { kolom: 'dok_ocean_bl', label: 'Ocean Bill of Lading', sinkarkes: 'Ocean Bill of Lading' },
  { kolom: 'dok_surat_kuasa', label: 'Surat Kuasa', sinkarkes: 'Surat Kuasa dan Exportir/importir' },
  { kolom: 'dok_reg_bpom', label: 'Registrasi Depkes/BPOM', sinkarkes: 'Nomor Registrasi Depkes/BPOM' },
  { kolom: 'dok_sert_mui', label: 'Sertifikat MUI', sinkarkes: 'Certificate Pendukung (MUI)' },
  { kolom: 'dok_sert_batan', label: 'Sertifikat BATAN', sinkarkes: 'Certificate Pendukung (BATAN)' },
  { kolom: 'dok_phytosanitary', label: 'Phytosanitary / Layak Konsumsi', sinkarkes: 'Phytosanitary atau layak konsumsi' },
  { kolom: 'dok_karantina_hewan', label: 'Karantina Hewan', sinkarkes: 'Sertifikat Karantina Hewan' },
  { kolom: 'dok_karantina_ikan', label: 'Karantina Ikan', sinkarkes: 'Sertifikat Karantina Ikan' },
];