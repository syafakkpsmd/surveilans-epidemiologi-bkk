# Pindah dari MariaDB ke PostgreSQL (cPanel BKK Kelas I Samarinda)

Dibuat 31 Oktober 2026, branch `migrasi-postgres`. Basis data tujuan: PostgreSQL di cPanel yang sama (`localhost:5432`).

## Yang sudah dikerjakan dan teruji (di PostgreSQL 16 + MariaDB 10.11 sandbox, data sintetis)

| Bagian | Berkas | Hasil uji |
|---|---|---|
| Skema PostgreSQL (68 tabel, 42 view, fungsi, trigger) | `schema/postgres/01..04_*.sql` dibuat oleh `scripts/migrate/pg-buat-skema.mjs` | terpasang bersih; view dan fungsi memakai definisi ASLI Supabase |
| Salin data + verifikasi | `scripts/migrate/mariadb-ke-postgres.mjs` | 68 tabel, 2701 baris, jumlah/min/maks/panjang teks per kolom sama; aman diulang |
| Perbandingan view | `scripts/migrate/pg-bandingkan-view.mjs` | 42 view + `status_lapor_bulanan` cocok dengan MariaDB |
| Klien dan query builder | `lib/db/client.ts`, `lib/db/query-builder.ts` | 77 fungsi query: hasil sama dengan MariaDB (lihat catatan `\|\|`) |
| Jalur tulis | `scripts/migrate/uji-tulis-pg.ts` | 24 uji lulus (insert/update/upsert/delete/rpc/transaksi/login/posko/penumpang kapal paralel) |
| Build | `npx tsc --noEmit`, `next build` | bersih |

Catatan hasil banding: satu-satunya selisih adalah `getRuteMigrasiTeratas`. Di MariaDB operator `||` berarti OR sehingga rute selalu "0"; di PostgreSQL `||` menyambung teks, jadi hasilnya kini benar.

## Langkah pindah

1. `git fetch && git checkout migrasi-postgres && npm install`
2. Pastikan PostgreSQL cPanel versi 13 atau lebih baru: jalankan `SELECT version();` (butuh `gen_random_uuid()`).
3. `.env.local`: salin `env.postgres.example`. Selama migrasi `DB_*` = MariaDB (sumber), `PG_*` = PostgreSQL (tujuan).
4. Jalur akses PostgreSQL cPanel (pilih satu):
   - **A. Dari komputer Anda**: cPanel → Remote Database Access (PostgreSQL), daftarkan IP komputer, isi `PG_HOST` dengan host server.
   - **B. Dari server lewat SSH**: jalankan semua perintah di bawah di server (MariaDB dan PostgreSQL sama-sama `localhost`).
   - **C. Tanpa akses jarak jauh**: pasang PostgreSQL lokal, jalankan migrasi ke sana, lalu `pg_dump` dan pulihkan lewat phpPgAdmin atau `psql` di cPanel.
5. Pasang skema awal: `node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs schema/postgres/01_tabel.sql schema/postgres/02_fungsi_trigger.sql`
6. Coba dulu: `node --env-file=.env.local scripts/migrate/mariadb-ke-postgres.mjs --dry-run`
7. Satu tabel kecil: `... mariadb-ke-postgres.mjs --tabel=wilker_ref`
8. Semua tabel: `... mariadb-ke-postgres.mjs` (otomatis memasang `03_indeks_fk.sql` dan `04_view.sql`, menyetel ulang nomor otomatis, lalu verifikasi). Laporan: `data-export/mariadb_ke_postgres_laporan.txt` (tanpa isi data).
9. Bandingkan view: `node --env-file=.env.local scripts/migrate/pg-bandingkan-view.mjs --prosedur`
10. Ganti `DB_*` ke PostgreSQL, hapus `PG_*`, jalankan `npm run dev`, bandingkan angka dashboard dengan versi MariaDB.
11. Deploy: set `DB_*` PostgreSQL di panel AI App Hosting, Retry Deploy. Simpan MariaDB sebagai cadangan minimal 30 hari.

## Beda perilaku yang perlu diketahui

- **Huruf besar/kecil**: perbandingan teks di PostgreSQL peka huruf (MariaDB tidak). Data wilayah kerja sudah baku, jadi aman; kode baru yang membandingkan teks bebas perlu `ILIKE` atau `lower()`.
- **Urutan teks**: ditentukan collation database PostgreSQL. Daftar yang diurutkan teks bisa berbeda urutan dari MariaDB (isi sama). Kosmetik.
- **Baris sama nilai urut**: tanpa `ORDER BY` lengkap, urutan baris kembar bisa berbeda. Isi sama.
- **Pembagian bilangan bulat**: `a / b` pada dua integer di PostgreSQL menghasilkan bilangan bulat. Pakai `::numeric` bila butuh pecahan.
- **Karakter NUL** (`\u0000`) ditolak PostgreSQL; skrip migrasi melaporkan barisnya, tidak memotong diam-diam.
- Hak pengguna: pengguna PostgreSQL harus pemilik tabel (skrip mematikan trigger per tabel saat menyalin).

## Belum dikerjakan

- Diuji hanya dengan data sintetis; jalankan langkah 6 sampai 10 pada data asli dan kirim hanya laporannya.
- `mysql2` dan skrip migrasi MariaDB lama masih di repo (dipakai sebagai sumber). Hapus setelah cutover.
- Titik yang masih memanggil Supabase langsung (lihat `docs/MIGRASI_MARIADB.md`, log 27 Okt) tidak terpengaruh.
