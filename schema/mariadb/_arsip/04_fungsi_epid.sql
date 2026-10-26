-- =====================================================================
-- 04_fungsi_epid.sql  (Tahap 4: fungsi minggu epidemiologi)
-- Pengganti fungsi PostgreSQL `mmwr_week(date)` (mengembalikan TABEL tahun_epid, minggu_epid) dan
-- `epi_week_start(tahun, minggu)`. MariaDB tidak punya fungsi pengembali tabel maupun `CROSS JOIN LATERAL`,
-- jadi `mmwr_week` dipecah menjadi dua fungsi skalar: mmwr_tahun(d) dan mmwr_minggu(d).
--
-- PENTING: logikanya SENGAJA disalin persis dari fungsi Supabase agar angka dashboard tidak bergeser.
-- Fungsi asli itu punya KELEMAHAN yang ikut tersalin (lihat docs/MIGRASI_MARIADB.md, Tahap 4): pada tahun
-- ketika 1 Januari tahun berikutnya jatuh hari Minggu-Rabu, tanggal 29-31 Desember yang menurut aturan MMWR
-- termasuk minggu 1 tahun berikutnya dihitung sebagai "minggu 53" tahun berjalan (contoh: 29-31 Des 2024).
--
-- Perbedaan perilaku: pada PostgreSQL baris dengan tanggal NULL gugur dari view (fungsi tidak menghasilkan baris);
-- di sini fungsi mengembalikan NULL. View hasil terjemahan menambahkan `tanggal IS NOT NULL` untuk menyamakannya.
--
-- Jalankan: node --env-file=.env.local scripts/migrate/jalankan-sql.mjs schema/mariadb/04_fungsi_epid.sql
-- Butuh hak CREATE ROUTINE. Aman dijalankan berulang (DROP lalu CREATE).
-- =====================================================================
SET NAMES utf8mb4;

DROP FUNCTION IF EXISTS `mmwr_minggu`;
DROP FUNCTION IF EXISTS `mmwr_tahun`;
DROP FUNCTION IF EXISTS `epi_week_start`;

DELIMITER //

CREATE FUNCTION `epi_week_start`(p_tahun INT, p_minggu INT) RETURNS DATE
  DETERMINISTIC NO SQL
BEGIN
  DECLARE jan1 DATE;
  DECLARE jan1_dow INT;
  DECLARE minggu1_mulai DATE;

  IF p_tahun IS NULL OR p_minggu IS NULL THEN
    RETURN NULL;
  END IF;

  SET jan1 = MAKEDATE(p_tahun, 1);
  SET jan1_dow = DAYOFWEEK(jan1) - 1;            -- 0 = Minggu ... 6 = Sabtu (sama dengan EXTRACT(DOW) PostgreSQL)

  IF jan1_dow <= 3 THEN
    SET minggu1_mulai = DATE_SUB(jan1, INTERVAL jan1_dow DAY);
  ELSE
    SET minggu1_mulai = DATE_ADD(jan1, INTERVAL (7 - jan1_dow) DAY);
  END IF;

  RETURN DATE_ADD(minggu1_mulai, INTERVAL ((p_minggu - 1) * 7) DAY);
END //

CREATE FUNCTION `mmwr_tahun`(d DATE) RETURNS INT
  DETERMINISTIC NO SQL
BEGIN
  DECLARE yr INT;

  IF d IS NULL THEN
    RETURN NULL;
  END IF;

  SET yr = YEAR(d);
  IF d < epi_week_start(yr, 1) THEN
    SET yr = yr - 1;
  END IF;
  RETURN yr;
END //

CREATE FUNCTION `mmwr_minggu`(d DATE) RETURNS INT
  DETERMINISTIC NO SQL
BEGIN
  DECLARE yr INT;

  IF d IS NULL THEN
    RETURN NULL;
  END IF;

  SET yr = mmwr_tahun(d);
  RETURN (DATEDIFF(d, epi_week_start(yr, 1)) DIV 7) + 1;
END //

DELIMITER ;
