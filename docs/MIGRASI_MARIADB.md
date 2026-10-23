# Rencana Migrasi EPIC-AI ke MariaDB (cPanel BKK Kelas I Samarinda)

> **Dokumen hidup.** Simpan di repo (`docs/MIGRASI_MARIADB.md`), commit setiap kali diperbarui.
> Dokumen ini dibuat agar sesi/akun Claude mana pun yang membacanya bisa **langsung melanjutkan** tanpa riwayat chat sebelumnya.
> Terakhir diperbarui: 22 Oktober 2026 (Tahap 0 selesai; jalur hosting Node.js ditemukan).

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
- [ ] Catat: versi Node di panel, apakah `next build` selesai (memori), apakah login dan dashboard terbuka, apakah koneksi keluar ke Turso, Supabase, dan Cloudinary berjalan
- [ ] Jika build gagal karena memori: build di komputer dengan `output: 'standalone'` lalu deploy lewat "Upload a file"
- Selama uji, cron Vercel dan Apps Script tetap menunjuk Vercel; jangan dipindah dulu.

**Tahap 2: Lapisan akses data**
- [x] `lib/db/client.ts` (pool `mysql2`, `execute`/`batch`/`transaction`, UTC, `utf8mb4`, `dateStrings`, `decimalNumbers`). Selesai 23 Okt 2026, **18 uji lulus** di MariaDB 10.11 lewat socket dan TCP (tipe, agregat jadi number, upsert, BLOB, batch/transaksi, zona waktu); `tsc --strict` bersih. Pasang dependensi: `npm install mysql2`
- [x] `lib/turso/client.ts` kini hanya `export { getDbClient as getTursoClient }`, jadi **27 file** yang memanggil `getTursoClient()` tidak perlu diubah dulu. **Belum tercakup:** `lib/turso/tb.ts` dan `lib/turso/poliklinik.ts` membuat klien libsql sendiri (`createClient`), dan `lib/turso/queriesMigrasiMalaria.ts` memakai tipe `InValue`; ketiganya diubah manual di Tahap 3
- [x] Env baru: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (atau `DB_SOCKET`), `DB_POOL_SIZE`; contoh di `env.mariadb.example`

**Tahap 3: Modul Turso → MariaDB**
- [x] `schema/mariadb/01_turso_modules.sql` (19 tabel Turso). Selesai 23 Okt 2026 dan **diuji di MariaDB 10.11.14**: terpasang bersih, bisa dijalankan ulang, upsert `ON DUPLICATE KEY UPDATE`, karakter unicode, CHECK posko, dan mode strict (tanggal tidak valid ditolak, tidak dipotong diam-diam)
- [ ] Terjemahkan 9 file `strftime`, 3 `datetime('now')`, 4 `ON CONFLICT`, 3 `substr`, 1 `PRAGMA`
- [x] `scripts/migrate/turso-to-mariadb.mjs` (baca Turso, tulis MariaDB, bandingkan jumlah baris). Selesai dan **diuji** dengan sumber SQLite berisi kasus tepi: `--dry-run` tidak menulis; aman diulang; id asal dan AUTO_INCREMENT terjaga; NIK 16 digit utuh; ISO `Z` dan `+08:00` dikonversi ke UTC; unicode dan emoji utuh; BLOB identik; tanggal rusak pada kolom wajib dilewati dan dilaporkan; tanggal rusak pada kolom opsional jadi NULL dan dilaporkan; nilai kepanjangan dicatat sebagai GAGAL (tidak dipotong diam-diam). Laporan di `data-export/migrasi_laporan.txt`
- [ ] Ubah sinkronisasi Sheets (GAS) agar menulis lewat API aplikasi. **Temuan:** `sql-dan-script/PoskoKirimTurso.gs` menulis langsung ke Turso lewat HTTP pipeline (kunci di Script Properties), dan skrip Apps Script modul lain (HIV, TB, KIER, SKLT, poliklinik, ICV, SIAOS) hidup di Google Sheets, **belum ada di repo**. Pengguna perlu menyalin semuanya ke `sql-dan-script/` (tanpa rahasia). `app/api/sync-stok/route.ts` dan `app/api/klinik/sync-stok/route.ts` memakai `GAS_SYNC_WEBAPP_*`
- [ ] Verifikasi: jumlah baris dan agregat (jumlah per bulan) sama dengan sumber

