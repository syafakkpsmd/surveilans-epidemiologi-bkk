# MASTER PROMPT — Surveilans Epidemiologi BKK Kelas I Samarinda

Dokumen ini berisi prompt siap-pakai, dipecah per segmen. **Setiap segmen berdiri
sendiri** — kalau Anda buka sesi AI baru (di VS Code, Claude Code, Cursor, atau
AI apa pun), cukup salin **satu blok segmen** yang relevan beserta bagian
"KONTEKS PROYEK" di bawah ini. AI tidak perlu membaca riwayat percakapan lain.

Kerjakan segmen SECARA URUT (1 → 8). Jangan lompat, karena tiap segmen
mengasumsikan segmen sebelumnya sudah selesai dan berjalan tanpa error.

---

## KONTEKS PROYEK (WAJIB disalin di depan SETIAP prompt segmen)

```
KONTEKS PROYEK — Surveilans Epidemiologi BKK Kelas I Samarinda

Nama aplikasi : Surveilans Epidemiologi BKK Kelas I Samarinda
Institusi     : Balai Kekarantinaan Kesehatan (BKK) Kelas I Samarinda,
                Ditjen P2P, Kementerian Kesehatan RI
Tujuan        : Dashboard internal untuk memantau kegiatan pengawasan
                kapal (COP - Certificate of Pratique & PHQC - Port
                Health Quarantine Clearance) di 6 wilayah kerja
                (Samarinda, TanjungSantan, TanjungLaut, Lhoktuan,
                Sangatta, Sangkulirang), dianalisis per minggu
                epidemiologi (standar WHO/CDC MMWR) dan per bulan.

STACK (JANGAN DIUBAH TANPA ALASAN KUAT):
- Next.js 15, App Router (folder `app/`, BUKAN `pages/`)
- TypeScript, strict mode
- Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS), akses via paket `@supabase/ssr`
  (BUKAN `@supabase/auth-helpers-nextjs` yang sudah deprecated)
- Autentikasi: Supabase Auth, email/password
- Hosting: Vercel
- Repo: GitHub

ATURAN WAJIB Next.js 15 (penyebab bug paling umum kalau diabaikan):
1. `params` dan `searchParams` di Server Component / Route Handler
   sekarang berupa Promise dan HARUS di-`await`:
   `const { id } = await params;`  -- bukan `params.id` langsung.
2. Import navigasi dari `next/navigation`, BUKAN `next/router`
   (`next/router` adalah API Pages Router lama).
3. Server Component adalah default. Tambahkan `'use client'` HANYA
   kalau komponen butuh hook (useState/useEffect), event handler,
   atau browser API.
4. Untuk Supabase di Server Component/Route Handler, buat client
   terpisah untuk server (`createServerClient` dari `@supabase/ssr`,
   pakai `cookies()` dari `next/headers`) dan untuk client
   (`createBrowserClient`). Jangan campur keduanya dalam satu file.
5. Middleware autentikasi WAJIB me-refresh session token Supabase di
   setiap request (pola resmi `@supabase/ssr` untuk Next.js), kalau
   tidak, sesi akan expired secara tidak konsisten.

SKEMA DATABASE YANG SUDAH ADA (jangan mengarang nama kolom lain):

Tabel `kegiatan_cop`:
  wilayah_kerja, nama_kapal, bendera_kapal, negara_kedatangan,
  tgl_kedatangan (date), jml_abk_wna (int), jml_abk_wni (int),
  rba (text: Hijau/Kuning/Merah), faktor_risiko, daerah_terjangkit,
  kelengkapan_dokumen, orang_sakit, keberadaan_vektor, sanitasi,
  status_kirim (text, dipakai oleh Google Apps Script sync, JANGAN
  dihapus/diubah skemanya)

Tabel `kegiatan_phqc`:
  wilayah_kerja, nama_kapal, bendera, jml_abk_wna (int),
  jml_abk_wni (int), jml_penumpang_wna (int), jml_penumpang_wni (int),
  tgl_keberangkatan (date), tujuan_berlayar, pelabuhan_kedatangan,
  pelabuhan_tujuan, rba (text: Hijau/Kuning/Merah),
  status_kirim (text, JANGAN diubah skemanya)

Fungsi SQL `mmwr_week(date) RETURNS TABLE(tahun_epid int, minggu_epid int)`
  -- menghitung minggu epidemiologi standar WHO/CDC (mulai hari Minggu),
  sudah ada di database, JANGAN dibuat ulang dengan logika berbeda.

Views yang sudah ada (siap dipakai, JANGAN dibuat ulang):
  view_kegiatan_cop_enriched, view_mingguan_ringkasan,
  view_bulanan_ringkasan, view_mingguan_kategori, view_bulanan_kategori
  view_kegiatan_phqc_enriched, view_mingguan_ringkasan_phqc,
  view_bulanan_ringkasan_phqc, view_mingguan_kategori_phqc,
  view_bulanan_kategori_phqc

STRUKTUR NAVIGASI (diperbarui setelah restrukturisasi hub):
  /dashboard              -> HUB utama: grid kartu kategori kegiatan
                             (Alat Angkut Kapal aktif, sisanya "Segera
                             Hadir" sampai modulnya dibangun). JANGAN
                             taruh detail/grafik apa pun di sini.
  /dashboard/alat-angkut  -> Dashboard COP+PHQC gabungan (dulu ada di
                             /dashboard sebelum restrukturisasi)
    /cop                  -> Dashboard COP lengkap
    /phqc                 -> Dashboard PHQC lengkap
  /dashboard/vektor, /dashboard/pie, /dashboard/tpp-ttu-pab,
  /dashboard/pesawat, /dashboard/klb -> BELUM DIBANGUN, placeholder
                             "Segera Hadir" di hub. Kalau salah satu
                             mulai dibangun: buat foldernya, lalu di
                             components/KartuKategoriHub pemanggilan
                             kartu terkait tambahkan prop href supaya
                             otomatis aktif.

DESIGN TOKENS (dipakai konsisten di semua halaman):
  Warna dasar   : background #EEF1F4, surface card #FFFFFF
  Warna utama   : navy gelap #0F2A38 (header/navbar), teal #0F4C5C (aksen)
  Warna risiko  : hijau #2F9E44 (aman), kuning #F0A202 (waspada),
                  merah #D62839 (bahaya) -- SELALU dipetakan dari nilai
                  kolom `rba`, jangan pakai warna risiko untuk hal lain
  Tipografi     : system font stack (system-ui, -apple-system,
                  "Segoe UI", sans-serif), tanpa font eksternal
  Radius        : 10px untuk card, 8px untuk input/button, 999px untuk pill
  Bahasa UI     : Bahasa Indonesia, istilah kesehatan masyarakat baku
                  (KLB, SKDR, RBA, minggu epidemiologi)

SUMBER DATA & MODEL AKSES (PENTING, jangan menyimpang dari ini):
  - Aplikasi ini TIDAK PERNAH melakukan input/edit/hapus data kegiatan
    (kegiatan_cop, kegiatan_phqc). Semua data masuk otomatis tiap
    tengah malam lewat Google Apps Script -> Supabase (sudah berjalan,
    di luar cakupan aplikasi Next.js ini). JANGAN membuat form
    tambah/edit/hapus data kegiatan di aplikasi ini.
  - Aplikasi ini murni untuk MENAMPILKAN & MENGANALISIS data tersebut.
  - ISI DASHBOARD SAMA PERSIS untuk Tamu, Petugas, maupun Admin --
    semua filter, semua grafik, semua breakdown kategori TERBUKA untuk
    siapa pun tanpa login. JANGAN membuat versi "ringkas" vs "lengkap".
  - SATU-SATUNYA yang dibedakan oleh status login: tombol "Analisis AI"
    yang tampil di SETIAP halaman (Dashboard utama, halaman COP,
    halaman PHQC, dan modul-modul lain nanti):
    - TAMU (belum login): tombol tetap terlihat tapi nonaktif/terkunci
      (mis. ikon gembok, atau tetap bisa diklik tapi hasilnya modal
      "Silakan login untuk mengakses Analisis AI" + tautan ke /login).
    - PETUGAS & ADMIN (sudah login): tombol aktif, memicu analisis AI
      sungguhan atas data yang sedang ditampilkan (detail logika
      analisis AI dirancang di SEGMEN 9, masih placeholder untuk saat
      ini karena spesifikasinya belum final).
  - Kunjungan tamu dicatat sederhana (hitungan kunjungan per hari,
    BUKAN data pribadi/IP) ke tabel `kunjungan_tamu`.
  - Beda Petugas vs Admin HANYA soal kelola akun user (Admin bisa,
    Petugas tidak) -- tidak ada bedanya sama sekali dalam hal melihat
    dashboard atau memakai Analisis AI, keduanya setara di situ.
  - Tombol "Login" muncul di kanan atas navbar HANYA kalau belum login;
    kalau sudah login, tombol itu berubah jadi info role + Logout.
```

