# Rencana Migrasi EPIC-AI ke MariaDB (cPanel BKK Kelas I Samarinda)

> **Dokumen hidup.** Simpan di repo (`docs/MIGRASI_MARIADB.md`), commit setiap kali diperbarui.
> Dokumen ini dibuat agar sesi/akun Claude mana pun yang membacanya bisa **langsung melanjutkan** tanpa riwayat chat sebelumnya.
> Terakhir diperbarui: 26 Oktober 2026 (dua dokumen dari dua akun Claude digabung; Tahap 3 selesai dan terbukti, Tahap 4 skema+view selesai, tersisa skrip data dan adapter klien).

---

## 0. Cara melanjutkan di sesi atau akun Claude baru

1. Clone repo: `git clone https://github.com/syafakkpsmd/surveilans-epidemiologi-bkk.git`
2. Buka chat baru, tempel prompt ini:

   ```
   Saya melanjutkan migrasi EPIC-AI ke MariaDB. Repo: https://github.com/syafakkpsmd/surveilans-epidemiologi-bkk.git
   Clone repo, baca docs/MIGRASI_MARIADB.md sampai habis, lihat bagian "Log Status" untuk tahu posisi terakhir,
   lalu lanjutkan dari langkah berikutnya yang belum dicentang. Jangan mengulang inventaris yang sudah ada.
   Jangan minta password; saya hanya akan mengirim hasil perintah tanpa kredensial.
   ```
3. Kalau repo private, beri token GitHub **read-only sementara** (cabut setelah selesai) atau upload repo sebagai zip.
4. Setiap kali sebuah langkah selesai: perbarui checklist (bagian 4) dan **Log Status** (bagian 8), lalu commit.

Catatan: memori Claude terikat ke akun. Akun baru **tidak** tahu isi chat ini. Semua yang penting harus ada di dokumen ini dan di repo.

---

## 1. Tujuan

Memindahkan basis data aplikasi EPIC-AI (Next.js) ke **MariaDB 10.11.19** di hosting cPanel kantor, menggantikan dua layanan cloud saat ini: **Turso** dan **Supabase**.

## 1b. Perubahan arah produk (ditetapkan pengguna, 23 Okt 2026)

Setelah migrasi ke MariaDB kantor, **Google Sheets tidak dipakai lagi**:
- **Data pengukuran harian**: diinput langsung lewat form di aplikasi **dan** bisa diunggah dalam bentuk Excel.
- **Data rekap dari Sinkarkes**: sambil menunggu API, disediakan tombol **unggah Excel**.
- Di dashboard, menu **Data → Input Data** memuat sub menu yang menampilkan **seluruh data yang diinput dan diunggah**.

Dampak ke rencana:
- Sinkronisasi Apps Script ke endpoint API **tidak perlu ditulis ulang** (dibatalkan). Gantinya adalah Tahap 3b di bawah.
- Tata letak kolom Google Sheet saat ini tetap penting: template Excel dibuat **sama dengan tata letak Sheet**, sehingga file ekspor dari Sheet lama bisa langsung diunggah.
- Kunci unik lama `(wilayah_kerja, no_baris)` berasal dari nomor baris Sheet dan **tidak cocok** untuk input langsung/Excel; perlu mode unggah yang aman diulang (lihat Tahap 3b).

Keputusan desain unggah (usulan, menunggu konfirmasi):
- **Pilihan Tahun di dialog unggah: ya, perlu.** Default tahun berjalan, rentang `tahun-5` sampai `tahun+1`. Fungsinya: (1) validasi, baris di luar tahun terpilih ditandai; (2) mode **"ganti data modul + wilayah + tahun"** agar unggah ulang tidak menggandakan baris; (3) mengisi tahun bila file rekap hanya berisi bulan/minggu. Tahun berikutnya dibutuhkan karena Posko Nataru melintasi pergantian tahun.
- Alur: pilih modul → pilih tahun → pilih file → **pratinjau dan daftar kesalahan per baris** → konfirmasi → tercatat di **riwayat unggah** (siapa, kapan, nama file, jumlah masuk/ditolak).
- Pustaka: pakai **`exceljs`** (sudah ada di repo, dipakai 9 tempat). Paket npm **`xlsx` 0.18.5 punya kerentanan yang diketahui saat membaca berkas buatan khusus** dan tidak mendapat perbaikan di npm; jangan dipakai untuk membaca unggahan, dan sebaiknya dihapus dari `package.json` bila tidak terpakai. Pakai ulang `components/ui/TombolUnduhTemplateExcel.tsx` dan pola di `lib/karhutla/excel.ts`.

## 2. Fakta lingkungan (sudah dikonfirmasi dari tangkapan layar)

| Hal | Nilai |
|---|---|
| Database tujuan | **MariaDB 10.11.19** (bukan MySQL 8), phpMyAdmin 5.2.3 |
| Koneksi | `localhost` via UNIX socket (hanya dari server itu sendiri) |
| Charset server | `latin1`, **database baru wajib dibuat `utf8mb4` / `utf8mb4_unicode_ci`** |
| PHP | 8.4.27 |
| cPanel internal | `cpanel.bkksmr.id` (aplikasi internal, user DB `bkksmrtech`) |
| cPanel publik | `cpanel.bkksamarinda.or.id` (hampir kosong, 3 MB) |
| Node.js | Tema **Jupiter** tidak menampilkannya, tetapi tema **Meridian** punya **Websites & Apps → Add Website → AI App Hosting** (deploy Node.js dari Git/file, build dan start otomatis, HTTPS). Domain akun: `bkksmr.tech`, subdomain 0 (tanpa batas), "Add another domain" tidak tersedia di paket. PHP situs: 8.2 |
| Tersedia di cPanel | SSH Access, Remote Database Access, Git Version Control, Cron Jobs |

Konsekuensi untuk kode (MariaDB, bukan MySQL 8):
- Tidak ada collation `utf8mb4_0900_ai_ci`, pakai `utf8mb4_unicode_ci`.
- Tipe `JSON` hanya alias `LONGTEXT`; operator `->` / `->>` **tidak ada**, pakai `JSON_EXTRACT` / `JSON_UNQUOTE`.
- Window function, CTE, `INSERT ... RETURNING`, `JSON_TABLE` tersedia.
- Tidak ada sintaks `INSERT ... AS alias ON DUPLICATE KEY UPDATE` (khusus MySQL 8.0.19+); pakai `VALUES(kolom)`.

## 3. Hasil inventaris repo (Tahap 0, selesai)

Aplikasi memakai **dua database + sistem login**:

- **Turso (libSQL/SQLite)**: sekitar 62 file. Modul yang disinkronkan dari Google Sheets lewat Apps Script: HIV, TB, KIER, SKLT, poliklinik, ICV/modul klinik, SIAOS/stok, migrasi malaria, penumpang kapal, posko, perbaikan pengawasan klinik. Sekitar 20 tabel. Klien: `lib/turso/client.ts`.
  File query utama: `lib/turso/{hiv,kier,poliklinik,sklt,tb,queriesHivVct,queriesMigrasiMalaria,queriesModulKlinik,queriesPenumpangKapal,queriesSiaos,queriesTb}.ts`, `lib/klinik/{dataset,stok-queries,deteksi-klinik-baru,turso-queries}.ts`, `lib/posko/queries.ts`, `lib/pengawasan-klinik/perbaikan.ts`, `lib/status-laporan/queriesLaluLintasOrang.ts`, `lib/laporan-bulanan/modul/*.ts`, `lib/ai/{data,migrasiMalaria}.ts`, `lib/karhutla/ispaPoliklinik.ts`, serta route di `app/api/**` dan halaman di `app/(dashboard)/**`.