**Tahap 4: Supabase → MariaDB**
- [ ] `schema/mariadb/02_supabase_tables.sql` (tabel)
- [ ] `schema/mariadb/03_supabase_views.sql` (sekitar 40 view, terjemahkan fungsi Postgres: `date_trunc`, `to_char`, `::tipe`, `FILTER`, `generate_series`, dan sebagainya)
- [ ] Gantikan 2 RPC `status_lapor_*` dengan stored procedure atau query di kode
- [ ] Gantikan klien `supabase.from(...)` (167 file) dengan query builder/adapter
- [ ] Skrip migrasi data Supabase → MariaDB
- [ ] Verifikasi agregat

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

**Pembaruan 23 Okt 2026:** pengguna memilih menguji **di localhost saja** dan memasang langsung ke `bkksamarinda.or.id` tanpa `next.bkksmr.tech`. Itu boleh, dengan syarat deploy pertama ke domain tujuan diperlakukan sebagai uji (aplikasi masih memakai Turso/Supabase, belum diumumkan) sebelum data dipindah. Yang **belum dikonfirmasi**: (a) akun cPanel `bkksamarinda.or.id` punya AI App Hosting (di tema Jupiter tidak tampil; cek lewat tema Meridian), (b) database MariaDB-nya dibuat **di akun yang sama** dengan aplikasi (koneksi hanya `localhost`), (c) pertimbangan data sensitif: aplikasi memuat data individual (NIK, HIV, TB) sehingga harus tetap di balik login dengan HTTPS di akun yang dipilih. Keputusan akun hosting: _(isi di sini)_

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
8. **Skrip Apps Script:** buka tiap Google Sheet sumber (HIV, TB, KIER, SKLT, poliklinik, ICV, SIAOS, penumpang kapal, migrasi malaria) → Extensions → Apps Script, salin kodenya ke `sql-dan-script/<nama>.gs`. **Hapus URL/token dari kode** (rahasia ada di Script Properties, jangan disalin). Daftar nama proyek dan sheet-nya cukup dikirim ke Claude.

## 7. Konvensi teknis yang disepakati

- Database `utf8mb4`, collation `utf8mb4_unicode_ci`, engine InnoDB.
- Driver: `mysql2/promise` dengan pool; **semua query berparameter** (`?`), tanpa penggabungan string.
- Zona waktu: data lama SQLite memakai `datetime('now')` (UTC). Simpan sebagai `DATETIME` UTC dan konversi ke WITA (UTC+8) di lapisan tampilan, kecuali ada keputusan lain yang dicatat di sini.
- Kunci unik untuk upsert dibuat eksplisit di skema (pengganti `ON CONFLICT`), dipakai dengan `INSERT ... ON DUPLICATE KEY UPDATE`.
- Tidak memakai fitur khusus MySQL 8 yang tidak ada di MariaDB 10.11.
- Skema ditaruh di `schema/mariadb/NN_nama.sql`, skrip migrasi di `scripts/migrate/`, bisa dijalankan ulang (idempotent) dan selalu mencetak perbandingan jumlah baris sumber vs tujuan.
- **Strategi bertahap, bukan sekali pindah:** urutan Turso (modul sinkronisasi) → tabel dan view Supabase → Auth paling akhir. Aplikasi harus **selalu bisa dijalankan** di akhir setiap tahap. Selama Tahap 3 dan 4, Supabase Auth tetap dipakai untuk login sementara data pindah ke MariaDB.
- Semua pengujian dilakukan **lokal dulu** (MariaDB 10.11 lokal), baru dipasang ke cPanel setelah angka dashboard cocok dengan angka pembanding.
- **Konfigurasi pool `mysql2`:** `dateStrings: true` (DATE/DATETIME tetap string seperti di SQLite), `decimalNumbers: true` (DECIMAL jadi angka, bukan string), `charset: 'utf8mb4'`, dan setiap koneksi menjalankan `SET time_zone = '+00:00'`.
- **Pemetaan tipe Postgres → MariaDB (Tahap 4):** `uuid` → `UUID` (tipe asli MariaDB 10.7+) atau `CHAR(36)`; `timestamptz` → `DATETIME` UTC; `jsonb` dan array teks → `LONGTEXT` berisi JSON; `numeric(p,s)` → `DECIMAL(p,s)`; `boolean` → `TINYINT(1)`; `text` → `TEXT`/`VARCHAR` sesuai panjang; `time` → `TIME`.

