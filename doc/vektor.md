CATATAN INTEGRASI MASA DEPAN — MODUL VEKTOR (EPIC-AI):
  - Data surveilans vektor (DBD, Tikus, Anopheles, Diare, Malaria
    Migrasi, TB, HIV) SUDAH tersinkron ke Supabase lewat sistem
    terpisah (Google Apps Script -> Supabase, di luar aplikasi Next.js
    ini), tabelnya: vektor_dbd, vektor_tikus, vektor_anopheles,
    vektor_diare, malaria_migrasi, tb_data, hiv_data.
  - Modul /dashboard/vektor BELUM DIBANGUN, tapi ketika dibangun nanti,
    HARUS memakai Route Handler & tabel riwayat_analisis_ai YANG SAMA
    dari Segmen 9 (bukan bikin sistem AI terpisah) -- jadi field
    `konteks` di riwayat_analisis_ai harus fleksibel menampung nilai
    seperti "vektor-dbd-mingguan", "vektor-anopheles-mingguan", dst,
    dan `wilayah_kerja` diisi kode_wilker yang formatnya SAMA dengan
    yang dipakai sistem GAS (WK01-WK07), BUKAN format baru.
  - Sistem GAS EPIC-AI yang sudah berjalan memakai skema hasil AI
    LEBIH KAYA dari 3 field (ringkasan/anomali/rekomendasi) di Segmen
    9: ia punya riskScore(0-100), level(AMAN/WASPADA/BAHAYA),
    tren(NAIK/TURUN/STABIL), analisis, rekomendasi, prediksi4minggu,
    korelasiHujan. KETIKA modul Vektor mulai dibangun, PERTIMBANGKAN
    memperluas kolom riwayat_analisis_ai (tambah risk_score, level,
    tren) supaya satu tabel riwayat bisa dipakai konsisten oleh COP/
    PHQC maupun Vektor -- JANGAN buat tabel riwayat kedua terpisah.
  - Prompt builder untuk data vektor SEBAIKNYA di-port dari logika GAS
    yang sudah teruji (fungsi buildPromptAI_ di Code.gs EPIC-AI,
    termasuk aturan larangan rekomendasi lintas-vektor seperti "jangan
    sarankan fogging untuk kegiatan Tikus"), BUKAN ditulis ulang dari
    nol tanpa melihat versi GAS-nya.
  - JANGAN mengandalkan GEMINI_API_KEY yang tersimpan di Script
    Properties GAS -- itu environment terpisah dari Next.js/Vercel.
    Provider AI untuk aplikasi Next.js ini SELALU dikonfigurasi lewat
    tabel `pengaturan_ai` (Segmen 9), independen dari GAS.

WILAYAH KERJA — DIPERBARUI JADI 7 (semula 6):
  Samarinda, TanjungSantan, TanjungLaut, Lhoktuan, Sangatta, Sangkulirang,
  BandaraAPTPranoto (kode: WK07, jenis: Bandara, koordinat -0.3706,117.2566)
  CATATAN: kolom wilayah_kerja di kegiatan_cop/kegiatan_phqc TIDAK diubah
  (COP/PHQC tetap 6 wilker pelabuhan, tidak berlaku untuk bandara).
  Wilker ke-7 ini HANYA dipakai oleh modul surveilans baru (Segmen 10-13).

SKEMA DATABASE TAMBAHAN (Segmen 10, migrasi dari EPIC-AI Google Sheets):
  Tabel `wilker_ref`:
    kode (text, PK), nama, jenis (Pelabuhan/Bandara), lat, lng,
    sub_lokasi (text[]), catatan

  Tabel `vektor_dbd` (dari DBD_DATA):
    tgl_survei (date), minggu_epid (text), kode_wilker (FK wilker_ref),
    zona (text: Perimeter/Buffer), sub_lokasi,
    jml_rumah_diperiksa (int), jml_positif_jentik (int),
    hi, ci, bi, abj (numeric — dihitung, bukan input manual),
    container_diperiksa, container_positif (int),
    metode (text), curah_hujan_mm (numeric, NULLABLE — diisi GAS),
    keterangan, input_oleh, dibuat_pada

  Tabel `vektor_tikus` (dari TIKUS_DATA):
    tgl_survei, minggu_epid, kode_wilker, area_survei,
    jenis_trap, jml_trap_dipasang, jml_trap_tertangkap, tsi (numeric),
    spesies_dominan, jml_tikus_diperiksa_pinjal, jml_pinjal_ditemukan,
    index_pinjal (numeric), uji_lab (text), hasil_leptospira,
    hasil_pes, hasil_hantavirus (text: Negatif/Positif/Pending),
    keterangan, input_oleh, dibuat_pada

  Tabel `vektor_anopheles` (dari ANOPHELES_DATA):
    tgl_survei, minggu_epid, kode_wilker, zona,
    tipe_pengamatan (text: dewasa/larva — WAJIB, dipakai filter submenu),
    metode_tangkap, jml_nyamuk, jml_jam_tangkap, mbr, mhd (numeric),
    spesies, jumlah_cidukan, jumlah_larva, jumlah_jenis_larva, spesies_larva,
    fase_bulan, suhu_c, kelembapan_pct, cuaca (NULLABLE — diisi GAS),
    input_oleh, dibuat_pada

  Tabel `vektor_diare` (dari DIARE_VEKTOR):
    tgl_kegiatan, minggu_epid, kode_wilker,
    jenis_kegiatan (text: lalat/kecoa — WAJIB, dipakai filter submenu),
    lokasi, nilai_hasil_pengamatan (numeric),
    hasil_pengamatan (text — dihitung: <2 = 'Memenuhi Syarat'),
    tindakan_pengendalian, insektisida_terpakai_ml, luas_area_semprot_m2,
    fly_index, kepadatan_kecoa_per_m2 (numeric, hanya salah satu terisi),
    suhu_c, kelembapan_pct, cuaca, curah_hujan_mm (NULLABLE — diisi GAS),
    input_oleh, dibuat_pada

  Tabel `malaria_migrasi` (dari MALARIA_MIGRASI):
    tgl_kedatangan, minggu_epid, kode_wilker,
    no_kapal_pesawat, rute_asal, jenis_transportasi (Kapal/Pesawat/Feri),
    jml_penumpang, jml_diperiksa, jml_demam,
    jml_rdt_dilakukan, jml_positif_rdt (int),
    jenis_plasmodium, ditindaklanjuti (bool), dirujuk_ke,
    keterangan, input_oleh, dibuat_pada

  Tabel `tb_data` (dari TB_DATA):
    tgl_penemuan, minggu_epid, kode_wilker, kelompok_sasaran,
    jml_suspek, jml_diperiksa_tcm, jml_positif_tcm (int),
    sensitivitas_oat, jml_kontak_erat, jml_kontak_diperiksa,
    jml_mulai_pengobatan (int), kategori_pasien,
    keterangan, input_oleh, dibuat_pada

  Tabel `hiv_data` (dari HIV_DATA):
    tgl_skrining, minggu_epid, kode_wilker, kelompok_sasaran,
    metode_skrining, jml_ditawarkan, jml_bersedia, jml_diperiksa,
    jml_reaktif, jml_dirujuk_vct, jml_konfirmasi_positif (int),
    keterangan, input_oleh, dibuat_pada

  PENTING — SUMBER DATA (beda dari kegiatan_cop/phqc):
  Data 7 tabel di atas TETAP diisi lewat Google Apps Script (form EPIC-AI
  yang sudah ada TIDAK DIBUANG), tapi setelah cuaca/curah hujan terisi
  otomatis oleh GAS, baris LENGKAP di-push ke Supabase lewat REST API
  (fungsi baru pushKeSupabase_(), pakai service_role key dari Script
  Properties SUPABASE_SERVICE_KEY). Next.js app TIDAK PERNAH menulis ke
  7 tabel ini — murni tampilan, sama seperti prinsip kegiatan_cop/phqc.

  Fungsi SQL tambahan `hitung_epi_indikator()` — trigger BEFORE INSERT
  di vektor_dbd (hitung hi/ci/bi/abj), vektor_tikus (tsi/index_pinjal),
  vektor_anopheles (mbr/mhd) — supaya konsisten dengan formula GAS lama,
  TIDAK dihitung ulang di Next.js.

  Views tambahan (mengikuti pola view_mingguan_ringkasan yang sudah ada):
    view_vektor_dbd_mingguan, view_vektor_tikus_mingguan,
    view_vektor_anopheles_mingguan (per tipe_pengamatan),
    view_vektor_diare_mingguan (per jenis_kegiatan),
    view_malaria_mingguan, view_tb_mingguan, view_hiv_mingguan

STRUKTUR NAVIGASI — TAMBAHAN:
  /dashboard/vektor              -> HUB: grid 5 kartu (Tikus, Aedes,
                                     Anopheles, Diare Lalat, Diare Kecoa)
    /tikus, /aedes                -> dashboard penuh per kegiatan
    /anopheles                    -> toggle Dewasa | Larva (1 halaman)
    /diare-lalat, /diare-kecoa    -> dashboard terpisah (bukan toggle,
                                      karena threshold & rekomendasinya
                                      beda total — ikuti larangan silang
                                      rekomendasi dari prompt EPIC-AI lama)
  /dashboard/malaria              -> Surveilans Migrasi Malaria
  /dashboard/tb                   -> Surveilans TB
  /dashboard/hiv                  -> Surveilans HIV
  Update KartuKategoriHub di /dashboard: ganti placeholder "Segera Hadir"
  untuk Vektor jadi href="/dashboard/vektor", tambah kartu Malaria/TB/HIV.

PRINSIP AI — DIPERLUAS DARI SEGMEN 9:
  Kolom `konteks` di riwayat_analisis_ai sekarang berformat:
    "{modul}-{kegiatan}-{periode}" contoh: "vektor-tikus-mingguan"
  Kolom BARU `filter_tambahan` (jsonb, nullable) menampung:
    { "zona": "Perimeter", "subLokasi": "TPK Palaran",
      "vektorType": "kecoa", "tipeAno": "larva" }
  Cache harian & lookup di riwayat_analisis_ai HARUS menyertakan
  filter_tambahan dalam pengecekan duplikat (bukan cuma konteks+periode).

  Prompt builder per kegiatan (logika ambang batas & larangan rekomendasi
  silang, seperti "JANGAN rekomendasikan fogging untuk Tikus") dipindah
  APA ADANYA dari fungsi buildPromptAI_() versi GAS ke
  lib/ai/promptBuilders/{kode}.ts — JANGAN ditulis ulang dari nol,
  supaya kualitas analisis tidak berubah dari yang sudah teruji.

CATATAN UNTUK KONSISTENSI DENGAN SISTEM GAS EPIC-AI YANG SUDAH ADA:
- Pola retry Gemini (503/429/500/502/529 -> retry dengan backoff)
  sudah teruji stabil di GAS Code.gs (fungsi callGeminiAPI_). Terapkan
  pola retry yang sama di lib/ai/providers/gemini.ts, jangan cuma
  single-attempt fetch.
- GAS Code.gs juga sudah punya fungsi pembersih teks (menghapus
  karakter kontrol, non-ASCII, kutip ganda) sebelum dikirim ke prompt,
  supaya JSON payload tidak pernah invalid. Terapkan sanitasi serupa
  di prompt builder TypeScript.


  [Salin KONTEKS PROYEK lengkap + tambahan di atas, lalu tempel ini]

TUGAS SEGMEN 10: Buat skema Supabase untuk 7 kegiatan surveilans baru
(migrasi dari EPIC-AI Google Sheets) + generate tipe TypeScript.

Lakukan:
1. Tulis SQL lengkap (CREATE TABLE + RLS) untuk 7 tabel yang disebut di
   KONTEKS PROYEK: vektor_dbd, vektor_tikus, vektor_anopheles,
   vektor_diare, malaria_migrasi, tb_data, hiv_data — plus wilker_ref
   (isi 7 baris data wilker termasuk Bandara APT Pranoto).
   RLS: SELECT terbuka untuk anon+authenticated (prinsip "semua bisa
   lihat"), INSERT/UPDATE/DELETE HANYA untuk service_role (karena semua
   input lewat GAS, bukan lewat aplikasi Next.js).

2. Buat trigger `hitung_epi_indikator()` untuk vektor_dbd, vektor_tikus,
   vektor_anopheles — hitung HI/CI/BI/ABJ, TSI/Index_Pinjal, MBR/MHD
   otomatis BEFORE INSERT, formula PERSIS seperti submitForm() di
   Dashboard.html EPIC-AI (jangan ubah rumus).

3. Buat 7 view mingguan (pola sama seperti view_mingguan_ringkasan yang
   sudah ada), pakai mmwr_week() yang sudah ada — JANGAN buat fungsi
   minggu baru.

4. Update types/database.types.ts dengan interface 7 tabel + 7 view baru.

5. Tambahkan ke lib/supabase/queries.ts: getRingkasanVektor(kegiatan,
   filter), getRingkasanMalaria/TB/HIV(tahun).

KRITERIA SELESAI:
- Semua tabel punya RLS aktif, SELECT publik jalan tanpa login (test
  dengan anon key), INSERT via anon key HARUS ditolak.
- Trigger perhitungan indikator teruji dengan minimal 3 baris data dummy
  per tabel (insert manual di SQL Editor, cek HI/TSI/MBR terhitung benar).


  [Salin KONTEKS PROYEK lengkap + tambahan, lalu tempel ini]

TUGAS SEGMEN 11: Bangun /dashboard/vektor (hub) dan 5 halaman turunannya.

Lakukan:
1. app/(dashboard)/dashboard/vektor/page.tsx — HUB, grid 5 kartu
   (Tikus, Aedes/DBD, Anopheles, Diare Lalat, Diare Kecoa), pola SAMA
   seperti KartuKategoriHub yang sudah ada di /dashboard, TANPA grafik
   di halaman ini (aturan hub: cuma navigasi).

2. app/(dashboard)/dashboard/vektor/tikus/page.tsx dan /aedes/page.tsx:
   pola SAMA seperti /cop dan /phqc di Segmen 6-7 (toggle mingguan/
   bulanan, filter wilker via searchParams — ingat await searchParams
   di Next.js 15, grafik recharts, TombolAnalisisAI dengan konteks
   "vektor-tikus-mingguan" / "vektor-aedes-mingguan").
   KHUSUS Aedes: tambahkan filter Zona (Perimeter/Buffer) + Sub-Lokasi
   (khusus WK01: Pelabuhan Umum / TPK Palaran) — persis submenu zona
   di Dashboard.html EPIC-AI lama, sub-lokasi HANYA muncul kalau
   wilker=WK01.

3. app/(dashboard)/dashboard/vektor/anopheles/page.tsx: SATU halaman,
   toggle tab "Nyamuk Dewasa" | "Larva" (bukan 2 route terpisah, karena
   kedua tipe berbagi wilker & AI budget yang sama). Dewasa tampilkan
   overlay cuaca (suhu/kelembapan/fase bulan/cuaca, checkbox toggle
   seperti chartANO di EPIC-AI). Larva tampilkan cidukan+jumlah larva.
   Konteks AI: "vektor-anopheles-dewasa-mingguan" atau "...-larva-...".

4. app/(dashboard)/dashboard/vektor/diare-lalat/page.tsx dan
   /diare-kecoa/page.tsx: DUA route terpisah (bukan toggle), karena
   threshold beda (Fly Index vs Kepadatan/m²) dan rekomendasi AI-nya
   tidak boleh tercampur (ikuti larangan di prompt EPIC-AI: "JANGAN
   sebut kepadatan kecoa dalam analisis lalat" dan sebaliknya).

5. Semua halaman: sisipkan TombolAnalisisAI (dari Segmen 4, TIDAK
   dibuat ulang) dengan konteks sesuai masing-masing.

KRITERIA SELESAI:
- Hub /dashboard/vektor menampilkan 5 kartu, semua mengarah ke route
  yang benar.
- Filter zona/sub-lokasi di Aedes hanya muncul untuk WK01.
- Toggle Dewasa/Larva di Anopheles tidak reload halaman penuh.
- Diare Lalat dan Diare Kecoa benar-benar terpisah datanya (verifikasi:
  ubah filter di satu halaman tidak memengaruhi data di halaman lain).

  [Salin KONTEKS PROYEK lengkap + tambahan, lalu tempel ini]

TUGAS SEGMEN 13: Perluas infrastruktur AI dari Segmen 9 agar menampung
9 kegiatan baru, dan migrasikan prompt builder dari EPIC-AI Code.gs
TANPA menulis ulang logikanya dari nol.

Lakukan:
1. ALTER TABLE riwayat_analisis_ai: tambah kolom filter_tambahan jsonb
   NULLABLE. Update index idx_riwayat_ai_lookup supaya menyertakan
   filter_tambahan dalam pengecekan cache harian.

2. Buat lib/ai/promptBuilders/ berisi 7 file (dbd.ts, tikus.ts,
   anopheles.ts, diare.ts, malaria.ts, tb.ts, hiv.ts) — PINDAHKAN
   logika dari fungsi buildPromptAI_() di Code.gs APA ADANYA (termasuk
   larangan rekomendasi silang untuk Tikus, instruksi korelasi cuaca
   untuk Anopheles Dewasa, pemisahan lalat/kecoa untuk Diare). Ubah
   hanya sintaks (JS GAS -> TypeScript), JANGAN ubah isi instruksi ke
   Gemini karena itu sudah teruji hasilnya.

3. Update app/api/analisis-ai/route.ts (dari Segmen 9): tambahkan
   parameter filterTambahan di body request, pilih promptBuilder yang
   sesuai berdasarkan konteks, sertakan filterTambahan dalam query cache
   dan dalam pemanggilan promptBuilder.

4. TombolAnalisisAI (Segmen 4) TIDAK PERLU diubah — sudah generic lewat
   props konteks. Cukup pastikan setiap halaman baru (Segmen 11-12)
   mengirim filterTambahan lewat props tambahan kalau relevan (zona,
   subLokasi, vektorType, tipeAno).

5. Buat panduan singkat (komentar di kode, bukan dokumen terpisah)
   tentang cara menambah kegiatan baru di masa depan: buat 1 file
   promptBuilder baru + 1 entry konteks — TIDAK perlu ubah route
   handler atau TombolAnalisisAI.

KRITERIA SELESAI:
- Analisis AI untuk vektor-tikus tetap menolak rekomendasi fogging/
  insektisida (larangan dari prompt lama tetap berlaku).
- Analisis AI untuk diare-lalat tidak pernah menyebut kecoa, dan
  sebaliknya.
- Cache harian bekerja per kombinasi konteks+filterTambahan (uji: AI
  untuk Anopheles Dewasa WK01 dan Anopheles Larva WK01 harus dianggap
  2 entry cache berbeda, bukan 1).
- Tamu tetap ditolak 403 di endpoint ini, sama seperti Segmen 9.