---

## SEGMEN 1 — Inisialisasi Proyek & Infrastruktur

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 1: Inisialisasi proyek.

Lakukan:
1. Buat struktur folder App Router standar:
   app/
     layout.tsx          (root layout)
     page.tsx            (redirect ke /dashboard kalau sudah login,
                           ke /login kalau belum)
     globals.css
   lib/
     supabase/
       client.ts          (createBrowserClient)
       server.ts           (createServerClient, pakai cookies() dari
                            next/headers)
       middleware.ts        (helper untuk refresh session)
   middleware.ts          (di root, pakai helper dari lib/supabase/middleware.ts)
   types/
     database.types.ts    (placeholder, akan diisi di Segmen 2)

2. Konfigurasi Tailwind: tambahkan warna kustom di tailwind.config
   sesuai DESIGN TOKENS di atas (navy, teal, risiko hijau/kuning/merah)
   supaya bisa dipakai sebagai className (mis. bg-navy, text-teal).

3. Buat file .env.local.example (BUKAN .env.local asli) berisi nama
   variable saja tanpa value:
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=

4. Pastikan `npm run build` sukses tanpa error TypeScript sebelum
   menganggap segmen ini selesai.

KRITERIA SELESAI:
- `npm run dev` jalan tanpa error di http://localhost:3000
- `npm run build` sukses
- middleware.ts ada dan tidak error (boleh sementara belum ada logic auth)