## 8. Log Status (tambahkan baris baru di bawah, jangan hapus yang lama)

| Tanggal | Yang dikerjakan | Posisi berikutnya |
|---|---|---|
| 2026-10-22 | Tahap 0 selesai: inventaris repo, fakta lingkungan (MariaDB 10.11.19), dokumen ini dibuat | Pengguna menyelesaikan Tahap 1; Claude memulai Tahap 2 dan skema modul Turso setelah `turso_schema.sql` ada |
| 2026-10-22 (malam) | Ditemukan AI App Hosting di tema Meridian (Node.js tersedia); repo terdeteksi publik, tidak ada rahasia ter-commit; keputusan hosting: `next.bkksmr.tech` | Pengguna menjalankan Tahap 1b (uji deploy) dan mengirim `turso_schema.sql` + `supabase_schema.sql`; Claude mulai Tahap 2 |
| 2026-10-23 | Pengguna memilih uji coba lokal di VS Code; dibuat Tahap 1a, skrip `dump-turso-schema.mjs` dan `supabase-schema-export.sql`; ditetapkan urutan Turso → Supabase → Auth | Pengguna menjalankan Tahap 1a dan mengirim `turso_schema.sql`, `turso_rowcounts.txt`, `supabase_schema.json`; Claude mulai Tahap 2 |
| 2026-10-23 (siang) | Skema Turso, rowcounts, dan skema Supabase diterima dan dianalisis; `schema/mariadb/01_turso_modules.sql` selesai dan lulus uji di MariaDB 10.11.14; ditemukan bentrok nama `hiv_data`/`tb_data`; pengguna memilih uji lokal lalu langsung ke `bkksamarinda.or.id` (belum dikonfirmasi) | Pengguna memuat `01_turso_modules.sql` ke MariaDB lokal; Claude menulis `lib/db` (Tahap 2) dan skrip `scripts/migrate/turso-to-mariadb.mjs` (Tahap 3) |
| 2026-10-23 (sore) | Tahap 2 selesai: `lib/db/client.ts`, shim `lib/turso/client.ts`, `env.mariadb.example` (18 uji lulus). Skrip `turso-to-mariadb.mjs` selesai dan diuji (dry-run, idempotensi, normalisasi, laporan). Ditemukan: GAS menulis langsung ke Turso; 3 file membuat klien libsql sendiri | Pengguna memasang `mysql2`, memuat skema ke MariaDB lokal, menjalankan `--dry-run` terhadap Turso asli, mengirim `migrasi_laporan.txt` dan skrip Apps Script; Claude menerjemahkan SQL SQLite → MariaDB per modul (Tahap 3) |

## 9. Risiko yang diketahui

- **Hosting tanpa Node.js** bisa memblokir seluruh rencana jika jalur 1 dan 2 gagal.
- **Supabase Auth → sesi sendiri** adalah bagian paling sensitif keamanan; harus diuji (brute force, kedaluwarsa sesi, role).
- **View Postgres → MariaDB** tidak selalu satu-satu; angka dashboard harus dibandingkan sebelum cutover.
- **RLS hilang:** setiap query data harus memeriksa role di server. Audit semua route `app/api/**` sebelum rilis.
- **Data kesehatan sensitif:** dump data tidak boleh masuk repo atau chat; akses cPanel dan database dibatasi.
