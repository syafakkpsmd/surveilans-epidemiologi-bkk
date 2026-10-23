[Salin KONTEKS PROYEK dari MASTER_PROMPT.md, lalu tempel ini di bawahnya]

TAMBAHAN KONTEKS UNTUK SEGMEN INI:

Modul baru: Penyakit Infeksi Emerging, mengisi slot /dashboard/klb yang
sebelumnya placeholder "Segera Hadir" di hub.

12 jenis penyakit yang dipantau: Listeriosis, Hantavirus, Legionellosis,
Infeksi Virus B, Mpox, MERS-CoV, Covid-19, H5N1, Demam Lassa, CCHF,
Meningitis, Oropouche.

13 negara fokus (berdasarkan asal kapal ke wilayah kerja Samarinda):
China, Filipina, Hong Kong, Singapura, Vietnam, Malaysia, India,
Korea Selatan, Taiwan, Arab Saudi, Jepang, Thailand, Bangladesh.

BEDA PENTING dengan kegiatan_cop/kegiatan_phqc: data modul ini bersifat
AGREGAT per periode-negara-penyakit (jumlah kasus), BUKAN data per-kapal.
Sumber data BUKAN Google Apps Script, tapi scraping otomatis dari WHO
GHO API, ECDC CDTR, dan bulletin resmi per-negara (China CDC Weekly,
Taiwan CDC, IDWR Jepang, dll) via GitHub Actions terjadwal mingguan.

TUGAS SEGMEN 10:

1. SQL Supabase (jalankan di SQL Editor):

   create table laporan_penyakit_emerging (
     id bigint generated always as identity primary key,
     penyakit text not null check (penyakit in (
       'Listeriosis','Hantavirus','Legionellosis','Infeksi Virus B','Mpox',
       'MERS-CoV','Covid-19','H5N1','Demam Lassa','CCHF','Meningitis','Oropouche'
     )),
     negara text not null check (negara in (
       'China','Filipina','Hong Kong','Singapura','Vietnam','Malaysia',
       'India','Korea Selatan','Taiwan','Arab Saudi','Jepang','Thailand','Bangladesh'
     )),
     jenis_periode text not null check (jenis_periode in ('mingguan','bulanan')),
     tahun_epid int not null,
     minggu_epid int,   -- wajib diisi kalau jenis_periode = 'mingguan',
                         -- pakai fungsi mmwr_week yang SUDAH ADA di database
                         -- (JANGAN buat ulang logika minggu epid yang berbeda)
     bulan int,          -- wajib diisi kalau jenis_periode = 'bulanan'
     jumlah_kasus int not null default 0,
     jumlah_kematian int not null default 0,
     sumber text not null,  -- mis. 'WHO GHO', 'ECDC CDTR', 'Taiwan CDC'
     dibuat_pada timestamptz not null default now(),
     unique (penyakit, negara, jenis_periode, tahun_epid, minggu_epid, bulan, sumber)
   );
   alter table laporan_penyakit_emerging enable row level security;
   create policy "publik_boleh_baca_klb"
     on laporan_penyakit_emerging for select to anon, authenticated using (true);
   -- SENGAJA TIDAK ADA policy insert/update/delete untuk anon/authenticated
   -- karena data ini HANYA masuk lewat GitHub Actions pakai service_role key.

   create view view_mingguan_penyakit_emerging as
     select tahun_epid, minggu_epid, penyakit, negara,
            sum(jumlah_kasus) as total_kasus,
            sum(jumlah_kematian) as total_kematian
     from laporan_penyakit_emerging
     where jenis_periode = 'mingguan'
     group by tahun_epid, minggu_epid, penyakit, negara;

   create view view_bulanan_penyakit_emerging as
     select tahun_epid, bulan, penyakit, negara,
            sum(jumlah_kasus) as total_kasus,
            sum(jumlah_kematian) as total_kematian
     from laporan_penyakit_emerging
     where jenis_periode = 'bulanan'
     group by tahun_epid, bulan, penyakit, negara;

2. Tipe TypeScript di types/database.types.ts: tambahkan interface
   LaporanPenyakitEmerging dan RingkasanPenyakitEmerging (mingguan/bulanan)
   sesuai kolom di atas. Tambahkan fungsi query di lib/supabase/queries.ts:
   getRingkasanPenyakitEmerging(jenis: 'mingguan'|'bulanan', filter: {...}).

3. Halaman app/(dashboard)/klb/page.tsx, mengikuti pola PERSIS Segmen 6/7:
   - Toggle Mingguan/Bulanan + filter penyakit + filter negara (searchParams,
     ingat harus di-await sesuai aturan Next.js 15)
   - Grafik tren (recharts): total kasus & total kematian per periode,
     bisa dipecah per negara atau per penyakit sesuai filter
   - Breakdown: card bar-list per penyakit (total kasus se-periode) dan
     per negara (total kasus se-periode), warna sesuai DESIGN TOKENS
     (JANGAN pakai warna risiko hijau/kuning/merah di sini karena itu
     khusus kolom rba COP/PHQC -- pakai teal/navy untuk modul ini)
   - Tabel data mentah (collapsible) untuk verifikasi/audit
   - Sisipkan <TombolAnalisisAI role={role} konteks="klb-mingguan-atau-bulanan" />
     (komponen yang SUDAH ADA dari Segmen 4, tinggal pakai ulang)

4. Aktifkan kartu KLB di hub: di components/KartuKategoriHub (atau file
   yang memanggilnya di /dashboard/page.tsx), tambahkan prop href="/dashboard/klb"
   untuk kartu KLB supaya tidak lagi "Segera Hadir".

5. Skrip ingestion (di luar aplikasi Next.js, tapi satu repo):
   .github/workflows/weekly-klb-scrape.yml -- cron mingguan (mis. Senin
   01:00 UTC) + workflow_dispatch untuk trigger manual.
   scripts/klb/scrape_who_gho.py, scrape_ecdc.py, scrape_negara/*.py --
   satu script per sumber, masing-masing mengembalikan list baris siap
   upsert.
   scripts/klb/upload_to_supabase.py -- upsert ke laporan_penyakit_emerging
   pakai SUPABASE_SERVICE_ROLE_KEY (disimpan sebagai GitHub Secret,
   BUKAN di kode), pakai constraint unique yang sudah dibuat di atas
   supaya re-run tidak duplikat data.

KRITERIA SELESAI:
- Tabel & views ada di Supabase, RLS terbukti: anon HANYA bisa SELECT,
  tidak bisa INSERT/UPDATE/DELETE (uji lewat Supabase client biasa).
- Halaman /dashboard/klb tampil data asli, filter & toggle berfungsi,
  identik untuk Tamu maupun user login (hanya TombolAnalisisAI yang beda).
- Kartu KLB di hub sudah aktif, tidak lagi "Segera Hadir".
- GitHub Action bisa di-trigger manual (workflow_dispatch) dan berhasil
  insert minimal 1 baris data asli ke Supabase tanpa error.