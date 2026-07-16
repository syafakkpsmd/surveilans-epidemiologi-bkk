-- ==========================================================
-- SEGMEN 3 -- kunjungan_tamu & profiles (+ RLS)
-- Jalankan di Supabase SQL Editor. Aman dijalankan berkali-kali
-- (CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS sebelum CREATE).
-- ==========================================================

-- ---------- 1. TABEL kunjungan_tamu ----------
-- Hanya hitungan kunjungan (bukan data pribadi/IP), sesuai
-- KONTEKS PROYEK bagian SUMBER DATA & MODEL AKSES.

CREATE TABLE IF NOT EXISTS kunjungan_tamu (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  halaman text
);

ALTER TABLE kunjungan_tamu ENABLE ROW LEVEL SECURITY;

-- Tamu (role anon) DAN user yang sudah login (role authenticated)
-- boleh INSERT -- pencatatan kunjungan tidak dibedakan status login.
DROP POLICY IF EXISTS "siapa_pun_boleh_insert_kunjungan_tamu" ON kunjungan_tamu;
CREATE POLICY "siapa_pun_boleh_insert_kunjungan_tamu"
ON kunjungan_tamu
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- SENGAJA TIDAK ADA POLICY SELECT -- baik anon maupun authenticated
-- tidak bisa membaca isi tabel ini lewat anon/authenticated key.
-- Kalau nanti perlu direkap (mis. untuk halaman statistik kunjungan
-- internal), baca lewat service_role key di backend, bukan lewat
-- Supabase client biasa.


-- ---------- 2. TABEL profiles ----------
-- Baris dibuat MANUAL oleh Admin lewat Supabase Studio untuk versi
-- awal (belum ada UI kelola user di segmen ini).

CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('petugas', 'admin'))
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User yang login hanya boleh membaca baris profil MILIKNYA SENDIRI --
-- cukup untuk kebutuhan getUserRole(), tidak untuk melihat role user lain.
DROP POLICY IF EXISTS "user_boleh_baca_profil_sendiri" ON profiles;
CREATE POLICY "user_boleh_baca_profil_sendiri"
ON profiles
FOR SELECT
TO authenticated
USING (id = (select auth.uid()));

-- TIDAK ADA policy INSERT/UPDATE/DELETE untuk anon/authenticated --
-- baris profiles hanya diisi manual oleh Admin lewat Supabase Studio
-- (yang memakai service_role, otomatis melewati RLS).

-- ---------- CONTOH: menambahkan role manual lewat SQL Editor ----------
-- (alternatif dari mengisi lewat Table Editor UI)
--
-- INSERT INTO profiles (id, role)
-- VALUES ('uuid-user-dari-auth.users', 'petugas')
-- ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;