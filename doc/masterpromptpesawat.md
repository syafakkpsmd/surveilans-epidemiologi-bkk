# MASTER PROMPT — Modul Alat Angkut Pesawat (EPIC-AI)

Dokumen ini adalah konteks lengkap untuk melanjutkan pengembangan modul
**Alat Angkut Pesawat** di project EPIC-AI (BKK Kelas I Samarinda).
Paste/upload dokumen ini di awal percakapan baru agar Claude langsung
punya konteks penuh tanpa perlu dijelaskan ulang dari nol.

## 1. Konteks Project
- **EPIC-AI**: dashboard surveilans epidemiologi Next.js 15 + Supabase,
  BKK Kelas I Samarinda, mencakup 7 wilker (pelabuhan & bandara Kaltim).
- Modul ini setara dengan modul lain yang sudah ada: `kegiatan_cop`,
  `kegiatan_phqc`, Vektor Aedes (DBD).
- Sync data pakai pola Google Apps Script (GAS) anti-duplikat, sama
  seperti modul COP/PHQC sebelumnya.

## 2. Status Pengerjaan Modul Ini
- [x] Skema tabel Supabase (`kegiatan_pesawat`) — SELESAI
- [x] RLS policy + GRANT — SELESAI
- [x] View rekap (`v_kegiatan_pesawat_rekap`) — SELESAI
- [x] GAS sync script (Sheets → Supabase) — SELESAI, sudah diuji
- [ ] **Halaman dashboard (filter, chart, widget "rencana")** — BELUM DIMULAI ⬅️ LANGKAH BERIKUTNYA

## 3. Skema Data (`kegiatan_pesawat`)
Header spreadsheet asli:
```
tanggal, maskapai, keberangkatan, crew_berangkat, penumpang_perangkat,
sklt_male, sklt_female, td_laik_male, td_laik_female, iaos_male, iaos_female,
jenazah_male, jenazah_female, kedatangan, crew_datang, penumpang_datang,
kier_male, kier_female
```
Kolom `penumpang_perangkat` di sheet adalah typo dari `penumpang_berangkat`
di database — mapping ini ditangani di GAS script (`COLUMN_MAP`), bukan
dengan mengubah sheet.

**Sertifikat = jumlah orang yang diterbitkan sertifikatnya (bukan jumlah pemeriksaan):**
- `SKLT` = Surat Keterangan Laik Terbang
- `TD Laik` = sertifikat kategori "TD" (Laik)
- `IAOS` = Ijin Angkut Orang Sakit
- `KIER` = Surat Keterangan Kesehatan
- `Jenazah` = data transportasi jenazah (bukan sertifikat kesehatan biasa)
Semua kategori punya breakdown `_male` / `_female`.