- **Supabase (PostgreSQL)**: sekitar 167 file, sekitar 75 tabel dan view (kira-kira 40 view `view_*_mingguan/bulanan`), 2 fungsi RPC (`status_lapor_mingguan`, `status_lapor_bulanan`), RLS, service role. Contoh tabel: `profiles`, `klinik_binaan`, `kunjungan_tamu`, `hotspot_nasa_kaltim`, `ispa_harian`.
- **Supabase Auth**: sekitar 24 file, `proxy.ts` (auto-logout 25 menit), role `admin`, `petugas`, `petugas_klinik`, tabel `profiles`.
- **Di luar database**: Cloudinary (foto), Google Apps Script (`sql-dan-script/PoskoKirimTurso.gs` dan skrip di Google Sheets), cron berbasis `CRON_SECRET`, deploy di Vercel.

Variabel env yang dipakai: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `CRON_SECRET`, `GAS_SYNC_WEBAPP_URL`, `GAS_SYNC_WEBAPP_SECRET`, `NEXT_PUBLIC_CLOUDINARY_*`, `CLOUDINARY_API_KEY/SECRET`, `OPENSKY_CLIENT_ID/SECRET`, `NASA_FIRMS_MAP_KEY`, `NEXT_PUBLIC_SITE_URL`.

Sintaks SQLite yang harus diterjemahkan (jumlah file): `strftime` (9), `datetime('now')` (3), `ON CONFLICT` (4), `substr(` (3), `PRAGMA` (1). Tidak ada `INSERT OR REPLACE`, `AUTOINCREMENT`, `GROUP_CONCAT`, `json_extract`.

**Temuan penting:**
1. **DDL tidak lengkap di repo.** Hanya ada `sql/segmen3_kunjungan_tamu_dan_profiles.sql`, `sql-dan-script/posko_turso.sql`, `sql-dan-script/posko_ptm_jenis_kelamin.sql`. Skema Turso (selain posko) dan seluruh view/RPC/RLS Supabase **harus di-dump dari sumbernya**, tidak boleh ditebak dari kode.
2. **Server MariaDB hanya `localhost`.** Vercel dan Google Apps Script tidak bisa menjangkaunya. Sinkronisasi Sheets harus lewat endpoint API aplikasi (pola `GAS_SYNC_WEBAPP_SECRET` sudah ada).
3. **Hosting bisa menjalankan Node.js** lewat AI App Hosting (tema Meridian), tetapi batas memori/CPU untuk `next build` dan proses jalannya belum diuji (lihat bagian 5 dan Tahap 1b).
4. **Repo GitHub berstatus publik** (clone tanpa kredensial berhasil). Pemeriksaan 22 Okt 2026: tidak ada file `.env` yang ter-commit atau pernah masuk riwayat, dan tidak ada token terdeteksi; hanya nama host Turso tertulis di komentar `sql-dan-script/PoskoKirimTurso.gs` baris 10. Tetap disarankan menjadikan repo **private**.
5. **Nama tabel bentrok di dua database:** `hiv_data` dan `tb_data` ada di Turso (data individu, 188 dan 671 baris) **dan** di Supabase (tabel agregat lama dengan kolom berbeda, sekitar 2 dan 1 baris; juga `malaria_migrasi`, 0 baris). Versi Supabase hanya dipakai view `view_hiv_mingguan`, `view_tb_mingguan`, `view_malaria_mingguan` (`lib/supabase/queries.ts` baris 460-498). Saat digabung ke satu database MariaDB, versi Turso mempertahankan namanya; versi Supabase diganti nama `sb_hiv_data`, `sb_tb_data`, atau dibuang bila terbukti tidak dipakai (diputuskan di Tahap 4).
6. **Isi Supabase** (dari `supabase_schema.json`): tipe `uuid` (37 kolom), `jsonb` (7), array teks (2), `timestamptz` (47), `numeric` (61); 4 trigger `trg_hitung_*` (BEFORE INSERT, memanggil `hitung_indikator_*`) dan 2 trigger `updated_at`; fungsi `mmwr_week` dan `epi_week_start` dipakai banyak view mingguan; fungsi `is_admin` dipakai 103 policy RLS yang harus dipindah ke pemeriksaan role di server.

## 4. Rencana bertahap (centang saat selesai)

**Tahap 0: Inventaris**
- [x] Petakan arsitektur, modul, env, sintaks SQLite-spesifik

**Tahap 1: Persiapan (tugas pengguna, lihat bagian 6)**
- [ ] Hasil `SELECT VERSION();` di phpMyAdmin (sudah: 10.11.19-MariaDB)
- [x] Node.js tersedia: AI App Hosting di tema Meridian
- [x] Dump skema Turso (tanpa data): diterima 23 Okt 2026 (19 tabel, sekitar 54 ribu baris, tidak ada foto/PDF tersimpan)
- [x] Dump skema Supabase (tanpa data): diterima 23 Okt 2026 (46 tabel dasar, 44 view, 11 fungsi, 103 policy RLS, 6 trigger, sekitar 85 ribu baris perkiraan)
- [x] Jumlah akun Supabase Auth: **14**. Keputusan password lama: _(belum diputuskan; dengan 14 akun, reset password massal paling mudah dan aman)_
- [x] Keputusan lokasi hosting: cPanel `bkksmr.tech` via AI App Hosting, subdomain `next.bkksmr.tech`

**Tahap 1a: Setup lokal di VS Code (Windows)**
- [ ] Pasang Git, Node.js 22 LTS (minimal 20.9), VS Code, dan MariaDB 10.11 lokal (Docker `mariadb:10.11` atau installer MariaDB) + HeidiSQL/DBeaver
- [ ] Clone repo, `git checkout -b migrasi-mariadb`, `npm install`, isi `.env.local` dari Vercel, `npm run dev`, pastikan login dan dashboard jalan
- [ ] Catat **angka pembanding**: screenshot 8 sampai 10 halaman utama (angka kartu/grafik) dari versi sekarang, untuk dibandingkan setelah migrasi
- [ ] Salin `scripts/migrate/dump-turso-schema.mjs` dan `scripts/migrate/supabase-schema-export.sql` ke repo, jalankan, kirim hasil skema (bukan data)

**Tahap 1b: Uji deploy (aplikasi apa adanya, masih memakai Turso dan Supabase)**
Tujuan: memastikan hosting sanggup membangun dan menjalankan aplikasi sebelum migrasi data dimulai.
- [ ] Jadikan repo GitHub **private** (Settings → Danger Zone → Change repository visibility), lalu siapkan deploy key SSH read-only untuk cPanel, atau pakai opsi "Upload a file"
- [ ] cPanel (tema Meridian): Websites & Apps → Add Website → Create a subdomain (`next`) → AI App Hosting → Git repository
- [ ] Isi variabel env di panel (salin dari Vercel; **jangan kirim nilainya ke chat**); set `NEXT_PUBLIC_SITE_URL=https://next.bkksmr.tech`
- [ ] Supabase → Authentication → URL Configuration: tambahkan `https://next.bkksmr.tech` ke Site URL / Redirect URLs
- [x] **Percobaan 1 (24 Okt 2026):** Node 22 + npm; `npm install` 36 detik; **kompilasi (63 dtk) dan TypeScript (46 dtk) berhasil, jadi memori server cukup untuk `next build`**. Gagal di tahap "Collecting page data" karena env belum diisi dan tiga file membuat klien saat modul dimuat: `lib/turso/kier.ts` (baris 11), `lib/turso/sklt.ts` (baris 5), dan `components/nasional-emerging/DashboardNasionalEmerging.tsx` (klien Supabase, baris 29). Perbaikan: `perbaikan-build-env.patch` (klien dibuat saat dipakai); **diuji `next build` di sandbox tanpa env sama sekali: berhasil, 144 dtk**.
- [ ] Terapkan patch ke `main`, isi variabel env di panel (daftar di bawah), **Retry Deploy**, lalu uji: halaman login terbuka, login berhasil, dashboard menampilkan data, koneksi ke Turso/Supabase/Cloudinary jalan. Bila login atau data dari browser gagal, curigai `NEXT_PUBLIC_*` tidak ikut terbaca saat build (panel menyebut env dibaca saat runtime)
- Env yang dipakai kode: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CRON_SECRET`, `GAS_SYNC_WEBAPP_URL`, `GAS_SYNC_WEBAPP_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `NASA_FIRMS_MAP_KEY`, `NEXT_PUBLIC_SITE_URL` (isi dengan alamat aplikasi yang dipilih di cPanel)
- Panel cPanel punya tombol **"Add Database"** yang menyuntikkan detail koneksi sebagai variabel env. Jangan dipakai untuk uji ini (kode masih ke Turso/Supabase). Dipakai pada deploy versi MariaDB; nama variabel yang disuntikkan harus dicek (tombol "Reveal values") lalu disesuaikan dengan `lib/db/client.ts`
- [ ] Jika build gagal karena memori: build di komputer dengan `output: 'standalone'` lalu deploy lewat "Upload a file"
- Selama uji, cron Vercel dan Apps Script tetap menunjuk Vercel; jangan dipindah dulu.