JANGAN mengerjakan halaman login, navbar, atau dashboard di segmen ini.
Itu ada di segmen selanjutnya.
```

---

## SEGMEN 2 — Skema Database, Tipe TypeScript & Supabase Client

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 2: Hubungkan proyek ke Supabase dan buat tipe TypeScript
yang akurat untuk seluruh tabel & view yang disebut di KONTEKS PROYEK.

Lakukan:
1. Isi lib/supabase/client.ts dan lib/supabase/server.ts menggunakan
   @supabase/ssr sesuai pola resmi (createBrowserClient di client.ts,
   createServerClient + cookies() di server.ts).

2. Buat types/database.types.ts berisi interface TypeScript untuk:
   - KegiatanCop (semua kolom di tabel kegiatan_cop)
   - KegiatanPhqc (semua kolom di tabel kegiatan_phqc)
   - RingkasanMingguan / RingkasanBulanan (kolom dari
     view_mingguan_ringkasan / view_bulanan_ringkasan, ada versi
     _cop dan _phqc dengan bentuk field yang sedikit berbeda -- lihat
     KONTEKS PROYEK untuk kolom pastinya)
   - KategoriBreakdown (kolom dari view_mingguan_kategori /
     view_bulanan_kategori: tahun_epid|tahun, minggu_epid|bulan,
     wilayah_kerja, kategori, nilai, jumlah)

   PENTING: kalau memungkinkan, tawarkan opsi generate tipe otomatis
   dari Supabase CLI (`supabase gen types typescript`) sebagai
   alternatif menulis manual -- tapi tetap sediakan versi manual di
   atas sebagai fallback kalau Supabase CLI belum di-setup user.

3. Buat lib/supabase/queries.ts berisi fungsi-fungsi query dasar
   (bukan komponen UI), misalnya:
   - getRingkasanMingguan(tabel: 'cop'|'phqc', tahun: number)
   - getKategoriBreakdown(tabel: 'cop'|'phqc', filter: {...})
   Semua fungsi ini dipanggil dari Server Component nanti.

KRITERIA SELESAI:
- Tidak ada error TypeScript.
- Fungsi di queries.ts bisa dipanggil dan mengembalikan data asli dari
  Supabase kalau .env.local sudah diisi kredensial asli (user akan
  mengisi sendiri, jangan minta kredensial ke AI).
```

---

## SEGMEN 3 — Autentikasi Opsional (Supabase Auth email/password) & Pencatatan Kunjungan Tamu

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 3: Implementasi login/logout OPSIONAL (bukan wajib) +
pencatatan kunjungan tamu.

PENTING: model akses di sini BUKAN "semua halaman dikunci, wajib login
dulu". Yang benar: dashboard bisa diakses TANPA login (sebagai Tamu),
dan login hanya membuka fitur tambahan (lihat KONTEKS PROYEK bagian
SUMBER DATA & MODEL AKSES).

Lakukan:
1. Buat tabel Supabase `kunjungan_tamu`:
     id bigint generated always as identity primary key,
     waktu timestamptz not null default now(),
     halaman text
   RLS: izinkan role `anon` melakukan INSERT saja (tidak SELECT),
   supaya tamu bisa "dicatat" tapi tidak bisa membaca data kunjungan
   tamu lain. Sertakan SQL CREATE TABLE + RLS POLICY-nya.

2. Buat Server Action atau Route Handler kecil `catatKunjungan(halaman)`
   yang di-panggil dari halaman dashboard (Server Component, dipanggil
   sekali per render, BUKAN dari Client Component supaya tidak
   dobel-catat saat re-render) untuk INSERT satu baris ke
   `kunjungan_tamu`. Jangan blocking rendering halaman kalau insert
   ini gagal (gunakan try/catch, catat error ke console, tapi
   dashboard tetap tampil normal).

3. Halaman app/login/page.tsx: form email + password, styling sesuai
   DESIGN TOKENS. Setelah berhasil login, redirect ke /dashboard (URL
   yang SAMA dengan yang diakses tamu, bukan URL terpisah).

