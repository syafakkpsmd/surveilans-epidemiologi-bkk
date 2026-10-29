/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `buku_kesehatan` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `wilayah_kerja` varchar(100) NOT NULL,
  `qr_code` varchar(100) DEFAULT NULL,
  `e_healthbook` varchar(100) DEFAULT NULL,
  `nama_kapal` varchar(255) NOT NULL,
  `bendera` varchar(255) DEFAULT NULL,
  `berat` decimal(12,2) DEFAULT NULL,
  `pemilik` varchar(255) DEFAULT NULL,
  `tgl_terbit` date NOT NULL,
  `nama_wajib_bayar` varchar(255) DEFAULT NULL,
  `jumlah_bayar` decimal(14,2) DEFAULT NULL,
  `sumber` varchar(10) NOT NULL DEFAULT 'input',
  `batch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bukes_wilayah_terbit` (`wilayah_kerja`,`tgl_terbit`),
  KEY `idx_bukes_terbit` (`tgl_terbit`),
  KEY `idx_bukes_qr` (`qr_code`),
  KEY `idx_bukes_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_pelabuhan_negara` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kunci` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `nama_pelabuhan` varchar(255) NOT NULL,
  `negara` varchar(100) NOT NULL,
  `dibuat_oleh` varchar(255) DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_pelabuhan_kunci` (`kunci`),
  KEY `idx_master_pelabuhan_negara` (`negara`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sertifikat_air` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `wilayah_kerja` varchar(100) NOT NULL,
  `nama_perusahaan` varchar(255) NOT NULL,
  `lokasi_pengambilan` varchar(500) DEFAULT NULL,
  `jenis_penampungan` varchar(255) DEFAULT NULL,
  `penampungan_lainnya` varchar(255) DEFAULT NULL,
  `volume_sampel` varchar(100) DEFAULT NULL,
  `tgl_pengambilan` date DEFAULT NULL,
  `tgl_analisis` date DEFAULT NULL,
  `jam_analisis` time DEFAULT NULL,
  `sample_id` varchar(255) DEFAULT NULL,
  `kesimpulan` varchar(1000) DEFAULT NULL,
  `sebagai` varchar(255) DEFAULT NULL,
  `tempat_terbit` varchar(255) DEFAULT NULL,
  `tgl_terbit` date NOT NULL,
  `berlaku_sampai` date DEFAULT NULL,
  `jumlah_bayar` decimal(14,2) DEFAULT NULL,
  `sumber` varchar(10) NOT NULL DEFAULT 'input',
  `batch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_air_wilayah_terbit` (`wilayah_kerja`,`tgl_terbit`),
  KEY `idx_air_terbit` (`tgl_terbit`),
  KEY `idx_air_sample` (`sample_id`),
  KEY `idx_air_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sertifikat_p3k` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `wilayah_kerja` varchar(100) NOT NULL,
  `nama_kapal` varchar(255) NOT NULL,
  `bendera` varchar(255) DEFAULT NULL,
  `berat` decimal(12,2) DEFAULT NULL,
  `tgl_terbit` date NOT NULL,
  `tgl_published` datetime DEFAULT NULL,
  `petugas_pemeriksa` varchar(255) DEFAULT NULL,
  `nip` varchar(50) DEFAULT NULL,
  `qr_code` varchar(100) DEFAULT NULL,
  `nama_wajib_bayar` varchar(255) DEFAULT NULL,
  `jumlah_bayar` decimal(14,2) DEFAULT NULL,
  `sumber` varchar(10) NOT NULL DEFAULT 'input',
  `batch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_p3k_wilayah_terbit` (`wilayah_kerja`,`tgl_terbit`),
  KEY `idx_p3k_terbit` (`tgl_terbit`),
  KEY `idx_p3k_qr` (`qr_code`),
  KEY `idx_p3k_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sertifikat_sscec` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `wilayah_kerja` varchar(100) NOT NULL,
  `nama_kapal` varchar(255) NOT NULL,
  `nomor_barcode` varchar(100) DEFAULT NULL,
  `berat_gt` decimal(12,2) DEFAULT NULL,
  `bendera` varchar(255) DEFAULT NULL,
  `palka` varchar(500) DEFAULT NULL,
  `berat_palka` varchar(255) DEFAULT NULL,
  `tgl_periksa` date DEFAULT NULL,
  `pencatat_pemeriksaan` varchar(255) DEFAULT NULL,
  `tgl_terbit` date NOT NULL,
  `nama_wajib_bayar` varchar(255) DEFAULT NULL,
  `tgl_bayar` date DEFAULT NULL,
  `jumlah_bayar` decimal(14,2) DEFAULT NULL,
  `sumber` varchar(10) NOT NULL DEFAULT 'input',
  `batch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sscec_wilayah_terbit` (`wilayah_kerja`,`tgl_terbit`),
  KEY `idx_sscec_terbit` (`tgl_terbit`),
  KEY `idx_sscec_barcode` (`nomor_barcode`),
  KEY `idx_sscec_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `upload_riwayat` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT uuid(),
  `modul` varchar(40) NOT NULL,
  `tahun` smallint(6) DEFAULT NULL,
  `sumber` varchar(10) NOT NULL DEFAULT 'upload',
  `nama_file` varchar(255) DEFAULT NULL,
  `jumlah_baris` int(11) NOT NULL DEFAULT 0,
  `jumlah_masuk` int(11) NOT NULL DEFAULT 0,
  `jumlah_ditolak` int(11) NOT NULL DEFAULT 0,
  `jumlah_diganti` int(11) NOT NULL DEFAULT 0,
  `dibuat_oleh` varchar(255) DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT utc_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_upload_riwayat_modul` (`modul`,`dibuat_pada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