**Tahap 2: Lapisan akses data**
- [x] `lib/db/client.ts` (pool `mysql2`, `execute`/`batch`/`transaction`, UTC, `utf8mb4`, `dateStrings`, `decimalNumbers`). Selesai 23 Okt 2026, **18 uji lulus** di MariaDB 10.11 lewat socket dan TCP (tipe, agregat jadi number, upsert, BLOB, batch/transaksi, zona waktu); `tsc --strict` bersih. Pasang dependensi: `npm install mysql2`
- [x] `lib/turso/client.ts` kini hanya `export { getDbClient as getTursoClient }`, jadi **27 file** yang memanggil `getTursoClient()` tidak perlu diubah dulu. **Belum tercakup:** `lib/turso/tb.ts` dan `lib/turso/poliklinik.ts` membuat klien libsql sendiri (`createClient`), dan `lib/turso/queriesMigrasiMalaria.ts` memakai tipe `InValue`; ketiganya diubah manual di Tahap 3
- [x] Env baru: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (atau `DB_SOCKET`), `DB_POOL_SIZE`; contoh di `env.mariadb.example`

**Tahap 3: Modul Turso → MariaDB**
- [x] `schema/mariadb/01_turso_modules.sql` (19 tabel Turso). Selesai 23 Okt 2026 dan **diuji di MariaDB 10.11.14**: terpasang bersih, bisa dijalankan ulang, upsert `ON DUPLICATE KEY UPDATE`, karakter unicode, CHECK posko, dan mode strict (tanggal tidak valid ditolak, tidak dipotong diam-diam)
- [x] Terjemahan SQL SQLite → MariaDB di kode aplikasi (24 Okt 2026): `strftime` → `DATE_FORMAT` (24 tempat, 8 file); `datetime('now')` → `UTC_TIMESTAMP()` (5); `ON CONFLICT ... excluded.x` → `ON DUPLICATE KEY UPDATE ... VALUES(x)` (6 pernyataan, 4 file); `CAST(x AS INTEGER)` → `SIGNED` (4); `ORDER BY rowid` → `id` (poliklinik, siaos, sklt) atau `no_baris` (kier) (**ditemukan lewat uji asap**, bukan lewat pencarian teks); galat "no such table" kini lewat `lib/db/errors.ts` (6 file); pembanding `tanggal <> ''` pada kolom DATE dihapus (2). Klien libsql lokal di `tb.ts` dan `poliklinik.ts` dihapus (kini memakai klien bersama). Konstanta HIV dipisah ke `lib/turso/hivKonstanta.ts` karena komponen client tidak boleh menyeret `mysql2` ke bundel browser. Hasil: `tsc` bersih, `next build` berhasil tanpa env, dan **uji asap 77 fungsi query lulus 0 galat** pada MariaDB 10.11 berisi data uji
- [x] Uji asap pada MariaDB lokal berisi **data asli** (pengguna, 24 Okt 2026): **0 galat**. Dari 12 hasil kosong: 5 adalah filter Oktober + Samarinda (logika filter terbukti sama dengan hitungan langsung di data uji; kemungkinan memang belum ada data Oktober), 1 sklt tanpa kolom wilayah (memang begitu), 1 periode Idul Fitri belum dibuat, 5 klinik/stok/ICV memakai ID spreadsheet uji yang sengaja palsu. Bagian status laporan yang membaca Supabase mencetak "cookies was called outside a request scope": batasan harness (butuh konteks request Next.js), bukan galat migrasi
- [x] Angka dashboard (`npm run dev`) dibandingkan dengan angka pembanding: **cocok** (pengguna, 24 Okt 2026). **Migrasi Turso terbukti.**
- [x] `scripts/migrate/turso-to-mariadb.mjs` (baca Turso, tulis MariaDB, bandingkan jumlah baris). Selesai dan **diuji** dengan sumber SQLite berisi kasus tepi: `--dry-run` tidak menulis; aman diulang; id asal dan AUTO_INCREMENT terjaga; NIK 16 digit utuh; ISO `Z` dan `+08:00` dikonversi ke UTC; unicode dan emoji utuh; BLOB identik; tanggal rusak pada kolom wajib dilewati dan dilaporkan; tanggal rusak pada kolom opsional jadi NULL dan dilaporkan; nilai kepanjangan dicatat sebagai GAGAL (tidak dipotong diam-diam). Laporan di `data-export/migrasi_laporan.txt`
- [~] ~~Ubah sinkronisasi Sheets (GAS) agar menulis lewat API~~ **Dibatalkan**: Sheets tidak dipakai lagi (bagian 1b). Digantikan Tahap 3b. File `sql-dan-script/PoskoKirimTurso.gs` dan route `app/api/sync-stok/route.ts`, `app/api/klinik/sync-stok/route.ts` dinonaktifkan/dihapus di Tahap 3b.
- [x] Data Turso → MariaDB **lokal** dipindahkan oleh pengguna (23 Okt 2026): 19 tabel; 18 lengkap; `data_penumpang_kapal` 221 dari 225 (4 baris dilewati karena tanggal tidak standar: `-`, `01 OKT 2026`, `06 OKT 2026`, `12 OKT 2026`). Skrip diperbarui agar membaca tanggal bernama bulan (Indonesia/Inggris) dan menganggap `-` sebagai kosong; setelah dijalankan ulang 3 baris ikut masuk, 1 baris (`-`) tetap dilewati karena tidak punya tanggal tiba. **Catatan:** dashboard lama mengabaikan baris bertanggal `01 OKT 2026` (strftime menghasilkan NULL), jadi angka Oktober 2026 pada lalu lintas orang akan 3 baris lebih banyak dari dashboard lama; itu koreksi, bukan galat.
- [x] Verifikasi jumlah baris dan agregat: selesai (jumlah baris = sumber; angka dashboard cocok)

