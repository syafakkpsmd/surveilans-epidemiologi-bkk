## SEGMEN 14 — Modul Status Kepatuhan Pelaporan (Mingguan & Bulanan)

```
[Salin KONTEKS PROYEK lengkap + tambahan (wilayah kerja 7, skema Segmen 10-13), lalu tempel ini]

TUGAS SEGMEN 14: Buat modul "Status Laporan" berupa 2 matriks kepatuhan
pelaporan per wilker — satu MINGGUAN, satu BULANAN — dengan cakupan
kegiatan yang BERBEDA untuk masing-masing (lihat aturan di bawah,
JANGAN disatukan jadi satu tabel/matriks).

ATURAN CAKUPAN (WAJIB DIIKUTI PERSIS):

1. MATRIKS MINGGUAN — kolom kegiatan berbeda per wilker, daftar wilker
   HARUS eksplisit (lihat poin #5 di bawah, JANGAN pakai filter jenis):
   - WK01 Samarinda, WK02 TanjungSantan, WK03 TanjungLaut, WK04
     Lhoktuan, WK05 Sangatta, WK06 Sangkulirang: kolomnya COP dan
     PHQC saja.
   - WK07 (APT Pranoto): kolomnya "Pesawat" saja (dari kegiatan_pesawat:
     maskapai, penumpang, crew).
   - Baris WK01-WK06 TIDAK punya kolom Pesawat, baris WK07 TIDAK
     punya kolom COP/PHQC (kosongkan/silangi sel yang tidak relevan,
     JANGAN ditampilkan sebagai "Belum" karena itu bukan kewajiban
     wilker tersebut).

2. MATRIKS BULANAN — kolom SAMA untuk seluruh 7 wilker:
   DBD, Tikus, Anopheles, Malaria, TB, HIV, Diare (7 kegiatan dari
   Segmen 10-13), basis waktu BULAN kalender (bukan minggu epidemiologi
   seperti gambar acuan lama — ubah ke bulanan untuk matriks ini).
   - Untuk Anopheles: dianggap "Sudah" kalau ADA SALAH SATU dari
     tipe_pengamatan 'dewasa' ATAU 'larva' di bulan tsb (jangan pisah
     jadi 2 kolom di matriks kepatuhan ini, cukup 1 kolom "Anoph").
   - Untuk Diare: dianggap "Sudah" kalau ADA SALAH SATU dari
     jenis_kegiatan 'lalat' ATAU 'kecoa' di bulan tsb (1 kolom "Diare").

3. SUMBER DATA COUNT (jangan sampai keliru tabel):
   - COP -> kegiatan_cop, filter wilayah_kerja = nama wilker (teks)
   - PHQC -> kegiatan_phqc, filter wilayah_kerja = nama wilker (teks)
   - Pesawat -> kegiatan_pesawat, filter kode_wilker = 'WK07' DAN
     status_data = 'final' SAJA (baris 'rencana' JANGAN dihitung
     sebagai "sudah lapor" karena datanya belum pasti/final)
   - DBD -> vektor_dbd, Tikus -> vektor_tikus,
     Anopheles -> vektor_anopheles, Malaria -> malaria_migrasi,
     TB -> tb_data, HIV -> hiv_data, Diare -> vektor_diare
     (semua filter kode_wilker)

4. PEMETAAN TEKS <-> KODE WILKER (SUDAH DIVERIFIKASI PENUH -- COP DAN
   PHQC PUNYA FORMAT BERBEDA SATU SAMA LAIN, BUKAN CUMA BEDA DARI
   wilker_ref.nama):
   kegiatan_cop.wilayah_kerja pakai format singkat ("TanjungLaut"),
   sedangkan kegiatan_phqc.wilayah_kerja pakai format PANJANG dan TIDAK
   KONSISTEN antar barisnya sendiri ("Pelabuhan Laut Tanjung Santan",
   "Pelabuhan Lhok Tuan" -- tanpa kata "Laut", "Pelabuhan Tanjung Laut"
   -- tanpa kata "Laut" di depan juga). Ini hasil verifikasi langsung ke
   data, bukan asumsi. WAJIB buat tabel mapping berisi SEMUA varian teks
   yang sudah terkonfirmasi ada (12 baris, bukan 6 -- satu set untuk cop,
   satu set untuk phqc; "Samarinda" kebetulan sama di keduanya jadi
   cukup 1 baris):

   create table if not exists wilker_nama_alias (
     wilayah_kerja_teks text primary key,
     kode_wilker text not null references wilker_ref(kode)
   );
   insert into wilker_nama_alias (wilayah_kerja_teks, kode_wilker) values
     -- format kegiatan_cop
     ('Samarinda', 'WK01'),
     ('TanjungSantan', 'WK02'),
     ('TanjungLaut', 'WK03'),
     ('Lhoktuan', 'WK04'),
     ('Sangatta', 'WK05'),
     ('Sangkulirang', 'WK06'),
     -- format kegiatan_phqc (BEDA total, jangan diasumsikan sama pola)
     ('Pelabuhan Laut Tanjung Santan', 'WK02'),
     ('Pelabuhan Tanjung Laut', 'WK03'),
     ('Pelabuhan Lhok Tuan', 'WK04'),
     ('Pelabuhan Laut Sangatta', 'WK05'),
     ('Pelabuhan Laut Sangkulirang', 'WK06')
   on conflict (wilayah_kerja_teks) do nothing;

   Sebuah wilker (mis. TanjungSantan) BISA saja punya 0 data COP tapi
   ADA data PHQC di tahun berjalan (kasus nyata, sudah dikonfirmasi) --
   ini NORMAL, bukan bug. Query count harus tetap LEFT JOIN per
   wilker+kegiatan secara independen (bukan "kalau salah satu kosong
   anggap keduanya kosong").

   RISIKO JANGKA PANJANG (WAJIB DIANTISIPASI, karena data ini diketik
   manual di spreadsheet oleh petugas, bukan dropdown baku): kalau nanti
   muncul varian teks BARU yang belum ada di tabel alias (mis. petugas
   mengetik "Pelabuhan Tj. Santan"), JOIN akan gagal cocok dan wilker
   tsb akan tampil "Belum" secara DIAM-DIAM padahal datanya sebenarnya
   ada -- ini gagal senyap yang berbahaya untuk dashboard kepatuhan.
   WAJIB buat query audit berikut dan panggil dari halaman
   status-laporan (tampilkan sebagai banner peringatan kalau hasilnya
   tidak kosong, JANGAN sembunyikan):

   select distinct wilayah_kerja from kegiatan_cop
   where wilayah_kerja not in (select wilayah_kerja_teks from wilker_nama_alias)
   union all
   select distinct wilayah_kerja from kegiatan_phqc
   where wilayah_kerja not in (select wilayah_kerja_teks from wilker_nama_alias);

5. CAKUPAN WILKER YANG DIPAKAI DI MATRIKS INI (WAJIB EKSPLISIT, JANGAN
   ANDALKAN FILTER jenis):
   `wilker_ref` SEKARANG PUNYA 9 BARIS, bukan 7 -- ada WK08 (PT. Badak
   LNG Bontang) dan WK09 (Tanjung Bara Sangatta) yang JUGA berjenis
   'Bandara' tapi TIDAK ADA kegiatan surveilans di sana sama sekali.
   Kalau matriks di-generate dengan filter `jenis = 'Bandara'`, WK08/
   WK09 akan ikut muncul dan tampil "Belum" terus-menerus secara keliru.
   WAJIB filter eksplisit: `kode_wilker in ('WK01','WK02','WK03','WK04',
   'WK05','WK06','WK07')` di SETIAP query/view Segmen ini (baik matriks
   mingguan maupun bulanan) -- JANGAN pernah query wilker_ref tanpa
   filter kode ini, dan JANGAN pakai kondisi `jenis = 'Pelabuhan'` atau
   `jenis = 'Bandara'` sebagai pengganti daftar kode eksplisit ini,
   supaya kalau nanti wilker_ref nambah baris baru lagi (WK10, dst),
   modul ini tidak otomatis ikut menampilkannya tanpa sepengetahuan tim.

Lakukan:

A. Backend (SQL, jalankan di Supabase SQL editor):
   1. Buat tabel wilker_nama_alias + isi baris mapping sesuai poin #4
      (WAJIB, mapping sudah diverifikasi tidak sama persis -- lihat
      catatan soal kegiatan_phqc yang perlu dicek user sebelum insert).
   2. Buat fungsi SQL `status_lapor_mingguan(p_tahun int, p_minggu int)`
      RETURNS TABLE(kode_wilker text, kegiatan text, jumlah bigint)
      -- UNION ALL 3 subquery (COP, PHQC, Pesawat) seperti dijelaskan
      di ATURAN CAKUPAN #1 dan #3, filter minggu epidemiologi pakai
      mmwr_week() yang SUDAH ADA (jangan bikin fungsi minggu baru).
   3. Buat fungsi SQL `status_lapor_bulanan(p_tahun int, p_bulan int)`
      RETURNS TABLE(kode_wilker text, kegiatan text, jumlah bigint)
      -- UNION ALL 7 subquery (DBD/Tikus/Anoph/Malaria/TB/HIV/Diare)
      sesuai ATURAN CAKUPAN #2 dan #3, filter pakai
      EXTRACT(YEAR/MONTH FROM kolom_tanggal_masing_masing).

B. Frontend:
   1. Tambah kartu baru "Status Laporan" / "Kepatuhan Pelaporan" di
      hub /dashboard (KartuKategoriHub), href ke
      /dashboard/status-laporan.
   2. app/(dashboard)/dashboard/status-laporan/page.tsx: 2 tab/toggle
      "Mingguan" | "Bulanan" (Client Component kecil untuk toggle,
      data fetching di Server Component per tab lewat searchParams --
      ingat await searchParams di Next.js 15).
   3. Tab Mingguan: picker tahun+minggu epidemiologi (default: minggu
      berjalan, pakai lib/epi-week.ts yang sudah ada dari Segmen 5),
      render tabel 7 wilker x kolom {COP, PHQC, Pesawat} dengan sel
      abu-abu/silang (bukan kuning) untuk kombinasi yang tidak relevan
      (lihat ATURAN CAKUPAN #1), badge hijau "✅ Sudah" / kuning
      "⏳ Belum" mengikuti style DESIGN TOKENS RBA yang sudah ada
      (JANGAN pakai warna risiko RBA untuk status lapor -- pakai
      hijau/kuning generik terpisah supaya tidak tertukar makna).
   4. Tab Bulanan: picker tahun+bulan kalender, render tabel 7 wilker x
      kolom {DBD, Tikus, Anoph, Malaria, TB, HIV, Diare} sama persis
      pola visual seperti gambar acuan (kolom "Kelengkapan" di kanan =
      persentase jumlah "Sudah" dari 7 kegiatan per wilker, progress
      bar seperti pada gambar).
   5. Kedua tabel TIDAK memakai TombolAnalisisAI (ini halaman
      kepatuhan administratif, bukan analisis epidemiologi -- jangan
      dipasang tombol itu di sini kecuali user memintanya belakangan).
   6. lib/supabase/queries.ts: tambah getStatusLaporMingguan(tahun,
      minggu) dan getStatusLaporBulanan(tahun, bulan) yang memanggil
      2 fungsi SQL di atas lewat .rpc(), lalu susun ulang jadi
      struktur per-wilker di sisi TypeScript (bukan di SQL) supaya
      gampang di-render sebagai tabel.

KRITERIA SELESAI:
- Ganti data uji: insert 1 baris kegiatan_cop untuk 1 wilker minggu
  ini -> sel COP wilker itu di tab Mingguan berubah jadi "Sudah".
- Insert 1 baris kegiatan_pesawat dengan status_data='rencana' untuk
  minggu ini -> sel Pesawat TETAP "Belum" (karena rencana tidak
  dihitung).
- Wilker Pelabuhan tidak pernah menampilkan sel "Belum" untuk kolom
  Pesawat, dan wilker Bandara tidak pernah menampilkan sel "Belum"
  untuk kolom COP/PHQC -- keduanya tampil sebagai sel non-aplikatif.
- Tab Bulanan: insert 1 baris vektor_diare (jenis_kegiatan='kecoa')
  bulan ini untuk 1 wilker -> kolom "Diare" wilker itu jadi "Sudah"
  tanpa perlu data lalat juga.
- Kolom "Kelengkapan" (%) di tab Bulanan menghitung benar dari 7
  kegiatan per wilker.
```

