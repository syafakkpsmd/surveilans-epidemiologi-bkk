-- Tahap 5: autentikasi di MariaDB (pengganti Supabase Auth).
-- Sengaja tanpa FOREIGN KEY ke profiles(id): tipe/kolasi kolom id hasil migrasi
-- belum saya lihat. Tambahkan FK setelah tipe profiles.id dipastikan sama.

CREATE TABLE IF NOT EXISTS auth_kredensial (
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,            -- bcrypt ($2a$/$2b$), disalin apa adanya dari auth.users
  email_terverifikasi_pada DATETIME(3) NULL,
  dibuat_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  diubah_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_auth_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sesi (
  token_hash CHAR(64) NOT NULL,               -- SHA-256 dari token di cookie; token asli tidak disimpan
  user_id CHAR(36) NOT NULL,
  dibuat_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  berakhir_pada DATETIME(3) NOT NULL,
  terakhir_aktif DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),  -- untuk batas tidak aktif 25 menit
  PRIMARY KEY (token_hash),
  KEY idx_sesi_user (user_id),
  KEY idx_sesi_berakhir (berakhir_pada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pembatas percobaan login (per email+IP).
CREATE TABLE IF NOT EXISTS auth_percobaan (
  kunci VARCHAR(320) NOT NULL,
  jumlah INT NOT NULL DEFAULT 0,
  jendela_mulai DATETIME(3) NOT NULL,
  PRIMARY KEY (kunci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