**Tahap 3b: Input data dan unggah Excel (menggantikan Google Sheets)**
- [x] Klasifikasi modul (dikonfirmasi pengguna 24 Okt 2026). **Rekap Sinkarkes, hanya unggah Excel:** lalu lintas orang (ABK/crew/penumpang pesawat), SIAOS, SKLT. **Input harian langsung + unggah Excel:** poliklinik, HIV, TB, KIER, migrasi malaria, posko, stok vaksin. **Penumpang kapal (`data_penumpang_kapal`): form input manual**, karena datanya diterima langsung dari agen kapal (unggah Excel opsional). **ICV (`data_icv`): belum diklasifikasi**
- [ ] Skema pendukung: tabel `upload_riwayat` (modul, tahun, nama_file, jumlah_baris, jumlah_masuk, jumlah_ditolak, dibuat_oleh, dibuat_pada); kolom `sumber` (`migrasi`/`input`/`upload`) dan `batch_id` pada tabel data; keputusan kunci unik untuk data non-Sheets
- [ ] Template Excel per modul (kolom = tata letak Google Sheet saat ini). **Dibutuhkan dari pengguna:** baris judul kolom tiap Sheet (tanpa data)
- [ ] Alur unggah: modul → tahun → file → pratinjau + kesalahan per baris → konfirmasi → riwayat; parser memakai `exceljs`; batas ukuran file; hanya role berizin
- [ ] Form input harian per modul
- [ ] Menu **Data → Input Data**: daftar seluruh data input dan unggahan (filter modul, tahun, wilayah, sumber; ubah, hapus, unduh)
- [ ] `xlsx` **masih dipakai** di 5 file, hanya untuk MENULIS Excel (`PengawasanKlinikClient.tsx`, `TabelDataKarhutla.tsx`, `RekapTabelWilkerBulan.tsx`, `TombolUnduhTemplateExcel.tsx`, `lib/karhutla/excel.ts`); jangan dihapus. Kerentanan paket npm 0.18.5 menyangkut MEMBACA berkas berbahaya, jadi pembacaan unggahan baru wajib memakai `exceljs`. Memindahkan 5 file itu ke `exceljs` opsional. Hapus skrip dan route sinkronisasi GAS

**Tahap 3c: Penyeragaman wilayah kerja (permintaan pengguna, 24 Okt 2026)**
Temuan inventaris: (a) **13+ daftar wilayah kerja ditulis ulang di kode** (kier 5, TB 7, poliklinik 5, posko 3, `status-laporan/core.ts`, `data/wilker-lokasi.ts`, karhutla, COP, PHQC, peta x3, filter periode, master tabel, rute AI); (b) nama kolom beda-beda: `wilker` (2 tabel Turso), `wilayah_kerja` (17 tabel Turso, 10 tabel Supabase), `kode_wilker` (15 tabel Supabase), `wilayah` (`statistik_kunjungan`); (c) isi kolom memakai nama pendek (`Samarinda`, `APT Pranoto`) sedangkan `core.ts` dan `wilker_ref` memakai nama panjang dan kode **WK01-WK07** (WK01 Samarinda, WK02 Tanjung Santan, WK03 Tanjung Laut, WK04 Lhoktuan, WK05 Sangatta, WK06 Sangkulirang, WK07 APT Pranoto); (d) malaria mencocokkan wilayah dengan `LIKE '%kata kunci%'`; (e) Supabase **sudah punya** `wilker_ref` (10 baris: kode, nama, jenis, lat, lng, sub_lokasi) dan `wilker_nama_alias` (12 baris: teks → kode) yang bisa menjadi dasar master.
Usulan desain (belum disetujui):
- [ ] Kunci baku = **`kode_wilker` (WK01-WK07)** di semua tabel data; tabel master `wilker_ref` + `wilker_nama_alias` dibawa ke MariaDB; nama tampilan (pendek/panjang), jenis (pelabuhan/bandara), urutan, dan status aktif disimpan di master
- [ ] Nama kolom seragam; kolom lama (`wilker`/`wilayah_kerja`) dipertahankan sementara untuk pembandingan sebelum/sesudah, lalu dihapus
- [ ] **Satu sumber di kode** (`lib/wilayah-kerja/`): daftar, tipe, `kodeDariTeks()`, `namaDariKode()`; seluruh daftar hardcode diganti. Cakupan per modul (TB 7, poliklinik/kier 5, posko 3) menjadi konfigurasi subset dengan kode baku, bukan daftar baru
- [ ] Form input memakai dropdown dari master; unggahan Excel memetakan teks bebas lewat alias dan **menolak dengan pesan jelas** bila wilayah tidak dikenal
- [ ] **Dikerjakan sebagai langkah terpisah SETELAH paritas angka dashboard terbukti** (patch terjemahan SQL diverifikasi lebih dulu), agar selisih angka tidak bercampur antara efek migrasi dan efek penyeragaman
- **Hasil `cek-wilayah-kerja.sql` (pengguna, 24 Okt 2026): data sangat bersih.** Semua nilai persis salah satu dari 7 nama pendek, tanpa varian huruf besar/kecil atau spasi, kecuali `migrasi_malaria` yang memakai nama panjang `Pelabuhan Samarinda` (414 baris; 71 baris lain `Sangkulirang`). Cakupan nyata per tabel: HIV 3 wilayah, malaria 2, kapal 2, SKLT 1 (APT Pranoto), SIAOS 3, KIER 4, poliklinik 5, TB 7. Dengan demikian pekerjaan penyeragaman terutama ada di **kode**, bukan di data.
- [x] **Langkah A (24 Okt 2026): selesai dan dijalankan pengguna** (3751 baris terpengaruh; laporan 1: `belum` = 0 di semua tabel; laporan 2: kosong). Berkas dinamai ulang menjadi `schema/mariadb/03_wilayah_kerja.sql` agar tidak bentrok nomor dengan `02_supabase_tables.sql`; definisi dua tabel master di dalamnya kini salinan persis dari berkas Supabase pengguna. `03_wilayah_kerja.sql` menambah `wilker_ref`, `wilker_nama_alias` (bentuk sama dengan Supabase), benih 7 wilayah + 14 alias (nama pendek dan panjang), kolom `kode_wilker` + indeks di 12 tabel data, mengisinya lewat alias, dan mencetak laporan (`belum` harus 0). **Hanya penambahan**: kolom lama dan semua kueri tidak berubah, jadi angka dashboard tidak bergeser. Uji: spasi/huruf kecil terpetakan, nama panjang terpetakan, varian tak dikenal dilaporkan, dijalankan dua kali menghasilkan 0 perubahan. Jalankan dengan `scripts/migrate/jalankan-sql.mjs`
- [x] **Langkah B-1 (24 Okt 2026): selesai dan teruji.** `lib/wilayah-kerja/index.ts` (murni, aman untuk komponen client) menjadi satu-satunya sumber daftar WK01-WK07 dengan tiga bentuk nama (`nama` panjang, `namaPendek`, `namaPeta`), tipe `KodeWilker`, dan penerjemah `kodeDariTeks()` yang mengenali kode, nama panjang/pendek, `TanjungSantan`, `Tanjung_Santan`, `Pelabuhan Laut X` (penulisan tak dikenal seperti `Tg. Laut` ditolak, tidak ditebak). **7 daftar duplikat diganti turunannya**: `karhutla/constants` NAMA_WILKER, `ai/data` NAMA_WILKER, `queriesMigrasiMalaria` KODE_KE_KATA_KUNCI_WILKER, `status-laporan/core` DAFTAR_WILKER, `peta/KelolaFasilitasClient`, `peta/WilkerSelector`, `peta/FormFasilitas`. Verifikasi: nilai turunan **sama persis** dengan nilai lama (`scripts/migrate/uji-wilayah-kerja.ts` + rekaman `wilker_snapshot_lama.json`), kode vs tabel master di DB, `tsc` bersih, `next build` berhasil, uji asap 77 fungsi tetap lulus. Dua cacat hasil edit otomatis ditemukan dan diperbaiki sebelum dikirim: impor terpasang sebelum direktif `"use client"` dan token `as const` yang tertinggal. Patch: `langkah-b-wilayah-kerja.patch` + `langkah-b-berkas-baru.zip`
- [ ] **Langkah B-2 (belum):** daftar bentuk enum/kunci tanpa spasi yang anggotanya berbeda-beda (6 pelabuhan vs 7 dengan bandara): `app/(dashboard)/cop/page.tsx`, `phqc/page.tsx`, `alat-angkut/page.tsx`, `simulasi-wabah/kapal/page.tsx`, `components/FilterPeriodeWilayah.tsx`, urutan/warna di `lib/laporan-bulanan/modul/*`, `LOKASI_KUALITAS_UDARA`, `mock-data`. Perlu konfigurasi cakupan per modul dan dikerjakan satu per satu dengan uji kesamaan seperti B-1
- [ ] **Langkah B-3 (belum):** kueri memfilter `kode_wilker` (UI tetap mengirim nama, diterjemahkan lewat `kodeDariTeks`); dibandingkan dengan sidik hasil sebelum/sesudah pada data asli
- **Temuan koordinat (perlu diverifikasi pengguna):** `lib/data/wilker-lokasi.ts` dan `components/peta/PetaWilker.tsx` memuat dua definisi "pusat" yang berbeda untuk wilayah yang sama. Selisih (dihitung): WK01 3.2 km (pelabuhan vs pusat kota, wajar), WK02 0.0 km, WK03 0.1 km, WK04 4.5 km, WK05 1.1 km, WK07 0.0 km, tetapi **WK06 Sangkulirang selisih 110.8 km** (lat 1.987437 vs 0.991061). Nilai 1.987437 kemungkinan salah ketik (seharusnya sekitar 0.99); `lib/karhutla/infografis-utils.ts` memakai koordinat itu untuk mengaitkan titik panas dengan wilker terdekat. Benih `wilker_ref` di `03_wilayah_kerja.sql` menyalin nilai tersebut sebagai placeholder; koordinat asli ada di tabel `wilker_ref` Supabase dan harus menimpanya saat Tahap 4 (impor memakai upsert, bukan INSERT biasa)
- [ ] **Langkah C:** setelah semua kueri beralih dan terbukti, kolom lama (`wilker`/`wilayah_kerja`) dihapus atau dijadikan turunan