---

### Catatan sebelum menjalankan segmen ini

1. **Sudah diverifikasi**: `wilayah_kerja` di `kegiatan_cop` TIDAK sama
   formatnya dengan `wilker_ref.nama` ("TanjungLaut" vs "Pelabuhan
   Tanjung Laut") -- karena itu tabel `wilker_nama_alias` sekarang wajib,
   bukan opsional. Yang MASIH perlu dicek sebelum menempel Segmen 14 ke
   sesi coding: format `wilayah_kerja` di `kegiatan_phqc` (jalankan
   `select distinct wilayah_kerja from kegiatan_phqc order by 1;`) --
   kalau formatnya sama dengan kegiatan_cop (mis. "TanjungSantan" tanpa
   spasi), tabel alias yang sudah ada bisa langsung dipakai untuk kedua
   sumber. Kalau beda, sesuaikan dulu isi tabelnya sebelum lanjut.
   Juga dikonfirmasi: `wilker_ref` sekarang 9 baris (WK01-WK09), WK08 &
   WK09 sengaja di-exclude dari modul ini (lihat poin #5 di segmen).

2. Segmen ini SENGAJA tidak menyentuh `TombolAnalisisAI` / infrastruktur
   AI dari Segmen 9/13 — ini murni tabel kepatuhan administratif, bukan
   analisis epidemiologi. Kalau nanti mau ditambah tombol semacam
   "Ingatkan wilker yang belum lapor" (notifikasi), itu perlu segmen
   terpisah karena menyangkut pengiriman pesan (WA/email), bukan cuma
   tampilan data.