4. Buat helper lib/auth/getUserRole.ts (Server Component only) yang
   mengembalikan salah satu dari: 'tamu' | 'petugas' | 'admin'.
   Role disimpan di tabel Supabase `profiles` (id uuid references
   auth.users, role text check (role in ('petugas','admin'))) --
   dibuat manual oleh Admin lewat Supabase dashboard untuk versi awal,
   TIDAK perlu UI kelola role di segmen ini. CATATAN: 'petugas' dan
   'admin' PERLAKUANNYA SAMA untuk fitur Analisis AI (lihat KONTEKS
   PROYEK) -- helper ini dibuat supaya nanti Admin BISA dibedakan
   untuk fitur kelola user, bukan untuk membedakan akses dashboard/AI.

5. middleware.ts TIDAK melakukan redirect wajib ke /login. Middleware
   HANYA tetap merefresh session (fungsi updateSession dari Segmen 1)
   supaya status login diketahui dengan akurat di setiap Server
   Component, tanpa memaksa siapa pun login untuk mengakses /dashboard.
   Redirect ke /login hanya terjadi kalau user secara eksplisit klik
   tombol "Login".

KRITERIA SELESAI:
- Tanpa login sama sekali, /dashboard tetap bisa diakses (sebagai Tamu)
  dan setiap kali diakses, satu baris baru muncul di tabel
  `kunjungan_tamu`.
- Setelah login dengan akun yang rolenya 'petugas' di tabel `profiles`,
  getUserRole() mengembalikan 'petugas', dan begitu untuk 'admin'.
- Logout mengembalikan status ke 'tamu' (dashboard tetap bisa diakses,
  bukan malah terkunci).
```

---

## SEGMEN 4 — Layout Global: Navbar, Banner, Live Clock, Footer

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 4: Bangun layout global yang dipakai di semua halaman
setelah login (app/(dashboard)/layout.tsx atau serupa).

REFERENSI VISUAL (gaya yang diinginkan, bukan untuk ditiru persis --
ambil semangat "dashboard kesehatan masyarakat yang informatif dan
punya urgensi", bukan mendesain ulang logo instansi):
- Ada badge waktu real-time bergaya "Min 05 Jul 2026 | 16:16:50 WIB"
  di pojok kanan atas, di sebelahnya indikator "● LIVE" berkedip halus
  (pulsing dot merah/hijau, animasi ringan, JANGAN berlebihan)
- Header/banner rapi dengan nama instansi, judul aplikasi, dan periode
  data yang sedang ditampilkan (minggu ke-berapa / bulan apa)

Lakukan:
1. Komponen client LiveClock.tsx ('use client'): menampilkan tanggal +
   jam WIB yang update setiap detik pakai setInterval di dalam
   useEffect (ingat: bersihkan interval di cleanup function supaya
   tidak memory leak). Format: "Min 05 Jul 2026 | 16:16:50 WIB" (locale
   Indonesia, hari disingkat 3 huruf).
2. Komponen LiveBadge.tsx: dot kecil warna hijau/merah dengan animasi
   pulse CSS (@keyframes, bukan JS interval) + teks "LIVE".
3. Navbar.tsx (Server Component pembungkus + bagian kecil Client
   Component untuk interaktivitas): logo/nama instansi di kiri, menu
   navigasi (Dashboard, Kegiatan COP, Kegiatan PHQC) di tengah/kiri-
   tengah, LiveClock + LiveBadge di kanan, lalu di ujung paling kanan:
     - Kalau BELUM login (Tamu): tombol "Login" (pill, background
       putih, teks navy) yang mengarah ke /login.
     - Kalau SUDAH login: badge kecil menampilkan role ('Petugas' atau
       'Admin') + tombol "Logout" yang memanggil supabase.auth.signOut()
       lalu refresh halaman saat ini (bukan hard redirect ke /login,
       supaya tamu tetap bisa lihat dashboard setelah logout).
   Background navbar navy #0F2A38, teks putih. Responsif: menu jadi
   hamburger di layar sempit.
4. Footer.tsx sederhana: nama instansi + tahun berjalan.
5. Buat komponen BERSAMA components/TombolAnalisisAI.tsx (Client
   Component) yang akan dipakai berulang di Dashboard utama, halaman
   COP, dan halaman PHQC (Segmen 5, 6, 7). Terima props:
   { role: 'tamu'|'petugas'|'admin', konteks: string } -- konteks
   dipakai nanti di Segmen 9 untuk tahu data apa yang mau dianalisis
   (mis. "dashboard-utama", "cop-mingguan", "phqc-bulanan").
   Perilaku SEKARANG (Segmen 9 belum dikerjakan, jadi cukup kerangka):
     - role !== 'tamu' -> tombol aktif (teal #0F4C5C), onClick untuk
       sementara boleh console.log atau tampilkan placeholder modal
       "Analisis AI segera hadir" (logika sungguhan menyusul di
       Segmen 9, JANGAN dikerjakan di sini).
     - role === 'tamu' -> tombol tetap tampil tapi styling nonaktif
       (abu-abu, cursor not-allowed) DAN kalau tetap diklik, tampilkan
       modal kecil: "Silakan login untuk mengakses Analisis AI" dengan
       tautan ke /login. Jangan sembunyikan tombolnya sama sekali --
       harus tetap terlihat supaya tamu tahu fitur ini ada.
6. Gabungkan Navbar+Footer di app/(dashboard)/layout.tsx: Navbar di
   atas, children (isi halaman) di tengah, Footer di bawah. Layout ini
   HARUS bisa dirender untuk Tamu maupun user login (jangan taruh
   proteksi auth di level layout).

KRITERIA SELESAI:
- Jam di navbar benar-benar berjalan (update tiap detik) tanpa
  menyebabkan seluruh halaman re-render (isolasi state jam HANYA di
  komponen LiveClock, bukan di layout/page level).
- Navbar tetap terlihat rapi di lebar layar HP (375px) dan desktop.
- Tombol Login/Logout berganti sesuai status auth tanpa perlu reload
  manual browser (Supabase auth state berubah -> UI ikut berubah).
- TombolAnalisisAI konsisten perilakunya: nonaktif+modal-login untuk
  Tamu, aktif+placeholder untuk Petugas/Admin, di halaman mana pun
  dia dipasang.
- Tidak ada console warning tentang hydration mismatch (hindari
  memformat waktu berbeda antara server-render pertama dan client --
  render placeholder statis dulu di server, baru mulai jam berjalan
  setelah mount di client, untuk mencegah hydration error klasik
  Next.js untuk konten yang bergantung waktu).
```