**Tahap 4: Supabase → MariaDB** (digabung dari dua akun, 26 Okt 2026)
- **Urutan menjalankan SQL:** `01_turso_modules.sql` → `02_supabase_tables.sql` → `03_wilayah_kerja.sql` → `04_supabase_views.sql`. Berkas 02, 03, dan 04 memakai `DELIMITER` atau trigger/fungsi: jalankan lewat `node --env-file=.env.local scripts/migrate/jalankan-sql.mjs <berkas.sql>`, klien `mariadb` CLI, atau phpMyAdmin (bukan `mysql2` apa adanya).
- [x] `02_supabase_tables.sql`: **44 tabel dasar Supabase** (46 dikurangi tabel dummy `hiv_data`/`tb_data`) + 4 trigger `trg_hitung_*` + padanan `updated_at` (`ON UPDATE CURRENT_TIMESTAMP`). Diuji MariaDB 10.11.14 mode strict, idempoten, diaudit otomatis terhadap `schema-dump/supabase_schema.json` (kolom, PK/UNIQUE, FK, CHECK: nol beda); trigger hitung diuji diferensial vs plpgsql asli (203.094 sel, nol beda)
- [x] **Keputusan (26 Okt 2026): `hiv_data` dan `tb_data` Supabase adalah tabel dummy, DIBUANG**, begitu juga `view_hiv_mingguan`, `view_tb_mingguan`, fungsi `getRingkasanHiv`/`getRingkasanTb` di `lib/supabase/queries.ts` (tidak dipanggil di tempat lain) dan tipe terkait. HIV dan TB di dashboard memakai tabel Turso `hiv_data`/`tb_data` (tidak terpengaruh). Tabel `malaria_migrasi` Supabase tetap ada
- [x] `04_supabase_views.sql`: **42 view**, fungsi `epi_week1_start`/`epi_week_start`/`mmwr_tahun`/`mmwr_minggu`, dan prosedur `status_lapor_bulanan`/`status_lapor_mingguan` (menggantikan 2 RPC; panggil `CALL status_lapor_mingguan(?, ?)`, baris ada di `rows[0]`). **Diverifikasi diferensial terhadap PostgreSQL 16 yang menjalankan view dan fungsi ASLI** dengan data sintetis identik (12 seed, nol perbedaan pada lebih dari 180 ribu baris); fungsi minggu epidemiologi nol beda pada 25.933 tanggal; prosedur nol beda pada 30 periode; probe kolasi 11/11; view lolos `ONLY_FULL_GROUP_BY`
- **Penggabungan dua akun:** akun A menulis `03_supabase_views.sql` (kini `04_supabase_views.sql`), akun B menulis `04_fungsi_epid.sql` + `05_views.sql` (42 view, belum selesai diuji). Keduanya mengerjakan hal yang sama. **Dipakai: versi akun A** (sudah terbukti terhadap PostgreSQL asli dan memperhitungkan kolasi). Versi akun B dipindah ke `schema/mariadb/_arsip/` (jangan dijalankan). `02_wilayah_kerja.sql` (versi lama) dan salinan ganda `bersihkan-master-wilker.sql` di folder schema dihapus
- **Kelemahan fungsi minggu epidemiologi (ikut tersalin, sengaja, agar angka tidak bergeser):** pada tahun ketika 1 Januari tahun berikutnya jatuh hari Minggu-Rabu, tanggal akhir Desember yang menurut MMWR masuk minggu 1 tahun berikutnya dihitung "minggu 53" tahun berjalan. 53 dari 21.915 tanggal (2010-2069) berbeda dari aturan MMWR, antara lain 30-31 Des 2018, 29-31 Des 2019, 31 Des 2023, 29-31 Des 2024. Periode Nataru 2026/2027 aman. `lib/epi-week.ts` memuat logika sama (harus sinkron). **Keputusan pengguna: _(belum diputuskan: perbaiki di kedua tempat, atau biarkan)_**
- [ ] Ukur kolom `numeric` tanpa presisi (61 kolom), panjang `text`, pecahan detik, dan kolom identity: jalankan `scripts/migrate/supabase-column-stats.sql` di Supabase SQL Editor, simpan sebagai `schema-dump/supabase_column_stats.json` (hanya angka agregat). Kolom bertanda `[VERIFIKASI]` di `02_supabase_tables.sql` (sementara `DECIMAL(38,18)`) dipersempit setelahnya. **Catatan:** skrip `supabase-column-stats.sql` dibuat akun A dan mungkin belum ada di repo; bila tidak ada, minta dibuat ulang
- [~] **`scripts/migrate/supabase-to-mariadb.mjs`** (26 Okt 2026): **ditulis; belum dijalankan pada MariaDB/Supabase asli.** Membaca Supabase langsung lewat Postgres (`SUPABASE_DB_URL`, paket `pg`: `npm install --save-dev pg`), transaksi read-only; menulis dengan upsert PK; memaksa koneksi utf8mb4 + mode strict (berhenti bila tidak); `SET @lewati_trigger_hitung = 1`; melewati `hiv_data`/`tb_data`; baris bermasalah dicatat per PK tanpa isi data; verifikasi per kolom (hitung, jumlah angka, min/maks tanggal, panjang teks) dan pemeriksaan baris yatim FK; opsi `--dry-run` dan `--tabel=`; laporan di `data-export/supabase_migrasi_laporan.txt`. Fungsi murninya diuji (`node --test scripts/migrate/uji-supabase-migrasi.mjs`, 9 uji lulus) dan pembacaan tipe Postgres nyata (numeric, timestamptz, jsonb, text[], date, time, boolean) diuji di PostgreSQL 16. **Sisi tulis ke MariaDB belum teruji**: jalankan `--dry-run` dulu, lalu satu tabel kecil (`--tabel=wilker_ref`), baru semua
- [ ] `scripts/migrate/bandingkan-view.mjs` ditulis (membandingkan keluaran tiap view Supabase vs MariaDB per kolom, tanpa mencetak isi data); jalankan setelah migrasi data tanpa masalah
- [ ] Gantikan klien `supabase.from(...)` (sekitar 167 file) dengan query builder/adapter, bertahap per modul agar aplikasi selalu bisa jalan
- [ ] `is_admin()` dan 103 policy RLS → pemeriksaan role di server (Tahap 5)
- [ ] Verifikasi agregat dashboard (lama vs baru)