Kolom tambahan penting di tabel:
- `kode_wilker` — FK ke `wilker_ref(kode)`, format `WK01`-`WK07`. **Bandara APT Pranoto = `WK07`**, satu-satunya wilker berjenis Bandara dari 7 wilker yang ada (6 lainnya berjenis Pelabuhan, termasuk Tanjung Santan/`WK02` yang ternyata Pelabuhan bukan Bandara).
- `status_data` — `'final'` atau `'rencana'` (lihat aturan bisnis di #4)
- `status_kirim` — dipakai di level SHEET untuk tracking sync, bukan filter dashboard

**Catatan penting soal RLS:** project ini TIDAK pakai role/wilker-based RLS di database. Policy di `kegiatan_cop` (dicek langsung via `pg_policy`) semuanya `using(true)`/`with check(true)` — kontrol akses per-wilker/role ditangani di level aplikasi Next.js, bukan RLS. Modul ini mengikuti pola yang sama (RLS aktif tapi permissive).

**Catatan penting soal wilker:** ada 2 pola berbeda antar tabel existing —
`kegiatan_cop` pakai teks nama penuh (`wilayah_kerja`), `vektor_dbd` pakai
kode (`kode_wilker`, FK ke `wilker_ref.kode`). Modul ini sengaja pakai
`kode_wilker` (pola vektor) karena lebih normalized.

File: `migration_kegiatan_pesawat.sql`

## 4. ATURAN BISNIS PENTING (jangan sampai lupa saat bangun dashboard!)

### a. Kriteria data "siap sync"
Baris hanya disync ke Supabase kalau **`penumpang_berangkat` DAN
`penumpang_datang` sudah terisi keduanya** (bukan cuma crew). Kalau
salah satu kosong, baris dilewati sampai keduanya terisi.

### b. Final vs Rencana
Petugas kadang menulis data H+2/H+3 di muka (tanggal + penumpang sudah
pasti, tapi sertifikat belum). Maka:
- Tanggal ≤ hari ini → `status_data = 'final'`
- Tanggal > hari ini → `status_data = 'rencana'`
- Begitu tanggalnya tiba, baris "rencana" **otomatis di-upgrade** jadi
  "final" di sync berikutnya (dicek ulang tiap malam).

### c. Implikasi untuk Dashboard
- Statistik/chart resmi: **WAJIB filter `status_data = 'final'`**
- Baris `status_data = 'rencana'` ditampilkan **terpisah** sebagai
  widget "Jadwal Kedatangan/Keberangkatan Mendatang" — JANGAN dicampur
  ke perhitungan statistik utama (karena sertifikatnya belum final,
  biasanya masih 0).

## 5. GAS Sync Script
File: `sync_kegiatan_pesawat.gs`

Konfigurasi yang wajib diisi manual sebelum dipakai (bagian `CONFIG`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service role, bukan anon)
- `SHEET_NAME`, `KODE_WILKER` (default `'WK07'` = Bandara APT Pranoto)

Mekanisme:
- Upsert via Supabase REST API (`on_conflict=id`), pakai `uuid_baris`
  per baris supaya idempoten (aman dijalankan berkali-kali)
- `onEdit` trigger otomatis mereset status jadi "Perlu Sync Ulang" kalau
  baris yang sudah terkirim diedit lagi (misal sertifikat baru diisi
  belakangan)
- Trigger malam hari jam 23:00 (`createNightlyTrigger()`)
- Normalisasi tanggal fleksibel (format "12 Juli 2026", "12/07/2026", ISO)

## 6. Skema Sudah Diverifikasi Langsung ke Database (bukan asumsi lagi)
- Tabel `profiles` hanya punya kolom: `id`, `role`, `status`, `nama_lengkap` — TIDAK ada `wilker_id`.
- Tabel wilker master bernama `wilker_ref` (bukan `wilker`), kolom: `kode`, `nama`, `jenis`, `lat`, `lng`, `sub_lokasi`, `catatan`.
- RLS di seluruh project ini permissive (`true`), bukan role/wilker-based.
- Fungsi `mmwr_week()` sudah ada di database (dipakai modul lain juga).
- 1 Google Sheet = 1 wilker (bukan sheet gabungan multi-wilker). Untuk modul ini praktis hanya WK07 (Bandara APT Pranoto) yang relevan, karena hanya wilker itu yang berjenis Bandara.

## 7. LANGKAH BERIKUTNYA (mulai dari sini di sesi baru)
Bangun halaman dashboard untuk modul Alat Angkut Pesawat:
- Filter mingguan/bulanan (pola sama seperti modul Vektor Aedes)
- Chart breakdown sertifikat per jenis (SKLT/TD Laik/IAOS/KIER/Jenazah),
  per maskapai, per wilker
- Widget/kartu terpisah untuk data `status_data = 'rencana'`
  ("Jadwal Akan Datang") — desain UI beda dari data final supaya user
  tidak bingung mengira ini data pasti
- Pertimbangkan apakah butuh tombol AI Analysis/AI Prediction per chart
  seperti modul Vektor Aedes (opsional, tanyakan ke user)

---
*Update dokumen ini setiap kali ada perubahan skema/aturan bisnis di
modul ini, supaya tetap jadi sumber kebenaran tunggal (single source
of truth) untuk onboarding sesi baru.*