---

## SEGMEN 5 — Halaman Utama Dashboard (Ringkasan KPI)

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 5: Halaman app/(dashboard)/dashboard/page.tsx sebagai
ringkasan utama, terinspirasi gaya poster surveilans (kartu indikator
donut/angka besar, breakdown per wilayah kerja, tabel top kategori)
TAPI disesuaikan dengan data yang benar-benar ada (kegiatan_cop &
kegiatan_phqc), JANGAN mengarang indikator yang datanya tidak tersedia.

PENTING (lihat KONTEKS PROYEK): halaman ini SAMA PERSIS untuk Tamu,
Petugas, maupun Admin -- semua bisa lihat semua data, semua filter.
JANGAN menyembunyikan bagian mana pun berdasarkan status login. Satu-
satunya elemen yang bergantung status login adalah komponen
TombolAnalisisAI (dari Segmen 4) yang ditaruh di bagian atas halaman.

Lakukan (Server Component, ambil data lewat fungsi dari
lib/supabase/queries.ts yang dibuat di Segmen 2, plus panggil
getUserRole() dari Segmen 3 hanya untuk tahu role mana yang dikirim
sebagai prop ke TombolAnalisisAI -- BUKAN untuk menyembunyikan konten):
1. Baris atas: <TombolAnalisisAI role={role} konteks="dashboard-utama" />
   di pojok kanan atas area konten (bukan di navbar).
2. Kartu ringkasan minggu epidemiologi berjalan saat ini (hitung
   otomatis dari tanggal hari ini menggunakan logika yang SAMA dengan
   mmwr_week -- port fungsi itu ke TypeScript di lib/epi-week.ts
   supaya konsisten dengan database, jangan pakai library minggu ISO
   lain): jumlah kapal COP, jumlah kapal PHQC, total ABK, breakdown
   RBA (jumlah Hijau/Kuning/Merah dengan warna sesuai DESIGN TOKENS).
3. Grid kartu per wilayah kerja (6 wilayah): jumlah kunjungan kapal
   minggu ini per wilayah, dengan bar horizontal sederhana (CSS,
   bukan library chart) untuk perbandingan cepat.
4. Bagian "Top Kategori Minggu Ini": ambil dari view_mingguan_kategori
   / view_mingguan_kategori_phqc untuk kategori rba dan
   daerah_terjangkit (COP) -- tampilkan sebagai list dengan bar,
   bukan tabel mentah.
5. Tautan/tombol ke halaman detail: "Lihat Dashboard COP Lengkap" dan
   "Lihat Dashboard PHQC Lengkap".