**Tahap 5: Autentikasi**
- [ ] Tabel `users` (email, password hash argon2/bcrypt, role, aktif), tabel `sessions`
- [ ] Login/logout, cookie sesi `httpOnly`, `secure`, `sameSite`
- [ ] Ganti RLS dengan pemeriksaan role di server (penting: RLS tidak ada di MariaDB)
- [ ] Pasang kembali auto-logout 25 menit di `proxy.ts`
- [ ] Migrasi akun (atau reset password massal)

**Tahap 6: Deploy dan cutover**
- [ ] Siapkan lingkungan hosting (bagian 5)
- [ ] Ganti cron Vercel dengan Cron Jobs cPanel (panggil endpoint dengan `CRON_SECRET`)
- [ ] Uji menyeluruh di staging, bandingkan angka dashboard lama vs baru
- [ ] Jadwal cutover, bekukan penulisan di sistem lama, migrasi data final, ganti DNS/URL
- [ ] Simpan Turso dan Supabase sebagai cadangan minimal 30 hari sebelum dihapus

## 5. Keputusan hosting (belum diputuskan)

cPanel internal dan publik **tidak** punya Node.js. Pilihan:

| Jalur | Isi | Catatan |
|---|---|---|
| 1 | Minta penyedia hosting mengaktifkan **Node.js Selector** (CloudLinux) | Paling bersih; aplikasi dan DB satu server. **Dicoba pertama.** |
| 2 | Aplikasi di server lain (VPS/server kantor) dengan **IP tetap**, daftarkan IP di *Remote Database Access* | Perlu penyedia hosting mengizinkan koneksi DB dari luar |
| 3 | Aplikasi tetap di Vercel + **gerbang PHP** di cPanel yang bicara ke MariaDB lokal | Bisa, tapi rawan keamanan dan menambah latensi; hanya jika 1 dan 2 mustahil |
| 4 | Tulis ulang ke PHP | Paling besar dan berisiko; pilihan terakhir |

Percobaan tambahan jalur 1: lewat SSH Access, cek `node -v`. Kalau belum ada, tanyakan ke penyedia hosting apakah memasang Node lewat `nvm` di akun diizinkan dan apakah proses yang berjalan lama tidak dimatikan otomatis.

**Keputusan (22 Okt 2026):** Jalur 1 tersedia lewat **AI App Hosting** di cPanel `bkksmr.tech`. Rencana: subdomain `next.bkksmr.tech`; uji deploy aplikasi apa adanya dulu (Tahap 1b). Jalur 2 sampai 4 menjadi cadangan jika uji gagal (misalnya memori build tidak cukup dan build lokal juga bermasalah).

**Pembaruan 23 Okt 2026:** pengguna memilih menguji **di localhost saja** dan memasang langsung ke `bkksamarinda.or.id` tanpa `next.bkksmr.tech`. Itu boleh, dengan syarat deploy pertama ke domain tujuan diperlakukan sebagai uji (aplikasi masih memakai Turso/Supabase, belum diumumkan) sebelum data dipindah. Yang **belum dikonfirmasi**: (a) akun cPanel `bkksamarinda.or.id` punya AI App Hosting (di tema Jupiter tidak tampil; cek lewat tema Meridian), (b) database MariaDB-nya dibuat **di akun yang sama** dengan aplikasi (koneksi hanya `localhost`), (c) pertimbangan data sensitif: aplikasi memuat data individual (NIK, HIV, TB) sehingga harus tetap di balik login dengan HTTPS di akun yang dipilih. Keputusan akun hosting: **(26 Okt 2026) tanpa uji di `next.bkksmr.tech`; uji di VS Code lokal lalu langsung push ke `bkksamarinda.or.id`.** Deploy percobaan 24 Okt di akun `bkksmr.tech` sudah berhasil (build dan login). Masih perlu dikonfirmasi: akun `bkksamarinda.or.id` punya AI App Hosting dan MariaDB di akun yang sama

## 6. Tugas pengguna: apa yang harus diambil dan dikirim

> **Keamanan:** jangan kirim password cPanel, password database, token, atau connection string ke chat. Hapus bagian password dari hasil sebelum dikirim.
> **Privasi data:** repo ini berisi aplikasi surveilans kesehatan (data HIV, TB, dan sejenisnya). **Jangan commit dump data ke GitHub** dan jangan kirim data pasien ke chat. Yang dikirim hanya **skema (tanpa data)**. Tambahkan ke `.gitignore`: `*.dump.sql`, `data-export/`, `.env*`.

1. **Versi database** (sudah: MariaDB 10.11.19).
2. ~~Cek Node.js~~ **Selesai:** tersedia lewat AI App Hosting (tema Meridian).
3. **Tanya IT/penyedia hosting (opsional):** batas memori dan CPU proses Node.js di paket ini, dan apakah proses dimatikan otomatis saat idle.
4. **Dump skema Turso (tanpa data):** (cara termudah di Windows: `node --env-file=.env.local scripts/migrate/dump-turso-schema.mjs`; alternatif CLI di bawah)
   `turso db shell NAMA-DB .schema > turso_schema.sql`
   Kalau CLI belum ada, minta saya skrip alternatif berbasis `@libsql/client`.
5. **Dump skema Supabase (tanpa data):** (cara termudah tanpa instalasi: jalankan `scripts/migrate/supabase-schema-export.sql` di Supabase SQL Editor; alternatif `pg_dump` di bawah)
   `pg_dump "CONNECTION_STRING_ANDA" --schema-only --schema=public --no-owner --no-privileges -f supabase_schema.sql`
   (connection string ada di Supabase → Project Settings → Database; pakai di komputer Anda saja). Isinya tabel, view, fungsi, dan policy. Kirim hanya file hasilnya setelah dicek tidak memuat password.
6. **Supabase Auth:** jumlah akun, dan jawab: apakah password lama harus tetap berlaku, atau semua pengguna boleh reset password?
7. **Backup:** unduh cadangan penuh Turso dan Supabase ke penyimpanan lokal sebelum migrasi data apa pun.
8. **Judul kolom tiap Google Sheet** (HIV, TB, KIER, SKLT, poliklinik, ICV, SIAOS, penumpang kapal, migrasi malaria, stok vaksin, posko): salin hanya **baris judul** (tanpa data pasien) ke satu file teks atau kirim sebagai tangkapan layar. Dipakai untuk membuat template Excel yang sama persis dengan tata letak Sheet. Skrip Apps Script tidak perlu disalin lagi.
9. **Varian wilayah kerja:** jalankan `scripts/migrate/cek-wilayah-kerja.sql` di MariaDB lokal dan kirim hasilnya (hanya nama dan jumlah baris, tanpa data pribadi).
10. **Berkas migrasi Supabase buatan sendiri** (10 berkas dalam 3 tahap): kirim hanya struktur dan skrip, **tanpa data dan tanpa kredensial**; sebutkan tahap mana yang sudah dijalankan di MariaDB lokal.

## 7. Konvensi teknis yang disepakati

- Database `utf8mb4`, collation `utf8mb4_unicode_ci`, engine InnoDB.
- Driver: `mysql2/promise` dengan pool; **semua query berparameter** (`?`), tanpa penggabungan string.
- Zona waktu: data lama SQLite memakai `datetime('now')` (UTC). Simpan sebagai `DATETIME` UTC dan konversi ke WITA (UTC+8) di lapisan tampilan, kecuali ada keputusan lain yang dicatat di sini.
- Kunci unik untuk upsert dibuat eksplisit di skema (pengganti `ON CONFLICT`), dipakai dengan `INSERT ... ON DUPLICATE KEY UPDATE`.
- Tidak memakai fitur khusus MySQL 8 yang tidak ada di MariaDB 10.11.
- Skema ditaruh di `schema/mariadb/NN_nama.sql`, skrip migrasi di `scripts/migrate/`, bisa dijalankan ulang (idempotent) dan selalu mencetak perbandingan jumlah baris sumber vs tujuan.
- **Strategi bertahap, bukan sekali pindah:** urutan Turso (modul sinkronisasi) → tabel dan view Supabase → Auth paling akhir. Aplikasi harus **selalu bisa dijalankan** di akhir setiap tahap. Selama Tahap 3 dan 4, Supabase Auth tetap dipakai untuk login sementara data pindah ke MariaDB.
- Semua pengujian dilakukan **lokal dulu** (MariaDB 10.11 lokal), baru dipasang ke cPanel setelah angka dashboard cocok dengan angka pembanding.
- **Klien database dan Supabase harus dibuat saat dipakai, bukan di tingkat modul** (`const x = getTursoClient()` di luar fungsi). Build di cPanel membaca env hanya saat runtime, dan `next build` mengevaluasi modul saat "Collecting page data". `lib/db/client.ts` sudah lazy.
- **Komponen `'use client'` tidak boleh mengimpor modul yang memuat klien database** (langsung atau tidak langsung): `mysql2` memakai `net`/`tls` dan membuat build gagal. Konstanta, tipe, dan fungsi murni yang dipakai komponen client dipisah ke berkas tanpa impor database (contoh: `lib/turso/hivKonstanta.ts`).
- **Pseudo-kolom SQLite tidak ada di MariaDB:** jangan pakai `rowid`; urutkan dengan `id` atau kolom alami (`no_baris`).
- **Konfigurasi pool `mysql2`:** `dateStrings: true` (DATE/DATETIME tetap string seperti di SQLite), `decimalNumbers: true` (DECIMAL jadi angka, bukan string), `charset: 'utf8mb4'`, dan setiap koneksi menjalankan `SET time_zone = '+00:00'`.
- **Pemetaan tipe Postgres → MariaDB (Tahap 4):** `uuid` → `UUID` (tipe asli MariaDB 10.7+) atau `CHAR(36)`; `timestamptz` → `DATETIME` UTC; `jsonb` dan array teks → `LONGTEXT` berisi JSON; `numeric(p,s)` → `DECIMAL(p,s)`; `boolean` → `TINYINT(1)`; `text` → `TEXT`/`VARCHAR` sesuai panjang; `time` → `TIME`.

- **Keputusan teknis Tahap 4 (dari akun A, 24 Okt 2026):** `uuid` memakai `CHAR(36) COLLATE utf8mb4_bin` dengan `DEFAULT UUID()`; kolom PK/FK/UNIQUE dan kolom ber-CHECK enum memakai `utf8mb4_bin` karena `text` Postgres peka huruf besar/kecil; FK ke `auth.users` (12 kolom) tidak dibuat (baru relevan di Tahap 5); `jsonb` → `LONGTEXT` + `CHECK (JSON_VALID)`; semua `bigint ... identity` → `BIGINT AUTO_INCREMENT`; indeks parsial Postgres menjadi indeks biasa; kolom `time` → `TIME` tanpa pecahan detik.
- **Peringatan koneksi `latin1`:** server MariaDB berdefault `latin1`; klien yang tidak membuka koneksi `utf8mb4` (termasuk skrip migrasi dan `mariadb` CLI tanpa `--default-character-set=utf8mb4`) menyimpan emoji/karakter 4-byte rusak **tanpa error**, bahkan di mode strict. `lib/db/client.ts` sudah memakai `utf8mb4`.
- **Desimal:** MariaDB membulatkan kelebihan bagian pecahan DESIMAL tanpa error walau mode strict (hanya Note 1265); hanya kelebihan bagian bulat yang ditolak. Karena itu lebar sementara dibuat besar dan skrip data membandingkan nilai. Pembagian di trigger memakai `CAST(... AS DECIMAL(38,18))`; jangan `DOUBLE`/`FLOAT`.
- **View dan fungsi (akun A):** `mmwr_week()` dipecah menjadi `mmwr_tahun(d)` dan `mmwr_minggu(d)` (MariaDB tidak punya fungsi bertabel/`LATERAL`; baris bertanggal NULL dibuang lewat `WHERE tanggal IS NOT NULL`); `tanggal + N` harus `DATE_ADD(.., INTERVAL N DAY)` (di MariaDB hasilnya NULL); `mode()` memakai `ROW_NUMBER()` + `LEFT JOIN`, **bukan** subquery berkorelasi (cache subquery memakai kolasi kolom dan menyamakan `Cerah`/`cerah`); perbandingan/pengelompokan kolom teks ber-kolasi ci diberi `COLLATE utf8mb4_nopad_bin` agar sama dengan Postgres; `ILIKE` → `LOWER(x) LIKE 'pola'`; view `SQL SECURITY INVOKER` (pengguna aplikasi butuh `SELECT` dan `EXECUTE`).

## 8. Log Status (tambahkan baris baru di bawah, jangan hapus yang lama)