6. State kosong: kalau belum ada data untuk minggu berjalan, tampilkan
   pesan yang jelas ("Belum ada kegiatan tercatat untuk Minggu
   Epidemiologi ke-X tahun Y") -- bukan kartu kosong tanpa penjelasan.
7. Panggil sekali fungsi pencatatan kunjungan tamu dari Segmen 3
   (catatKunjungan("dashboard-utama")) di Server Component ini.

KRITERIA SELESAI:
- Halaman menampilkan data ASLI dari Supabase (bukan data dummy)
  untuk minggu epidemiologi berjalan, IDENTIK isinya baik diakses
  sebagai Tamu maupun sudah login.
- TombolAnalisisAI tampil dan berperilaku sesuai role (lihat Segmen 4).
- Loading state ditangani dengan benar (Server Component -> pakai
  loading.tsx App Router, bukan spinner manual di client).
- Semua warna RBA konsisten dengan DESIGN TOKENS.
```

---

## SEGMEN 6 — Modul Kegiatan COP

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 6: Halaman app/(dashboard)/cop/page.tsx.

Lakukan:
1. Toggle Mingguan/Bulanan + filter wilayah kerja (Server Component
   dengan searchParams -- INGAT: di Next.js 15 searchParams adalah
   Promise, harus di-await sebelum dipakai).
2. Grafik tren (jumlah kapal, total ABK, ABK WNA, ABK WNI) dari
   view_mingguan_ringkasan / view_bulanan_ringkasan, filter wilayah_kerja.
   Pakai library recharts (install kalau belum ada).
3. Breakdown kategori (negara_kedatangan, rba, faktor_risiko,
   kelengkapan_dokumen, daerah_terjangkit, keberadaan_vektor,
   bendera_kapal) dari view_mingguan_kategori / view_bulanan_kategori,
   ditampilkan sebagai grid card bar-list (pola sama seperti dashboard
   artifact yang sudah pernah dibuat sebelumnya untuk referensi visual,
   sesuaikan ke React Server/Client Component split yang benar: bagian
   interaktif seperti klik-filter di Client Component, fetching data
   awal di Server Component).
4. Tabel data mentah (opsional, collapsible) untuk kebutuhan
   verifikasi/audit data oleh petugas.
5. Sisipkan <TombolAnalisisAI role={role} konteks="cop-mingguan-atau-bulanan"
   /> (dari Segmen 4) di pojok kanan atas halaman, konteks menyesuaikan
   toggle mingguan/bulanan yang sedang aktif.

KRITERIA SELESAI:
- Filter wilayah & toggle mingguan/bulanan berfungsi tanpa full page
  reload yang mengganggu (gunakan client-side state + fetch, atau
  Server Component dengan router.push ke searchParams baru -- pilih
  salah satu pola secara konsisten, jangan campur).
- Data grafik sesuai dengan data di Supabase (uji dengan minimal 2
  minggu epidemiologi berbeda).
- Halaman ini IDENTIK isinya untuk Tamu maupun user login -- hanya
  TombolAnalisisAI yang beda perilaku (lihat Segmen 4).
```

---

## SEGMEN 7 — Modul Kegiatan PHQC

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 7: Halaman app/(dashboard)/phqc/page.tsx.

Sama persis polanya dengan SEGMEN 6, tapi:
- Sumber data: view_mingguan_ringkasan_phqc / view_bulanan_ringkasan_phqc
  dan view_mingguan_kategori_phqc / view_bulanan_kategori_phqc
- Field tanggal acuan: tgl_keberangkatan (BUKAN tgl_kedatangan)
- Kategori breakdown: bendera, rba, tujuan_berlayar,
  pelabuhan_kedatangan, pelabuhan_tujuan (TIDAK ADA faktor_risiko,
  daerah_terjangkit, keberadaan_vektor, kelengkapan_dokumen -- kolom
  itu tidak ada di kegiatan_phqc, JANGAN ditambahkan)
- Grafik tren tambahkan metrik Total Penumpang (WNA+WNI) selain ABK
- Sisipkan <TombolAnalisisAI role={role} konteks="phqc-mingguan-atau-bulanan" />
  sama seperti di Segmen 6.

KRITERIA SELESAI: sama seperti Segmen 6, disesuaikan skema PHQC.
```

---

## SEGMEN 8 — Deployment ke Vercel

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 8: Siapkan aplikasi untuk deploy produksi.

Lakukan:
1. Cek next.config.js/ts: pastikan tidak ada konfigurasi yang cuma
   valid untuk Pages Router (mis. `experimental.appDir` yang sudah
   tidak diperlukan lagi di Next.js 15 -- App Router sudah stabil).
2. Buat vercel.json HANYA kalau ada kebutuhan khusus (region, redirects)
   -- kalau tidak ada, biarkan Vercel pakai auto-detect Next.js
   (JANGAN menimpa framework preset secara manual kalau tidak perlu,
   ini sumber bug klasik: root directory/preset salah).
3. Daftar environment variables yang HARUS di-set di dashboard Vercel
   (Project Settings > Environment Variables), untuk Production DAN
   Preview:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (kalau dipakai di server actions)
4. Pastikan .env.local ada di .gitignore (JANGAN sampai ter-commit).
5. Checklist pra-deploy:
   - `npm run build` sukses di lokal
   - Root Directory di Vercel project settings kosong/benar (bukan
     menunjuk ke subfolder yang salah)
   - Framework Preset terdeteksi otomatis sebagai "Next.js"

KRITERIA SELESAI:
- Deploy production berhasil di Vercel, halaman /login dan /dashboard
  bisa diakses via domain *.vercel.app, dan login benar-benar
  terhubung ke Supabase production (uji end-to-end: login -> lihat
  data asli -> logout).
```

---

## SEGMEN 9 — Analisis AI (Provider Fleksibel, Gratis Rp 0)

```
[Salin KONTEKS PROYEK di atas, lalu tempel ini di bawahnya]

TUGAS SEGMEN 9: Implementasi TombolAnalisisAI (kerangkanya sudah ada
dari Segmen 4) supaya benar-benar memanggil AI, dengan aturan:

SPESIFIKASI HASIL ANALISIS:
- Setiap analisis menghasilkan 3 bagian: (1) Ringkasan tren periode
  berjalan dalam bahasa natural, (2) Deteksi anomali/lonjakan yang
  perlu diwaspadai dibanding periode sebelumnya, (3) Rekomendasi
  tindak lanjut singkat (mirip semangat bagian "Rekomendasi" di
  poster SIGAP SKDR, TAPI ditulis berdasarkan angka yang benar-benar
  ada di data, jangan mengarang klaim yang tidak didukung data).
- Sumber data: ambil dari view yang sesuai konteks (mis. konteks
  "cop-mingguan" -> query view_mingguan_ringkasan + view_mingguan_kategori
  untuk periode yang sedang dipilih user DAN periode sebelumnya untuk
  perbandingan tren).

PROVIDER AI -- FLEKSIBEL, DIKONFIGURASI ADMIN, GRATIS:
- Buat tabel `pengaturan_ai` (SQL di bawah) yang menyimpan konfigurasi
  provider: nama tampilan bebas, tipe provider ('gemini' ATAU
  'openai_compatible' -- tipe kedua ini mencakup xAI/console.x.ai,
  Groq, OpenRouter, atau provider gratis lain yang kompatibel format
  OpenAI, jadi admin bisa isi base_url + model + api_key APA SAJA
  tanpa perlu kode baru tiap ganti provider), model, dan api_key.
- KEAMANAN API KEY (WAJIB): tabel `pengaturan_ai` TIDAK BOLEH punya
  policy SELECT untuk role `anon` maupun `authenticated` -- hanya bisa
  dibaca lewat `service_role` di server (Route Handler), supaya
  api_key TIDAK PERNAH terkirim ke browser dalam bentuk apa pun,
  termasuk ke browser Admin sendiri. Form pengaturan di UI Admin
  bersifat WRITE-ONLY untuk field api_key: kalau sudah pernah diisi,
  tampilkan placeholder "•••• sudah diisi, isi ulang untuk mengganti"
  -- JANGAN pernah menampilkan api_key asli kembali ke form.
- Buat lib/ai/providers/gemini.ts dan lib/ai/providers/openaiCompatible.ts
  (dua adapter dengan interface sama: menerima {apiKey, model, baseUrl?,
  prompt} dan mengembalikan teks respons), lalu lib/ai/index.ts yang
  memilih adapter berdasarkan tipe_provider dari `pengaturan_ai` yang
  sedang aktif.
- Halaman app/(dashboard)/admin/pengaturan-ai/page.tsx: form kelola
  provider (nama tampilan, tipe, base_url, model, api_key). HANYA bisa
  diakses kalau getUserRole() === 'admin' (kalau bukan admin yang
  mengakses URL ini langsung, redirect ke /dashboard, JANGAN 500 error).
- Di TombolAnalisisAI (Segmen 4): tambahkan ikon kecil "⚙ Atur AI" DI
  SEBELAH tombol utama, HANYA muncul kalau role === 'admin', mengarah
  ke /admin/pengaturan-ai. Untuk role === 'petugas', yang tampil HANYA
  tombol "Jalankan Analisis AI" polos tanpa ikon pengaturan itu.

CACHE HARIAN (supaya hemat kuota gratis):
- Sebelum memanggil API AI, Route Handler cek dulu ke
  `riwayat_analisis_ai`: kalau sudah ADA baris dengan konteks+
  periode_key+wilayah_kerja yang sama DAN dibuat_pada masih di HARI
  YANG SAMA (bandingkan tanggal lokal WIB, bukan UTC mentah), kembalikan
  baris itu SEBAGAI HASIL (tandai di response `dariCache: true`) TANPA
  memanggil API AI lagi.
- Sediakan tombol kecil "Perbarui Analisis" di panel hasil (memaksa
  panggilan API baru, mengabaikan cache) -- boleh dipakai baik oleh
  Petugas maupun Admin, TIDAK perlu dibatasi ke Admin saja.

SQL (jalankan di Supabase SQL Editor):
  create table if not exists pengaturan_ai (
    id bigint generated always as identity primary key,
    nama_tampilan text not null,
    tipe_provider text not null check (tipe_provider in ('gemini','openai_compatible')),
    base_url text,
    model text not null,
    api_key text not null,
    aktif boolean not null default true,
    dibuat_pada timestamptz not null default now()
  );
  alter table pengaturan_ai enable row level security;
  -- SENGAJA TIDAK ADA policy SELECT untuk anon/authenticated.

  create table if not exists riwayat_analisis_ai (
    id bigint generated always as identity primary key,
    konteks text not null,
    periode_key text not null,
    wilayah_kerja text,
    provider_dipakai text not null,
    ringkasan text not null,
    anomali text,
    rekomendasi text,
    dibuat_oleh uuid references auth.users(id),
    dibuat_pada timestamptz not null default now()
  );
  alter table riwayat_analisis_ai enable row level security;

  create policy "petugas_admin_boleh_baca_riwayat"
    on riwayat_analisis_ai for select to authenticated using (true);
  create policy "petugas_admin_boleh_insert_riwayat"
    on riwayat_analisis_ai for insert to authenticated with check (true);

  create index if not exists idx_riwayat_ai_lookup
    on riwayat_analisis_ai (konteks, periode_key, wilayah_kerja, dibuat_pada desc);

ROUTE HANDLER:
- app/api/analisis-ai/route.ts (POST), menerima { konteks, periode_key,
  wilayah_kerja, paksaPerbarui }. Alur:
  1. Ambil role via getUserRole() dari cookie/session server-side.
     Kalau 'tamu' -> return 403 (jangan percaya role dari body request,
     SELALU verifikasi ulang di server, JANGAN andalkan validasi
     client-side saja).
  2. Kalau !paksaPerbarui, cek cache harian di riwayat_analisis_ai.
     Kalau ketemu, return langsung.
  3. Kalau tidak ada cache/dipaksa perbarui: ambil `pengaturan_ai` yang
     aktif=true pakai Supabase client SERVICE ROLE (bukan client biasa,
     supaya bisa baca tabel yang RLS-nya sengaja tertutup untuk role
     lain) -- BUAT client service-role terpisah di
     lib/supabase/serviceRole.ts, JANGAN pernah import ini di kode yang
     bisa jalan di browser.
  4. Ambil data dari view yang relevan (periode berjalan + periode
     sebelumnya untuk pembanding tren).
  5. Susun prompt terstruktur (system prompt yang minta output JSON
     dengan 3 field: ringkasan, anomali, rekomendasi -- supaya gampang
     di-parse, bukan teks bebas).
  6. Panggil lib/ai/index.ts sesuai provider aktif.
  7. Simpan hasil ke riwayat_analisis_ai, kembalikan ke client.
  8. Kalau provider belum dikonfigurasi Admin sama sekali (tabel
     pengaturan_ai kosong), return pesan jelas: "Analisis AI belum
     dikonfigurasi. Hubungi Admin." -- JANGAN error 500 mentah.

KRITERIA SELESAI:
- Sebagai Tamu, memanggil endpoint ini (langsung via curl/Postman pun)
  tetap ditolak 403, membuktikan validasi role di server bukan cuma di UI.
- Sebagai Petugas, klik "Jalankan Analisis AI" menghasilkan 3 bagian
  (ringkasan/anomali/rekomendasi) berdasarkan data asli.
- Mengklik tombol yang sama lagi di hari yang sama untuk konteks+
  periode yang sama TIDAK memanggil API AI lagi (bisa dibuktikan lewat
  log/network tab -- responsnya `dariCache: true`).
- Sebagai Admin, ikon "⚙ Atur AI" muncul dan bisa menyimpan konfigurasi
  provider baru; api_key yang sudah tersimpan tidak pernah tampil ulang
  di form.
- Sebagai Petugas (bukan admin), mengakses URL /admin/pengaturan-ai
  langsung lewat address bar tetap ditolak/redirect, BUKAN malah bisa
  masuk karena tombolnya saja yang disembunyikan di UI.
```

---

## Catatan Penggunaan

- Kalau di tengah mengerjakan satu segmen AI-nya "nyasar" (menambahkan
  fitur di luar cakupan segmen, atau mengubah skema yang sudah
  ditentukan), tegur dan tempel ulang bagian KONTEKS PROYEK + segmen
  yang sama -- jangan lanjut ke segmen berikutnya sebelum yang
  sekarang benar-benar sesuai kriteria selesai.
- Simpan file ini di root repo (misal `MASTER_PROMPT.md`) supaya siapa
  pun yang melanjutkan proyek (termasuk Anda sendiri di sesi lain)
  punya rujukan yang sama persis.