| Tanggal | Yang dikerjakan | Posisi berikutnya |
|---|---|---|
| 2026-10-22 | Tahap 0 selesai: inventaris repo, fakta lingkungan (MariaDB 10.11.19), dokumen ini dibuat | Pengguna menyelesaikan Tahap 1; Claude memulai Tahap 2 dan skema modul Turso setelah `turso_schema.sql` ada |
| 2026-10-22 (malam) | Ditemukan AI App Hosting di tema Meridian (Node.js tersedia); repo terdeteksi publik, tidak ada rahasia ter-commit; keputusan hosting: `next.bkksmr.tech` | Pengguna menjalankan Tahap 1b (uji deploy) dan mengirim `turso_schema.sql` + `supabase_schema.sql`; Claude mulai Tahap 2 |
| 2026-10-23 | Pengguna memilih uji coba lokal di VS Code; dibuat Tahap 1a, skrip `dump-turso-schema.mjs` dan `supabase-schema-export.sql`; ditetapkan urutan Turso → Supabase → Auth | Pengguna menjalankan Tahap 1a dan mengirim `turso_schema.sql`, `turso_rowcounts.txt`, `supabase_schema.json`; Claude mulai Tahap 2 |
| 2026-10-23 (siang) | Skema Turso, rowcounts, dan skema Supabase diterima dan dianalisis; `schema/mariadb/01_turso_modules.sql` selesai dan lulus uji di MariaDB 10.11.14; ditemukan bentrok nama `hiv_data`/`tb_data`; pengguna memilih uji lokal lalu langsung ke `bkksamarinda.or.id` (belum dikonfirmasi) | Pengguna memuat `01_turso_modules.sql` ke MariaDB lokal; Claude menulis `lib/db` (Tahap 2) dan skrip `scripts/migrate/turso-to-mariadb.mjs` (Tahap 3) |
| 2026-10-23 (sore) | Tahap 2 selesai: `lib/db/client.ts`, shim `lib/turso/client.ts`, `env.mariadb.example` (18 uji lulus). Skrip `turso-to-mariadb.mjs` selesai dan diuji (dry-run, idempotensi, normalisasi, laporan). Ditemukan: GAS menulis langsung ke Turso; 3 file membuat klien libsql sendiri | Pengguna memasang `mysql2`, memuat skema ke MariaDB lokal, menjalankan `--dry-run` terhadap Turso asli, mengirim `migrasi_laporan.txt` dan skrip Apps Script; Claude menerjemahkan SQL SQLite → MariaDB per modul (Tahap 3) |
| 2026-10-23 (malam) | Pengguna menjalankan dry-run dan migrasi data ke MariaDB lokal: 18 dari 19 tabel lengkap, 4 baris `data_penumpang_kapal` dilewati (tanggal bernama bulan); skrip diperbaiki dan diuji. Arah produk berubah: Google Sheets ditinggalkan, diganti input langsung + unggah Excel (bagian 1b, Tahap 3b); pengguna sedang di layar "Deploy a Node.js app" cPanel | Pengguna menjalankan ulang migrasi dengan skrip baru, menjawab klasifikasi modul, mengirim judul kolom Sheet; Claude menerjemahkan SQL SQLite → MariaDB per modul dan merancang Tahap 3b |
| 2026-10-24 | Migrasi ulang lokal: 224 dari 225 baris `data_penumpang_kapal` (1 baris `-` tanpa tanggal tetap dilewati). Deploy percobaan 1 ke cPanel: kompilasi dan TypeScript berhasil, gagal karena klien dibuat saat modul dimuat; `perbaikan-build-env.patch` dibuat dan lulus `next build` tanpa env di sandbox. Klasifikasi modul dikonfirmasi; penumpang kapal = input manual. `lib/db/client.ts` dibuat lazy | Pengguna menerapkan patch ke `main`, mengisi env, Retry Deploy, mengirim hasilnya; Claude lanjut Tahap 3: menerjemahkan SQL SQLite → MariaDB per modul |
| 2026-10-24 (malam) | Aplikasi berhasil di-deploy di cPanel dan login lancar (hosting terbukti). Terjemahan SQL kode aplikasi selesai di branch `migrasi-mariadb`: `tsc` bersih, `next build` berhasil, uji asap 77 fungsi query lulus. Temuan: `rowid` dan impor konstanta HIV dari komponen client | Pengguna menerapkan `migrasi-mariadb-kode.patch` + berkas baru, menjalankan uji asap pada data asli, membandingkan angka dashboard; Claude lanjut Tahap 3b (input data + unggah Excel) |
| 2026-10-24 | Pengguna meminta penyeragaman wilayah kerja dan menawarkan berkas migrasi Supabase buatannya. Inventaris: 13+ daftar wilayah di kode, 4 nama kolom berbeda, master `wilker_ref`/`wilker_nama_alias` sudah ada di Supabase. Dibuat `cek-wilayah-kerja.sql` (diuji); Tahap 3c ditambahkan sebagai langkah terpisah setelah paritas | Pengguna mengirim hasil uji asap data asli, hasil `cek-wilayah-kerja.sql`, dan berkas migrasi Supabase buatannya; Claude meninjau berkas itu terhadap `supabase_schema.json` lalu memulai Tahap 4 |
| 2026-10-24 (siang) | Pengguna menjalankan uji asap pada data asli: 0 galat. `tsc` gagal hanya karena paket `xlsx` tidak terpasang di komputernya (masih tercantum di `package.json`; cukup `npm install`) | Pengguna menjalankan `npm install`, `tsc`, membandingkan angka dashboard, mengirim hasil `cek-wilayah-kerja.sql` dan berkas Supabase buatannya |
| 2026-10-24 (sore) | `tsc` nol galat; angka dashboard cocok (migrasi Turso terbukti); hasil `cek-wilayah-kerja.sql`: data bersih, hanya malaria memakai nama panjang. Dibuat dan diuji `02_wilayah_kerja.sql` (Tahap 3c langkah A) dan `jalankan-sql.mjs`. Migrasi Supabase buatan pengguna: 3 dari 10 batch selesai | Pengguna menjalankan `02_wilayah_kerja.sql` dan mengirim laporannya; pengguna menyelesaikan batch Supabase lalu mengirim berkasnya; Claude mengerjakan Tahap 3c langkah B dan meninjau berkas Supabase |
| 2026-10-24 (malam) | Pengguna menjalankan pemetaan wilayah: `belum` 0 di semua tabel. Berkas Supabase Batch 1-4 ditinjau: bersih, 37 dari 46 tabel, kolom cocok. Penomoran skrip dirapikan (03_wilayah_kerja.sql). Pengguna menyebut "urutan download ada yang terbalik" (maksud belum dipastikan) | Pengguna memperjelas maksud tersebut, menyelesaikan batch Supabase sisa (9 tabel), dan mengirim `supabase_column_stats.json`; Claude mengerjakan Tahap 3c langkah B dan 44 view |
| 2026-10-24 (malam, lanjutan) | Pengguna menjalankan `bersihkan-master-wilker.sql`, `02_supabase_tables.sql` (kini 51 pernyataan, lebih panjang dari versi 42 pernyataan yang diuji Claude, jadi ada tambahan batch yang belum ditinjau) dan `03_wilayah_kerja.sql` (belum = 0, 21 baris master). Langkah B-1 selesai: modul `lib/wilayah-kerja` + 7 daftar diganti, teruji. Temuan: koordinat WK06 berbeda ~110 km antara dua berkas | Pengguna menerapkan `langkah-b-wilayah-kerja.patch` dan zip, menjalankan `uji-wilayah-kerja.ts`, memeriksa koordinat WK06, mengirim `02_supabase_tables.sql` terbaru dan `supabase_column_stats.json`; Claude meninjau batch baru dan lanjut B-2 atau Tahap 4 |
| 2026-10-24 (malam, lanjutan 2) | Pengguna menyatakan berkas Supabase belum dijalankan (menunggu lengkap), tetapi catatan terminalnya menunjukkan `02_supabase_tables.sql` dijalankan dengan 51 pernyataan; berkas yang diterima Claude hanya 42 pernyataan (md5 0f44888f13a5), jadi berkas di repo pengguna lebih baru dan **belum ditinjau**. Inventaris 44 view/11 fungsi selesai; `04_fungsi_epid.sql` selesai dan teruji (0 beda dari logika asli untuk 21.915 tanggal); kelemahan akhir-Desember fungsi asli dikuantifikasi (53 tanggal) | Pengguna mengirim `02_supabase_tables.sql` terbaru (satu berkas), menjalankan `04_fungsi_epid.sql`, dan memutuskan soal kelemahan minggu epidemiologi; Claude menulis `05_views.sql` |
| 2026-10-26 | **Dua dokumen dari dua akun Claude digabung** (basis: dokumen akun yang memuat Turso lengkap, Tahap 3/3b/3c). Hasil Tahap 4 akun lain (`02_supabase_tables.sql` 46 tabel, view+fungsi+prosedur diuji terhadap PostgreSQL) dimasukkan. Duplikat view/fungsi akun B diarsipkan, penomoran SQL dirapikan. Tabel dummy HIV/TB Supabase dibuang. Keputusan: tanpa uji di `next.bkksmr.tech` | Pengguna menjalankan ulang urutan SQL 01→04 di MariaDB lokal, menjalankan `supabase-column-stats.sql`, memutuskan soal minggu epidemiologi akhir Desember; Claude menulis `supabase-to-mariadb.mjs`, lalu adapter klien Supabase |
| 2026-10-26 (siang) | `supabase-to-mariadb.mjs`, `supabase-migrasi-lib.mjs`, `bandingkan-view.mjs`, `uji-supabase-migrasi.mjs` ditulis; uji murni 9/9 lulus, pembacaan tipe Postgres diuji di PostgreSQL 16. Sisi tulis MariaDB belum teruji (tidak ada MariaDB di lingkungan Claude). `supabase_column_stats.json` sudah ada di repo | Pengguna: `npm i -D pg`, set `SUPABASE_DB_URL`, jalankan `--dry-run`, lalu `--tabel=wilker_ref`, lalu semua, lalu `bandingkan-view.mjs`; kirim hanya `supabase_migrasi_laporan.txt`; Claude mempersempit kolom `DECIMAL(38,18)` memakai `supabase_column_stats.json` |

## 9. Risiko yang diketahui

- **Hosting tanpa Node.js** bisa memblokir seluruh rencana jika jalur 1 dan 2 gagal.
- **Supabase Auth → sesi sendiri** adalah bagian paling sensitif keamanan; harus diuji (brute force, kedaluwarsa sesi, role).
- **View Postgres → MariaDB** tidak selalu satu-satu; angka dashboard harus dibandingkan sebelum cutover.
- **RLS hilang:** setiap query data harus memeriksa role di server. Audit semua route `app/api/**` sebelum rilis.
- **Data kesehatan sensitif:** dump data tidak boleh masuk repo atau chat; akses cPanel dan database dibatasi.