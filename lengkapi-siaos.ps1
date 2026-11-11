<#
 lengkapi-siaos.ps1

 Melengkapi/memperbarui pemasangan SIAOS-Sinkarkes pada berkas LOKAL Anda (versi 2).
 Berkas milik Anda hanya DITAMBAH bagian yang kurang (tidak ditimpa). Berkas milik paket ini (modul-siaos.ts,
 skrip SQL, pemeriksa, uji) diperbarui bila isinya berbeda, dengan cadangan .bak.
 Aman dijalankan berulang: bagian yang sudah ada dilaporkan [SUDAH ADA] dan dilewati.

 Cara pakai (PowerShell, DARI folder utama proyek):
   cd D:\Aplikasi\surveilans-epidemiologi-bkk
   .\lengkapi-siaos.ps1                  # pasang yang kurang + cek tipe + uji otomatis
   .\lengkapi-siaos.ps1 -DenganDatabase  # ... lalu periksa dan (bila Anda setuju) migrasi tabel siaos

 Opsi:  -LewatiUji   lewati uji otomatis
#>
param(
  [switch]$DenganDatabase,
  [switch]$LewatiUji
)

$ErrorActionPreference = 'Continue'   # git/npx menulis info ke stderr; hasil dicek lewat $LASTEXITCODE
$masalah = 0
$envDiatur = @()
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Judul($t)       { Write-Host ''; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Info($t)        { Write-Host "  $t" }
function Ok($t)          { Write-Host "  [OK]         $t" -ForegroundColor Green }
function SudahAda($t)    { Write-Host "  [SUDAH ADA]  $t" -ForegroundColor DarkGreen }
function Peringatan($t)  { Write-Host "  [CEK]        $t" -ForegroundColor Yellow }
function Gagal($t)       { Write-Host "  [GAGAL]      $t" -ForegroundColor Red; exit 1 }
function Masalah($t)     { Write-Host "  [BELUM BISA] $t" -ForegroundColor Red; $script:masalah++ }

function Baca([string]$p)        { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $p)) }
function Tulis([string]$p, [string]$t) { [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $p), $t, $utf8) }
function GayaBaris([string]$t)   { if ($t.Contains("`r`n")) { return "`r`n" } else { return "`n" } }

function Tampilkan-Konteks([string]$p, [string]$kata) {
  Info "Baris di $p yang memuat '$kata' (kirim ini bila perlu bantuan):"
  Select-String -LiteralPath $p -Pattern $kata -SimpleMatch | Select-Object -First 6 | ForEach-Object { Write-Host ("      {0}: {1}" -f $_.LineNumber, $_.Line.Trim()) -ForegroundColor Yellow }
}

function Muat-EnvLokal([string]$jalur) {
  $h = @{}
  foreach ($baris in (Get-Content -LiteralPath $jalur)) {
    $b = $baris.Trim()
    if (-not $b -or $b.StartsWith('#')) { continue }
    $i = $b.IndexOf('=')
    if ($i -lt 1) { continue }
    $k = $b.Substring(0, $i).Trim()
    $v = $b.Substring($i + 1).Trim()
    $berkutip = $v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))
    if ($berkutip) { $v = $v.Substring(1, $v.Length - 2) } else { $v = ($v -replace '\s+#.*$', '') }
    $h[$k] = $v
  }
  return $h
}
function Atur-Env([string]$nama, $nilai) {
  if ($nilai) { Set-Item -Path ("Env:" + $nama) -Value $nilai; $script:envDiatur += $nama }
}

function Pasang-Berkas([string]$nama, [string]$isi) {
  $isi = $isi.Replace("`r`n", "`n")
  if (Test-Path -LiteralPath $nama) {
    $ada = (Baca $nama).Replace("`r`n", "`n")
    if ($ada.TrimEnd() -ceq $isi.TrimEnd()) { SudahAda "$nama (isi sama)"; return }
    Copy-Item -LiteralPath $nama -Destination ($nama + '.bak') -Force
    Tulis $nama $isi
    Ok "diperbarui: $nama  (cadangan lama: $nama.bak)"
  } else {
    Tulis $nama $isi
    Ok "dibuat: $nama"
  }
}

Judul '0. Memeriksa lokasi'
if (-not (Test-Path 'package.json') -or -not (Test-Path 'lib\input-data\modul.ts')) {
  Gagal 'Jalankan dari folder utama proyek (yang berisi package.json dan lib\input-data).'
}
foreach ($alat in @('node', 'npx')) {
  if (-not (Get-Command $alat -ErrorAction SilentlyContinue)) { Gagal "$alat tidak ditemukan di PATH." }
}
Ok ('Folder proyek: ' + (Get-Location).Path)

# ------------------------------------------------------------------------------------------------
Judul '1. lib\input-data\modul.ts  (kolomBantu)'
$p = 'lib\input-data\modul.ts'
$t = Baca $p
if ($t.Contains('kolomBantu?:')) {
  SudahAda 'kolomBantu'
} else {
  $nl = GayaBaris $t
  $i = $t.IndexOf('kolomHasilSiapkan?:')
  if ($i -lt 0) {
    Masalah 'baris kolomHasilSiapkan?: tidak ditemukan di modul.ts'
    Tampilkan-Konteks $p 'siapkanBaris'
  } else {
    $akhir = $t.IndexOf("`n", $i)
    $sisip = '  /** Kolom berkas yang hanya DIBACA untuk siapkanBaris (tidak disimpan, tidak ada di form/template): kunci -> judul yang dikenali. */' + $nl + '  kolomBantu?: Record<string, string[]>;' + $nl
    $t = $t.Insert($akhir + 1, $sisip)
    Tulis $p $t
    Ok 'kolomBantu ditambahkan'
  }
}

# ------------------------------------------------------------------------------------------------
Judul '2. lib\input-data\validasi.ts  (memanggil siapkanBaris)'
$p = 'lib\input-data\validasi.ts'
$t = Baca $p
if ($t.Contains('modul.siapkanBaris(')) {
  SudahAda 'kaitan siapkanBaris'
} else {
  $nl = GayaBaris $t
  $lama = 'export function validasiBaris(modul: ModulInput, mentah: Record<string, unknown>, kamus: KamusWilker, tahun?: number): HasilBaris {'
  if (-not $t.Contains($lama)) {
    Masalah 'baris deklarasi validasiBaris tidak sama dengan yang diperkirakan'
    Tampilkan-Konteks $p 'function validasiBaris'
  } else {
    $baru = 'export function validasiBaris(modul: ModulInput, mentahAsal: Record<string, unknown>, kamus: KamusWilker, tahun?: number): HasilBaris {' + $nl + '  const mentah = modul.siapkanBaris ? modul.siapkanBaris(mentahAsal) : mentahAsal;'
    $t = $t.Replace($lama, $baru)
    Tulis $p $t
    Ok 'kaitan siapkanBaris dipasang'
  }
}

# ------------------------------------------------------------------------------------------------
Judul '3. lib\input-data\parse-excel.ts  (kolom hasil siapkan + kolom bantu)'
$p = 'lib\input-data\parse-excel.ts'
$t = Baca $p
$nl = GayaBaris $t
$ubah = $false

if ($t.Contains('modul.kolomHasilSiapkan')) {
  SudahAda 'kolom hasil siapkan ikut dianggap ada'
} else {
  $lama = '  const ada = new Set(kolomKe.values());'
  if ($t.IndexOf($lama) -lt 0 -or $t.IndexOf($lama) -ne $t.LastIndexOf($lama)) {
    Masalah 'baris "const ada = new Set(kolomKe.values());" tidak ditemukan tepat satu kali'
    Tampilkan-Konteks $p 'new Set(kolomKe'
  } else {
    $baru = $lama + $nl + '  for (const [sumber, hasil] of Object.entries(modul.kolomHasilSiapkan ?? {})) if (ada.has(sumber)) hasil.forEach((h) => ada.add(h));'
    $t = $t.Replace($lama, $baru)
    $ubah = $true
    Ok 'kolom hasil siapkan dipasang'
  }
}

if ($t.Contains('modul.kolomBantu')) {
  SudahAda 'kolom bantu dikenali pada pemetaan judul'
} else {
  $jangkar = $t.IndexOf('peta.set(kj, k.nama);')
  $kembali = -1
  if ($jangkar -ge 0) { $kembali = $t.IndexOf('return peta;', $jangkar) }
  if ($jangkar -lt 0 -or $kembali -lt 0) {
    Masalah 'bagian pemetaan judul (peta.set(kj, k.nama) ... return peta;) tidak ditemukan'
    Tampilkan-Konteks $p 'peta.set('
  } else {
    $awalBaris = $t.LastIndexOf("`n", $kembali) + 1
    $sisip = '  for (const [nama, judul] of Object.entries(modul.kolomBantu ?? {})) {' + $nl + '    for (const j of judul) { const kj = kunciJudul(j); if (!peta.has(kj)) peta.set(kj, nama); }' + $nl + '  }' + $nl
    $t = $t.Insert($awalBaris, $sisip)
    $ubah = $true
    Ok 'kolom bantu dipasang'
  }
}
if ($ubah) { Tulis $p $t }
if (-not $t.Contains('const jumlahKolom = ws.columnCount')) {
  Peringatan 'perbaikan pembacaan lembar 65.537 baris (jumlahKolom) BELUM ada di parse-excel.ts; unggah file Sinkarkes .xlsx bisa macet. Kirim berkas ini.'
  $script:masalah++
}

# ------------------------------------------------------------------------------------------------
Judul '4. lib\input-data\simpan.ts  (daftar tahun tahan kolom tanggal teks)'
$p = 'lib\input-data\simpan.ts'
$t = Baca $p
if ($t.Contains('::date)::int')) {
  SudahAda 'cast ::date pada daftarTahun'
} else {
  $lama = 'EXTRACT(YEAR FROM ${q(modul.kolomTanggal)})::int'
  if (-not $t.Contains($lama)) {
    Masalah 'kueri daftarTahun tidak sama dengan yang diperkirakan'
    Tampilkan-Konteks $p 'EXTRACT(YEAR'
  } else {
    $t = $t.Replace($lama, 'EXTRACT(YEAR FROM ${q(modul.kolomTanggal)}::date)::int')
    Tulis $p $t
    Ok 'cast ::date dipasang'
  }
}
if (-not $t.Contains('kolTambahan')) {
  Peringatan 'perbaikan unggah-ulang (kolom pembeda tambahan di petaAda) BELUM ada di simpan.ts; unggah ulang bisa menggandakan data. Kirim berkas ini.'
  $script:masalah++
}

# ------------------------------------------------------------------------------------------------
Judul '4b. lib\input-data\validasi.ts  (nomor surat berspasi dianggap sama)'
$p = 'lib\input-data\validasi.ts'
$t = Baca $p
if ($t.Contains('?.tanpaSpasi ? s.replace')) {
  SudahAda 'kunciBaris tahan spasi pada kolom tanpaSpasi'
} else {
  $nl = GayaBaris $t
  $lama = @'
  const tambahan = (modul.kolomKunciTambahan ?? []).map((c) => String(n[c] ?? '').toLowerCase().replace(/\s+/g, ' ').trim());
'@
  if (-not $t.Contains($lama)) {
    Masalah 'baris "const tambahan = ..." pada kunciBaris tidak sama dengan yang diperkirakan'
    Tampilkan-Konteks $p 'kolomKunciTambahan'
  } else {
    $baru = @(
      '  const tambahan = (modul.kolomKunciTambahan ?? []).map((c) => {',
      "    const s = String(n[c] ?? '').toLowerCase();",
      '    // kolom tanpaSpasi (mis. no. surat Sinkarkes): "SR/5544/ 2026" dan "SR/5544/2026" adalah nomor yang sama, termasuk pada baris lama di database',
      "    return modul.kolom.find((x) => x.nama === c)?.tanpaSpasi ? s.replace(/\s+/g, '') : s.replace(/\s+/g, ' ').trim();",
      '  });'
    ) -join $nl
    $t = $t.Replace($lama, $baru)
    Tulis $p $t
    Ok 'kunciBaris dipasang'
  }
}

# ------------------------------------------------------------------------------------------------
Judul '5. Berkas milik paket ini (modul SIAOS, skrip SQL, pemeriksa, uji)'
$berkasBaru = [ordered]@{}
$berkasBaru['lib\input-data\modul-siaos.ts'] = @'
// lib/input-data/modul-siaos.ts
// Modul input SIAOS (Izin Angkut Orang Sakit): form satu per satu + unggah Excel.
// Berkas ekspor Sinkarkes ("Rekap Izin Lalu Lintas Orang Sakit") dibaca APA ADANYA: judul laporan dan baris ringkasan
// di atas tabel dilewati, judul kolom dicari otomatis (spasi berlebih/huruf kecil tidak masalah), umur "55 tahun"
// dipecah jadi usia 55 + satuan Tahun, dan tanggal model apa pun dibaca lewat parseTanggal (pakaiParseTanggal).
// MURNI (tanpa database / exceljs), aman dipakai komponen 'use client'. Didaftarkan lewat MODUL_KLINIK (modul-klinik.ts).
//
// Tabel `siaos` sudah dipakai dasbor SIAOS. Makna kolom mengikuti dasbor itu:
//   maskapai terisi = Pesawat, pelayaran terisi = Kapal; pelabuhan = "Pelabuhan Tujuan"; perlu_kursi_dorong = Tidak/Pintu/Tempat Duduk.
// Kolom ekspor Sinkarkes yang TIDAK punya kolom di tabel (Telepon, Alamat, Jenis Penyakit, No Penerbangan, Tanggal Diagnosis,
// pendamping, keluarga, penerbit, dst.) diabaikan; judulnya dicantumkan di pratinjau unggahan.
import type { JenisWilker } from '@/lib/wilayah-kerja';
import type { KolomModul, ModulInput } from './modul';

const JENIS_LENGKAP: JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
/** Judul kolom wilayah pada ekspor Sinkarkes. "Pelabuhan" sengaja TIDAK dipakai di sini: pada SIAOS itu pelabuhan tujuan. */
const ALIAS_WILKER = ['Wilayah Kerja', 'Wilker', 'Nama KKP', 'Nama Balai Karkes', 'KKP Induk/Wilker', 'KKP Induk'];

const T = (nama: string, label: string, alias?: string[], extra: Partial<KolomModul> = {}): KolomModul => ({ nama, label, tipe: 'teks', alias, ...extra });

const SATUAN: Record<string, string> = { tahun: 'Tahun', thn: 'Tahun', th: 'Tahun', bulan: 'Bulan', bln: 'Bulan', bl: 'Bulan', hari: 'Hari', hr: 'Hari' };

/** "55 tahun" -> { usia: 55, satuan: 'Tahun' }; "1 hari" -> Hari; "2 tahun 3 bulan" -> bagian pertama yang bukan nol.
 *  Angka polos ("55") dan bentuk yang tidak dikenal -> null (dibiarkan untuk validasi biasa). */
export function pecahUsia(v: unknown): { usia: number; satuan: string } | null {
  if (typeof v !== 'string') return null;
  const bagian = [...v.toLowerCase().matchAll(/(\d+)\s*(tahun|thn|th|bulan|bln|bl|hari|hr)\b/g)];
  if (!bagian.length) return null;
  const pilih = bagian.find((b) => Number(b[1]) > 0) ?? bagian[0];
  return { usia: Number(pilih[1]), satuan: SATUAN[pilih[2]] };
}

const kosongTeks = (v: unknown) => v == null || String(v).trim() === '';

/** Rencana Perjalanan (Pelayaran/Maskapai) di ekspor Sinkarkes adalah petunjuk moda yang benar, sedangkan nama alat angkut kadang
 *  terisi di kolom yang salah (mis. nama kapal di kolom maskapai). Dasbor menghitung "maskapai terisi" sebagai Pesawat, jadi
 *  nama dipindah ke kolom yang sesuai moda. Tidak ada nama yang dikarang: bila nama kosong, tetap kosong. */
export function siapkanBarisSiaos(mentah: Record<string, unknown>): Record<string, unknown> {
  let hasil = mentah;
  const p = pecahUsia(mentah.usia);
  if (p) {
    hasil = { ...hasil, usia: p.usia, satuan_usia: kosongTeks(mentah.satuan_usia) ? p.satuan : mentah.satuan_usia };
  }
  const moda = String(mentah.rencana_perjalanan ?? '').trim().toLowerCase();
  if (moda === 'pelayaran' && kosongTeks(hasil.pelayaran) && !kosongTeks(hasil.maskapai)) {
    hasil = { ...hasil, pelayaran: hasil.maskapai, maskapai: null };
  } else if (moda === 'maskapai' && kosongTeks(hasil.maskapai) && !kosongTeks(hasil.pelayaran)) {
    hasil = { ...hasil, maskapai: hasil.pelayaran, pelayaran: null };
  }
  return hasil;
}

const siaos: ModulInput = {
  kunci: 'siaos',
  label: 'SIAOS (Izin Angkut Orang Sakit)',
  tabel: 'siaos',
  kolomTanggal: 'tanggal',
  kolomWilayah: 'wilayah_kerja',
  kolomKunci: 'nama',
  // satu surat bisa memuat beberapa pasien, dan satu pasien bisa punya beberapa surat: nomor surat ikut menjadi kunci
  kolomKunciTambahan: ['no_surat'],
  namaKunci: 'nama pasien',
  pakaiParseTanggal: true,
  wilayahDenganSpasi: true,
  kunciWilker: 'siaos', // wilayah yang boleh = yang dicentang admin untuk SIAOS (sama dengan dasbor)
  jenisWilayahBoleh: JENIS_LENGKAP,
  peranBoleh: ['admin', 'petugas'],
  siapkanBaris: siapkanBarisSiaos,
  kolomHasilSiapkan: { usia: ['satuan_usia'], rencana_perjalanan: ['maskapai', 'pelayaran'] },
  // dibaca hanya untuk siapkanBaris; tidak disimpan (tabel siaos tidak punya kolomnya)
  kolomBantu: { rencana_perjalanan: ['Rencana Perjalanan'] },
  kolomDaftar: ['tanggal', 'wilayah_kerja', 'nama', 'no_surat', 'usia', 'satuan_usia', 'diagnosa', 'maskapai', 'pelayaran', 'pelabuhan'],
  kolom: [
    { nama: 'tanggal', label: 'Tanggal', tipe: 'tanggal', wajib: true, alias: ['Tgl', 'Tanggal Surat', 'Tanggal Izin', 'Diterbitkan Tanggal'], kelompok: 'Izin' },
    { nama: 'wilayah_kerja', label: 'Wilayah Kerja', tipe: 'wilker', wajib: true, alias: ALIAS_WILKER },
    // Sinkarkes menulis nomor surat dengan spasi tak beraturan ("/ 2026", "9 /9"); spasi dibuang agar nomor yang sama selalu sama
    T('no_surat', 'No. Surat', ['No Surat', 'Nomor Surat'], { maks: 255, tanpaSpasi: true }),
    T('nama', 'Nama', ['Nama Pasien', 'Nama Lengkap'], { wajib: true, kelompok: 'Pasien' }),
    { nama: 'usia', label: 'Usia', tipe: 'bilangan', alias: ['Umur'], batasNilai: [0, 120] },
    T('satuan_usia', 'Satuan Usia', ['Satuan Umur'], { maks: 20 }),
    T('jenis_kelamin', 'Jenis Kelamin', ['Sex', 'JK', 'L/P'], { maks: 20 }),
    T('diagnosa', 'Diagnosa', ['Diagnosis'], { maks: 255 }),
    T('kondisi_lanjut_perjalanan', 'Kondisi Lanjut Perjalanan', ['Kondisi Pasien', 'Kondisi Pasien Dapat Melanjutkan Perjalanan'], { maks: 100 }),
    T('maskapai', 'Maskapai', undefined, { kelompok: 'Perjalanan' }),
    T('pelayaran', 'Pelayaran', ['Kapal', 'Nama Kapal']),
    T('pelabuhan', 'Pelabuhan Tujuan', ['Pelabuhan', 'KKP Tempat Tujuan', 'KKP Tujuan', 'Tempat Tujuan']),
    T('butuh_bantuan_medis', 'Butuh Bantuan Medis', ['Membutuhkan bantuan pendamping dibidang medis', 'Membutuhkan bantuan pendamping di bidang medis', 'Butuh Pendamping Medis'], { maks: 100, kelompok: 'Kebutuhan pasien' }),
    T('ambulance', 'Ambulance', ['Membutuhkan bantuan ambulan', 'Membutuhkan bantuan ambulans', 'Ambulan', 'Ambulans'], { maks: 100 }),
    T('perlu_kursi_dorong', 'Perlu Kursi Dorong', ['Memerlukan roda/kereta dorong/Tandu', 'Perlu Kursi Roda', 'Kursi Roda'], { maks: 100 }),
    T('perlu_bantuan_makanan_medikasi', 'Perlu Bantuan Makanan/Medikasi', ['Memerlukan bantuan makanan,medikasi', 'Memerlukan bantuan makanan, medikasi', 'Bantuan Makanan/Medikasi'], { maks: 100 }),
  ],
};

export const MODUL_SIAOS: Record<string, ModulInput> = { siaos };
'@
$berkasBaru['scripts\migrate\30_siaos_input.sql'] = @'
-- scripts/migrate/30_siaos_input.sql
-- Menyiapkan tabel siaos untuk input langsung dan unggah Excel (modul input-data, lib/input-data/modul-siaos.ts).
-- Hanya MENAMBAH kolom/indeks/nilai bawaan dan tidak mengubah atau menghapus data. Aman dijalankan berulang.
--   node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/30_siaos_input.sql
--
--   sumber   : asal baris. 'migrasi' = data lama (sinkron Google Sheets), 'input' = form, 'upload' = unggah Excel
--   batch_id : penanda satu unggahan; dipakai untuk membatalkan unggahan itu dari menu Riwayat
--   id       : hasil migrasi tidak punya nilai bawaan, sedangkan modul input tidak mengisi id sendiri
ALTER TABLE siaos ADD COLUMN IF NOT EXISTS sumber   varchar(20) NOT NULL DEFAULT 'migrasi';
ALTER TABLE siaos ADD COLUMN IF NOT EXISTS batch_id varchar(64);

CREATE INDEX IF NOT EXISTS idx_siaos_batch   ON siaos (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_siaos_tanggal ON siaos (tanggal);

-- id terisi otomatis, dimulai SETELAH id terbesar yang ada (tidak menyentuh id lama). Dilewati bila sudah ada nilai bawaan/identity.
DO $$
DECLARE
  bawaan   text;
  identitas text;
  mulai    bigint;
BEGIN
  SELECT column_default, is_identity INTO bawaan, identitas
    FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'siaos' AND column_name = 'id';
  IF bawaan IS NULL AND identitas = 'NO' THEN
    SELECT COALESCE(MAX(id), 0) + 1 INTO mulai FROM siaos;
    CREATE SEQUENCE IF NOT EXISTS siaos_id_seq;
    PERFORM setval('siaos_id_seq', mulai, false);
    ALTER SEQUENCE siaos_id_seq OWNED BY siaos.id;
    ALTER TABLE siaos ALTER COLUMN id SET DEFAULT nextval('siaos_id_seq');
  END IF;
END $$;
'@
$berkasBaru['scripts\migrate\31_siaos_surat_banyak_pasien.sql'] = @'
-- scripts/migrate/31_siaos_surat_banyak_pasien.sql
-- DIANJURKAN, tetapi baru dijalankan atas persetujuan Anda (mengubah satu indeks unik).
--   node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/31_siaos_surat_banyak_pasien.sql
--
-- Satu surat izin bisa memuat lebih dari satu pasien: pada ekspor Sinkarkes ada nomor surat yang sama dipakai dua pasien berbeda.
-- Indeks unik lama (wilayah_kerja, no_surat) menolak pasien kedua, sehingga SELURUH unggahan yang memuatnya batal.
-- Diganti indeks yang sama dengan kunci pencocokan modul input: (wilayah_kerja, no_surat, nama, tanggal).
-- Baris kembar tetap ditolak; beberapa pasien pada satu surat diizinkan. Data lama memenuhi indeks baru (lebih longgar dari yang lama).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'siaos'::regclass AND conname = 'siaos_uq_siaos_wilayah_surat') THEN
    ALTER TABLE siaos DROP CONSTRAINT siaos_uq_siaos_wilayah_surat;
  ELSE
    DROP INDEX IF EXISTS siaos_uq_siaos_wilayah_surat;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS siaos_uq_wilayah_surat_nama_tanggal ON siaos (wilayah_kerja, no_surat, nama, tanggal);
'@
$berkasBaru['scripts\migrate\cek-skema-siaos.ts'] = @'
// scripts/migrate/cek-skema-siaos.ts
// Membandingkan modul input SIAOS (lib/input-data/modul-siaos.ts) dengan tabel `siaos` di database YANG SEDANG DIPAKAI.
// HANYA MEMBACA. Tidak mencetak nama pasien, diagnosa, atau isi bebas lain: hanya struktur kolom, jumlah baris,
// dan sebaran nilai kategori (Ya/Tidak, satuan usia, dst.).
//   npx tsx --env-file=.env.local scripts/migrate/cek-skema-siaos.ts
// Keluar dengan kode 1 bila ada yang GAGAL (kolom hilang / tipe tidak cocok / panjang kolom kurang).
import { getDbClient } from '@/lib/db/client';
import { dapatkanModul } from '@/lib/input-data/modul';

type Baris = Record<string, unknown>;
const db = getDbClient();
const q = async (sql: string, args: (string | number)[] = []): Promise<Baris[]> => (await db.execute({ sql, args })).rows as Baris[];

let gagal = 0;
let cek = 0;
const ok = (t: string) => console.log(`  [OK]     ${t}`);
const peringatan = (t: string) => { cek++; console.log(`  [CEK]    ${t}`); };
const tidak = (t: string) => { gagal++; console.log(`  [GAGAL]  ${t}`); };

async function main() {
  const modul = dapatkanModul('siaos');
  if (!modul) throw new Error('Modul siaos belum terdaftar. Terapkan patch dulu.');

  console.log('\n== 1. Kolom tabel siaos ==');
  const kol = await q(
    `SELECT column_name, data_type, character_maximum_length AS panjang, is_nullable, column_default, is_identity
       FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'siaos' ORDER BY ordinal_position`);
  if (!kol.length) { tidak('tabel siaos tidak ditemukan di skema aktif'); return; }
  const peta = new Map(kol.map((k) => [String(k.column_name), k]));
  for (const k of kol) console.log(`  ${String(k.column_name).padEnd(34)} ${String(k.data_type).padEnd(18)} ${k.panjang ?? ''}`.trimEnd());

  console.log('\n== 2. Kecocokan dengan modul input ==');
  for (const k of modul.kolom) {
    const d = peta.get(k.nama);
    if (!d) { tidak(`${k.nama}: kolom tidak ada di tabel`); continue; }
    const tipe = String(d.data_type), panjang = d.panjang == null ? null : Number(d.panjang);
    if (k.tipe === 'bilangan') {
      /integer|smallint|bigint|numeric/.test(tipe) ? ok(`${k.nama}: ${tipe}`) : tidak(`${k.nama}: modul bilangan, tabel ${tipe}`);
    } else if (k.tipe === 'tanggal') {
      if (tipe === 'date') ok(`${k.nama}: date`);
      else if (/char|text/.test(tipe)) peringatan(`${k.nama}: bertipe ${tipe} (teks). Dipakai apa adanya sebagai 'YYYY-MM-DD'; pertimbangkan diubah ke date.`);
      else tidak(`${k.nama}: modul tanggal, tabel ${tipe}`);
    } else if (/char|text/.test(tipe)) {
      const butuh = k.tipe === 'wilker' ? 100 : (k.maks ?? 255);
      if (panjang !== null && panjang < butuh) tidak(`${k.nama}: kolom varchar(${panjang}) lebih pendek dari batas modul ${butuh}. Perkecil "maks" di modul-siaos.ts atau perlebar kolom`);
      else ok(`${k.nama}: ${tipe}${panjang ? `(${panjang})` : ''}`);
    } else tidak(`${k.nama}: tipe modul ${k.tipe} vs tabel ${tipe}`);
  }
  const id = peta.get('id');
  id?.column_default || id?.is_identity === 'YES' ? ok('id: terisi otomatis') : tidak('id: tidak punya nilai bawaan (serial/identity); insert dari modul akan gagal. Jalankan scripts/migrate/30_siaos_input.sql');
  for (const c of ['sumber', 'batch_id']) {
    peta.has(c) ? ok(`${c}: ada`) : tidak(`${c}: belum ada. Jalankan scripts/migrate/30_siaos_input.sql`);
  }

  console.log('\n== 3. Isi tabel (hanya jumlah dan sebaran kategori) ==');
  const ringkas = (await q(`SELECT COUNT(*) AS n, MIN(tanggal)::text AS awal, MAX(tanggal)::text AS akhir FROM siaos`))[0];
  console.log(`  baris: ${ringkas.n}   tanggal: ${ringkas.awal ?? '-'} s.d. ${ringkas.akhir ?? '-'}`);
  const tg = peta.get('tanggal');
  if (tg && /char|text/.test(String(tg.data_type))) {
    const buruk = Number((await q(`SELECT COUNT(*) AS n FROM siaos WHERE tanggal IS NOT NULL AND tanggal !~ '^\\d{4}-\\d{2}-\\d{2}$'`))[0].n);
    buruk ? tidak(`${buruk} baris bertanggal bukan YYYY-MM-DD (daftar tahun di halaman input akan galat)`) : ok('semua tanggal berformat YYYY-MM-DD');
  }
  for (const c of ['satuan_usia', 'jenis_kelamin', 'kondisi_lanjut_perjalanan', 'perlu_kursi_dorong', 'butuh_bantuan_medis', 'ambulance', 'perlu_bantuan_makanan_medikasi', 'wilayah_kerja']) {
    if (!peta.has(c)) continue;
    const r = await q(`SELECT COALESCE(NULLIF(TRIM(${c}::text), ''), '(kosong)') AS v, COUNT(*) AS n FROM siaos GROUP BY 1 ORDER BY n DESC LIMIT 9`);
    console.log(`  ${c}: ${r.map((x) => `${x.v}=${x.n}`).join('  |  ')}`);
  }

  if (peta.has('no_surat')) {
    const bentuk = await q(`SELECT regexp_replace(regexp_replace(no_surat, '[0-9]+', '9', 'g'), '[A-Za-z]+', 'A', 'g') AS b, COUNT(*) AS n, COUNT(*) FILTER (WHERE no_surat ~ '\\s') AS berspasi FROM siaos WHERE no_surat IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 6`);
    console.log(`  bentuk no_surat (angka=9, huruf=A): ${bentuk.map((x) => `${x.b} x${x.n}${Number(x.berspasi) ? ` (${x.berspasi} berspasi)` : ''}`).join('  |  ')}`);
  }
  if (peta.has('kode_wilker')) {
    const kw = Number((await q(`SELECT COUNT(*) AS n FROM siaos WHERE kode_wilker IS NULL`))[0].n);
    console.log(`  baris tanpa kode_wilker: ${kw}`);
  }

  console.log('\n== 4. Indeks unik pada siaos (bisa menolak baris unggahan) ==');
  const idx = await q(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'siaos' ORDER BY indexname`);
  for (const i of idx) console.log(`  ${/UNIQUE/i.test(String(i.indexdef)) ? '[UNIK] ' : '       '}${String(i.indexdef).replace(/^CREATE (UNIQUE )?INDEX /i, '')}`);
  for (const i of idx) {
    if (/UNIQUE/i.test(String(i.indexdef)) && /\(wilayah_kerja, no_surat\)/.test(String(i.indexdef)))
      peringatan(`${i.indexname}: satu surat hanya boleh satu pasien. Ekspor Sinkarkes bisa memuat beberapa pasien pada satu surat, dan itu membatalkan SELURUH unggahan. Jalankan scripts/migrate/31_siaos_surat_banyak_pasien.sql`);
  }
  const trg = await q(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'siaos'::regclass AND NOT tgisinternal ORDER BY tgname`);
  console.log(`  trigger pada siaos: ${trg.length ? trg.map((x) => x.tgname).join(', ') : '(tidak ada)'}`);

  console.log('\n== 5. Tabel riwayat unggahan ==');
  const rw = await q(`SELECT 1 AS x FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'upload_riwayat'`);
  rw.length ? ok('upload_riwayat ada') : tidak('upload_riwayat tidak ada (dipakai semua modul unggah Excel)');
}

main()
  .then(() => { console.log(gagal ? `\nHASIL: ${gagal} hal perlu diperbaiki.` : cek ? `\nHASIL: tidak ada yang GAGAL, tetapi ${cek} butir [CEK] perlu keputusan Anda.` : '\nHASIL: semua cocok.'); process.exit(gagal ? 1 : 0); })
  .catch((e) => { console.error('\nGALAT:', e instanceof Error ? e.message : e); process.exit(2); });
'@
$berkasBaru['scripts\migrate\uji-siaos-sinkarkes.ts'] = @'
// scripts/migrate/uji-siaos-sinkarkes.ts
// Uji modul input SIAOS. Murni: tanpa database. Memakai berkas yang DIBUAT DI MEMORI meniru ekspor Sinkarkes
// "Rekap Izin Lalu Lintas Orang Sakit" (judul laporan + baris ringkasan di atas tabel, judul kolom berspasi ganda,
// umur "55 tahun", tanggal bermacam model, lembar berformat 65.537 baris). Nama pasien di sini rekaan.
//
//   npx tsx --test scripts/migrate/uji-siaos-sinkarkes.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { MODUL, kunciJudul, dapatkanModul } from '@/lib/input-data/modul';
import { bacaExcel, buatTemplate } from '@/lib/input-data/parse-excel';
import { kunciBaris, validasiBaris } from '@/lib/input-data/validasi';
import { pecahUsia, siapkanBarisSiaos } from '@/lib/input-data/modul-siaos';
import { KAMUS_UJI } from './fixtures-wilker';

const modul = dapatkanModul('siaos')!;

// Judul kolom persis seperti ekspor Sinkarkes (termasuk spasi berlebih dan huruf kecil)
const JUDUL = [
  'No', 'Nama KKP ', 'No Surat', 'KKP  Tempat Tujuan', 'Nama', 'Umur', 'Telepon', 'Alamat', 'Rencana Perjalanan', 'maskapai',
  'no penerbangan', 'pelayaran', 'Tanggal', 'Diagnosis', 'Jenis Penyakit', 'Kondisi Pasien ', 'Tanggal Diagnosis',
  'Membutuhkan bantuan pendamping dibidang medis', 'nama pendamping', 'Kualifikasi Pendamping', 'Nama Keluarga Tujuan', 'No. Telp',
  'Diterbitkan Di', 'Diterbitkan Tanggal', 'Nama Penerbit', 'Memerlukan roda/kereta dorong/Tandu',
  'Memerlukan bantuan makanan,medikasi', 'Membutuhkan bantuan ambulan',
];
const serial = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);

/** Satu baris data Sinkarkes; yang diisi hanya kolom yang diuji, sisanya meniru isi umum. */
function baris(nomor: number, o: { kkp?: string; surat?: string; tujuan?: string; nama: string; umur?: string; rencana?: string; maskapai?: string | null; pelayaran?: string | null; tanggal: unknown; kursi?: string }) {
  const r = new Array<unknown>(JUDUL.length).fill(null);
  const set = (judul: string, v: unknown) => { r[JUDUL.indexOf(judul)] = v; };
  set('No', nomor); set('Nama KKP ', o.kkp ?? 'Samarinda'); set('No Surat', o.surat ?? `SR.02.05/C.X.10.10/${5500 + nomor}/ 2026`);
  set('KKP  Tempat Tujuan', o.tujuan ?? 'Wilker Pelabuhan Parepare'); set('Nama', o.nama); set('Umur', o.umur ?? '55 tahun');
  set('Telepon', '08123456789'); set('Alamat', 'JL. CONTOH'); set('Rencana Perjalanan', o.rencana ?? 'Pelayaran');
  set('maskapai', o.maskapai ?? null); set('pelayaran', 'pelayaran' in o ? (o.pelayaran ?? null) : 'KM. CONTOH'); set('Tanggal', o.tanggal); // pelayaran: null eksplisit = kosong
  set('Diagnosis', 'Essential (primary) hypertension'); set('Jenis Penyakit', 'Penyakit Tidak Menular'); set('Kondisi Pasien ', 'Ya');
  set('Tanggal Diagnosis', '2026-10-01'); set('Membutuhkan bantuan pendamping dibidang medis', 'Tidak');
  set('Diterbitkan Tanggal', '2026-10-01'); set('Memerlukan roda/kereta dorong/Tandu', o.kursi ?? 'Tidak');
  set('Memerlukan bantuan makanan,medikasi', 'Ya'); set('Membutuhkan bantuan ambulan', 'Tidak');
  return r;
}

async function berkasSinkarkes(data: unknown[][], opsi: { barisBerformat?: number } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Detail');
  ws.addRow(['Rekap Izin Lalu Lintas Orang Sakit Di Balai Karkes']); ws.mergeCells('A1:AB1');
  ws.addRow(['Balai Karkes : Samarinda']); ws.mergeCells('A2:AB2');
  ws.addRow(['Balai Karkes Tempat : Semua']); ws.mergeCells('A3:AB3');
  ws.addRow(['Periode : 01-10-2026 - 10-11-2026']); ws.mergeCells('A4:AB4');
  ws.addRow([null, 'Total Data', 1942, null, 'Total Data', 60000]);
  ws.addRow([null, 'Jumlah Rencana Perjalanan Menggunakan Maskapai', 225, null, 'Jumlah Penyakit Menular', 39]);
  for (let i = 0; i < 4; i++) ws.addRow([null, `Ringkasan ${i}`, i]);
  ws.addRow([]);
  ws.addRow(JUDUL);
  for (const b of data) ws.addRow(b);
  if (opsi.barisBerformat) ws.getRow(opsi.barisBerformat).getCell(1).font = { bold: true }; // baris kosong berformat di ujung lembar
  const ringkasan = wb.addWorksheet('Ringkasan');
  ringkasan.addRow(['Ringkasan Izin Lalu Lintas Orang Sakit']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('struktur modul SIAOS: kolom unik, kunci wajib, judul Excel tidak bentrok', () => {
  assert.ok(MODUL.siaos, 'siaos terdaftar di MODUL');
  const nama = new Set<string>();
  for (const k of modul.kolom) { assert.ok(!nama.has(k.nama), `kolom ganda ${k.nama}`); nama.add(k.nama); }
  for (const c of [modul.kolomTanggal, modul.kolomWilayah, modul.kolomKunci, ...(modul.kolomKunciTambahan ?? [])]) assert.ok(nama.has(c), `kolom kunci ${c} tidak ada`);
  for (const c of modul.kolomDaftar) assert.ok(nama.has(c), `kolomDaftar ${c} tidak ada`);
  assert.equal(modul.kolom.find((k) => k.nama === modul.kolomTanggal)?.tipe, 'tanggal');
  assert.ok(modul.kolom.find((k) => k.nama === modul.kolomKunci)?.wajib);
  for (const [sumber, hasil] of Object.entries(modul.kolomHasilSiapkan ?? {})) {
    assert.ok(nama.has(sumber) || modul.kolomBantu?.[sumber], `kolomHasilSiapkan: sumber ${sumber} tidak dikenal`);
    for (const h of hasil) assert.ok(nama.has(h), `kolomHasilSiapkan: ${h} bukan kolom tabel`);
  }
  const peta = new Map<string, string>();
  const daftar: [string, string][] = [
    ...modul.kolom.flatMap((k) => [k.label, k.nama, ...(k.alias ?? [])].map((j) => [j, k.nama] as [string, string])),
    ...Object.entries(modul.kolomBantu ?? {}).flatMap(([n, js]) => js.map((j) => [j, n] as [string, string])),
  ];
  for (const [j, n] of daftar) {
    const kj = kunciJudul(j);
    assert.ok(!peta.has(kj) || peta.get(kj) === n, `judul "${j}" dipakai ${peta.get(kj)} dan ${n}`);
    peta.set(kj, n);
  }
  assert.ok(!peta.has('no'), 'judul "No" dipakai sebagai nomor baris dan diabaikan pembaca');
});

test('pecahUsia: tahun, bulan, hari, singkatan, gabungan, dan bentuk yang tidak dikenal', () => {
  assert.deepEqual(pecahUsia('55 tahun'), { usia: 55, satuan: 'Tahun' });
  assert.deepEqual(pecahUsia('1 hari'), { usia: 1, satuan: 'Hari' });
  assert.deepEqual(pecahUsia('6 Bulan'), { usia: 6, satuan: 'Bulan' });
  assert.deepEqual(pecahUsia('73 thn'), { usia: 73, satuan: 'Tahun' });
  assert.deepEqual(pecahUsia('0 tahun 6 bulan'), { usia: 6, satuan: 'Bulan' });
  assert.equal(pecahUsia('55'), null);
  assert.equal(pecahUsia(55), null);
  assert.equal(pecahUsia('lansia'), null);
  assert.equal(pecahUsia(null), null);
});

test('siapkanBaris: Rencana Perjalanan menentukan kolom nama alat angkut; tidak ada nama yang dikarang', () => {
  assert.deepEqual(
    siapkanBarisSiaos({ rencana_perjalanan: 'Pelayaran', maskapai: 'KM. A', pelayaran: null }),
    { rencana_perjalanan: 'Pelayaran', maskapai: null, pelayaran: 'KM. A' });
  assert.deepEqual(
    siapkanBarisSiaos({ rencana_perjalanan: 'Maskapai', maskapai: null, pelayaran: 'Lion Air' }),
    { rencana_perjalanan: 'Maskapai', maskapai: 'Lion Air', pelayaran: null });
  const tanpaNama = siapkanBarisSiaos({ rencana_perjalanan: 'Pelayaran', maskapai: null, pelayaran: null });
  assert.equal(tanpaNama.maskapai, null); assert.equal(tanpaNama.pelayaran, null);
  const sudahBenar = { rencana_perjalanan: 'Pelayaran', maskapai: null, pelayaran: 'KM. B' };
  assert.deepEqual(siapkanBarisSiaos(sudahBenar), sudahBenar);
  // dua-duanya terisi: jangan menimpa
  const dua = { rencana_perjalanan: 'Pelayaran', maskapai: 'X', pelayaran: 'Y' };
  assert.deepEqual(siapkanBarisSiaos(dua), dua);
});

test('Excel Sinkarkes apa adanya: judul laporan dan ringkasan dilewati, tanggal model apa pun, umur dipecah', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { nama: 'PASIEN SATU', tanggal: '2026-10-25', umur: '55 tahun' }),
    baris(2, { nama: 'PASIEN DUA', tanggal: '25/10/2026', umur: '1 hari' }),
    baris(3, { nama: 'PASIEN TIGA', tanggal: '25-10-2026', umur: '6 bulan' }),
    baris(4, { nama: 'PASIEN EMPAT', tanggal: '25 Oktober 2026', umur: '73 tahun' }),
    baris(5, { nama: 'PASIEN LIMA', tanggal: serial(2026, 10, 25), umur: '2 tahun' }),
    baris(6, { nama: 'PASIEN ENAM', tanggal: new Date(Date.UTC(2026, 9, 25)), umur: '30 tahun' }),
    baris(7, { nama: 'PASIEN TUJUH', tanggal: 'Oct 25, 2026', umur: '41 tahun' }),
    baris(8, { nama: 'PASIEN DELAPAN', tanggal: '25.10.26', umur: '9 tahun' }),
    baris(9, { nama: 'PASIEN SEMBILAN', tanggal: '2026-10-25 08:30:00', umur: '12 tahun' }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.equal(h.fatal, null);
  assert.deepEqual(h.galat, []);
  assert.equal(h.sah.length, 9);
  assert.deepEqual(h.sah.map((s) => s.nilai.tanggal), Array(9).fill('2026-10-25'));
  assert.deepEqual(h.sah.map((s) => [s.nilai.usia, s.nilai.satuan_usia]), [
    [55, 'Tahun'], [1, 'Hari'], [6, 'Bulan'], [73, 'Tahun'], [2, 'Tahun'], [30, 'Tahun'], [41, 'Tahun'], [9, 'Tahun'], [12, 'Tahun'],
  ]);
  // kolom Sinkarkes yang tidak punya kolom di tabel diabaikan (bukan galat); data pribadi tidak masuk
  for (const j of ['Telepon', 'Alamat', 'Jenis Penyakit', 'nama pendamping']) assert.ok(h.kolomDiabaikan.includes(j), `${j} diabaikan`);
  assert.ok(h.kolomAda.includes('satuan_usia'), 'satuan_usia ikut diperbarui saat unggah ulang');
  assert.equal(h.sah[0].nilai.pelabuhan, 'Wilker Pelabuhan Parepare');
  assert.equal(h.sah[0].nilai.no_surat, 'SR.02.05/C.X.10.10/5501/2026', 'spasi pada nomor surat Sinkarkes dibuang');
  assert.equal(h.sah[0].nilai.perlu_bantuan_makanan_medikasi, 'Ya');
});

test('Excel Sinkarkes: nama KKP bervariasi termasuk yang berkurung; moda dikoreksi dari Rencana Perjalanan', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { kkp: 'Samarinda', nama: 'PASIEN A', tanggal: '2026-10-01', pelayaran: 'KM. ALFA' }),
    baris(2, { kkp: 'Pelabuhan Lhok Tuan', nama: 'PASIEN B', tanggal: '2026-10-01', pelayaran: 'KM. BRAVO' }),
    baris(3, { kkp: 'Bandara APT Pranoto (AAP)', nama: 'PASIEN C', tanggal: '2026-10-01', rencana: 'Maskapai', maskapai: 'Garuda', pelayaran: null, tujuan: 'Cengkareng (Bandara Soekarno Hatta)', kursi: 'Pintu' }),
    baris(4, { kkp: 'Samarinda', nama: 'PASIEN D', tanggal: '2026-10-01', rencana: 'Pelayaran', maskapai: 'KM. SALAH KOLOM', pelayaran: null }),
    baris(5, { kkp: 'Samarinda', nama: 'PASIEN E', tanggal: '2026-10-01', rencana: 'Pelayaran', maskapai: null, pelayaran: null }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.deepEqual(h.galat, []);
  assert.deepEqual(h.sah.map((s) => s.nilai.wilayah_kerja), ['Samarinda', 'Lhoktuan', 'APT Pranoto', 'Samarinda', 'Samarinda']);
  assert.deepEqual(h.sah.map((s) => [s.nilai.maskapai, s.nilai.pelayaran]), [
    [null, 'KM. ALFA'], [null, 'KM. BRAVO'], ['Garuda', null], [null, 'KM. SALAH KOLOM'], [null, null],
  ]);
  assert.equal(h.sah[2].nilai.perlu_kursi_dorong, 'Pintu');
});

test('duplikat: nama + tanggal + no. surat sama ditolak; nomor surat berbeda tidak dianggap duplikat', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { nama: 'PASIEN KEMBAR', tanggal: '2026-10-01', surat: 'SR/1' }),
    baris(2, { nama: 'PASIEN KEMBAR', tanggal: '01/10/2026', surat: 'SR/1' }),
    baris(3, { nama: 'PASIEN KEMBAR', tanggal: '2026-10-01', surat: 'SR/2' }),
    baris(4, { nama: 'PASIEN LAIN', tanggal: '2026-10-01', surat: 'SR/1' }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.equal(h.sah.length, 3);
  assert.equal(h.galat.length, 1);
  assert.match(h.galat[0].pesan.join(' '), /nama pasien/);
});

test('galat per baris jelas: tanggal rusak, nama kosong, wilayah tidak dikenal, umur tidak masuk akal', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { nama: 'PASIEN OK', tanggal: '2026-10-01' }),
    baris(2, { nama: 'PASIEN TGL RUSAK', tanggal: 'kemarin sore' }),
    baris(3, { nama: '', tanggal: '2026-10-01' }),
    baris(4, { kkp: 'Pelabuhan Antah Berantah', nama: 'PASIEN WILKER', tanggal: '2026-10-01' }),
    baris(5, { nama: 'PASIEN UMUR', tanggal: '2026-10-01', umur: '200 tahun' }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.equal(h.sah.length, 1);
  assert.equal(h.galat.length, 4);
  const pesan = h.galat.map((g) => g.pesan.join(' '));
  assert.match(pesan[0], /Tanggal/); assert.match(pesan[1], /Nama: wajib/); assert.match(pesan[2], /wilayah kerja tidak dikenal/); assert.match(pesan[3], /Usia/);
});

test('REGRESI: lembar Sinkarkes .xlsx berformat 65.537 baris tidak membuat pembaca macet', async () => {
  const buf = await berkasSinkarkes([baris(1, { nama: 'PASIEN SATU', tanggal: '2026-10-01' })], { barisBerformat: 65537 });
  const t0 = Date.now();
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  const lama = Date.now() - t0;
  assert.equal(h.fatal, null);
  assert.equal(h.sah.length, 1);
  assert.ok(lama < 10_000, `pembacaan ${lama} ms (harus < 10 detik)`);
});

test('form satu per satu: usia angka dan "55 tahun" sama-sama diterima', () => {
  const dasar = { tanggal: '2026-10-01', wilayah_kerja: 'Samarinda', nama: 'Pasien Form', diagnosa: 'Demam' };
  const a = validasiBaris(modul, { ...dasar, usia: 55, satuan_usia: 'Tahun' }, KAMUS_UJI, 2026);
  assert.deepEqual(a.galat, []); assert.equal(a.nilai?.usia, 55); assert.equal(a.nilai?.satuan_usia, 'Tahun');
  const b = validasiBaris(modul, { ...dasar, usia: '55 tahun' }, KAMUS_UJI, 2026);
  assert.deepEqual(b.galat, []); assert.equal(b.nilai?.usia, 55); assert.equal(b.nilai?.satuan_usia, 'Tahun');
  const c = validasiBaris(modul, { ...dasar, usia: '130' }, KAMUS_UJI, 2026);
  assert.ok(c.galat.some((g) => g.startsWith('Usia')));
});

test('template Excel SIAOS memuat kolom wajib bertanda * dan tidak memuat kolom bantu', async () => {
  const buf = await buatTemplate(modul, ['Samarinda']);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  const judul = (wb.getWorksheet('Data')!.getRow(1).values as unknown[]).filter(Boolean).map(String);
  assert.equal(judul.filter((j) => j.endsWith('*')).length, modul.kolom.filter((k) => k.wajib).length);
  assert.ok(!judul.some((j) => /Rencana Perjalanan/i.test(j)));
});

test('nomor surat dengan spasi tak beraturan dianggap SAMA: duplikat terdeteksi dan kunci cocok dengan baris lama di database', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { nama: 'PASIEN KEMBAR', tanggal: '2026-10-01', surat: 'SR.02.05/C.X.10.10/5544/ 2026' }),
    baris(2, { nama: 'PASIEN KEMBAR', tanggal: '2026-10-01', surat: 'SR.02.05/C.X.10.10/5544 /2026' }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.equal(h.sah.length, 1);
  assert.equal(h.galat.length, 1);
  assert.equal(h.sah[0].nilai.no_surat, 'SR.02.05/C.X.10.10/5544/2026');
  // baris lama di database boleh saja menyimpan nomor dengan spasi: kuncinya harus tetap sama
  const dariDb = { wilayah_kerja: 'Samarinda', nama: 'PASIEN KEMBAR', tanggal: '2026-10-01', no_surat: 'SR.02.05/C.X.10.10/5544/ 2026' };
  assert.equal(kunciBaris(modul, dariDb), kunciBaris(modul, h.sah[0].nilai));
});

test('satu surat memuat beberapa pasien berbeda: semuanya sah (data nyata Sinkarkes memang begitu)', async () => {
  const buf = await berkasSinkarkes([
    baris(1, { nama: 'PASIEN A', tanggal: '2026-10-01', surat: 'SR.02.05/C.X.10.10/5544/2026' }),
    baris(2, { nama: 'PASIEN B', tanggal: '2026-10-01', surat: 'SR.02.05/C.X.10.10/5544/2026' }),
  ]);
  const h = await bacaExcel(buf, modul, 2026, KAMUS_UJI);
  assert.deepEqual(h.galat, []);
  assert.equal(h.sah.length, 2);
});
'@

foreach ($nama in $berkasBaru.Keys) { Pasang-Berkas $nama $berkasBaru[$nama] }

# ------------------------------------------------------------------------------------------------
Judul '6. Cek tipe TypeScript'
if ($masalah -gt 0) {
  Peringatan "Ada $masalah bagian yang belum bisa dipasang otomatis (lihat [BELUM BISA] di atas). Cek tipe tetap dijalankan."
}
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Gagal 'tsc masih menemukan galat tipe. Salin keluarannya di atas dan kirim.' }
Ok 'tsc bersih.'

if (-not $LewatiUji) {
  Judul '7. Uji otomatis (tanpa database)'
  npx tsx --test scripts/migrate/uji-siaos-sinkarkes.ts scripts/migrate/uji-modul-klinik.ts scripts/migrate/uji-tanggal-input.ts scripts/migrate/uji-wilker-input.ts
  if ($LASTEXITCODE -ne 0) { Gagal 'Ada uji yang gagal (lihat keluaran di atas).' }
  Ok 'Semua uji lolos.'
}

if ($DenganDatabase) {
  Judul '8. Database (tabel siaos)'
  if (-not (Test-Path '.env.local')) {
    Peringatan '.env.local tidak ditemukan: langkah database dilewati.'
  } else {
    $cfg = Muat-EnvLokal '.env.local'
    # pelari SQL repo memakai PG_*, aplikasi memakai DB_*: dijembatani di sini, hanya untuk sesi ini
    if (-not $env:PG_URL -and -not $env:PG_USER) {
      if ($cfg['DATABASE_URL']) {
        Atur-Env 'PG_URL' $cfg['DATABASE_URL']
      } else {
        $inang = $cfg['DB_HOST']; if ($cfg['DB_SOCKET']) { $inang = $cfg['DB_SOCKET'] }
        Atur-Env 'PG_HOST' $inang
        Atur-Env 'PG_PORT' $cfg['DB_PORT']
        Atur-Env 'PG_USER' $cfg['DB_USER']
        Atur-Env 'PG_PASSWORD' $cfg['DB_PASSWORD']
        Atur-Env 'PG_DATABASE' $cfg['DB_NAME']
      }
    }
    if ($cfg['DB_SSL'] -match '^(1|true|yes)$') { Atur-Env 'PGSSLMODE' 'no-verify' }

    Info 'Pemeriksaan awal tabel siaos (hanya membaca; tidak mencetak nama pasien)...'
    npx tsx --env-file=.env.local scripts/migrate/cek-skema-siaos.ts
    if ($LASTEXITCODE -eq 2) { Gagal 'Tidak bisa terhubung ke database. Periksa .env.local dan pesan di atas.' }

    Write-Host ''
    Info 'LANGKAH A - kolom sumber/batch_id dan id otomatis (hanya menambah; data lama tidak diubah; aman diulang).'
    Info '  Tanpa id otomatis, setiap penyimpanan dari modul input GAGAL.'
    $jawabA = Read-Host '  Jalankan langkah A (30_siaos_input.sql)? (y/N)'
    if ($jawabA -match '^(y|ya)$') {
      node scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/30_siaos_input.sql
      if ($LASTEXITCODE -ne 0) { Gagal 'Langkah A gagal (lihat pesan di atas).' }
      Ok 'Langkah A selesai.'
    } else {
      Peringatan 'Langkah A dilewati. Input/Unggah SIAOS BELUM bisa dipakai sebelum kolom sumber, batch_id, dan id otomatis ada.'
    }

    Write-Host ''
    Info 'LANGKAH B - indeks unik: satu surat boleh memuat beberapa pasien.'
    Info '  Indeks lama (wilayah_kerja, no_surat) hanya mengizinkan SATU pasien per surat. Ekspor Sinkarkes memuat'
    Info '  nomor surat yang dipakai dua pasien berbeda (ada di berkas contoh Anda); tanpa langkah ini unggahan seperti'
    Info '  itu GAGAL seluruhnya (tidak ada data setengah jadi, tetapi tidak ada yang masuk).'
    Info '  Langkah ini mengganti indeksnya menjadi (wilayah_kerja, no_surat, nama, tanggal): baris kembar tetap ditolak,'
    Info '  data lama tidak diubah. Hanya mengubah SATU indeks; bila ragu, tanyakan dulu ke pengelola database.'
    $jawabB = Read-Host '  Jalankan langkah B (31_siaos_surat_banyak_pasien.sql)? (y/N)'
    if ($jawabB -match '^(y|ya)$') {
      node scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/31_siaos_surat_banyak_pasien.sql
      if ($LASTEXITCODE -ne 0) { Gagal 'Langkah B gagal (lihat pesan di atas).' }
      Ok 'Langkah B selesai.'
    } else {
      Peringatan 'Langkah B dilewati. Unggahan yang memuat satu surat untuk beberapa pasien akan gagal.'
    }

    Write-Host ''
    Info 'Pemeriksaan akhir...'
    npx tsx --env-file=.env.local scripts/migrate/cek-skema-siaos.ts
    if ($LASTEXITCODE -ne 0) { Peringatan 'Masih ada butir [GAGAL] di atas. Salin keluarannya dan kirim.' }
  }
  foreach ($n in $envDiatur) { Remove-Item -Path ("Env:" + $n) -ErrorAction SilentlyContinue }
}

Judul 'Selesai'
if ($masalah -gt 0) {
  Write-Host "  $masalah bagian belum terpasang. Salin semua keluaran di atas dan kirim." -ForegroundColor Red
} else {
  Info 'Semua bagian lengkap. Langkah berikut:'
  if (-not $DenganDatabase) { Info '  - .\lengkapi-siaos.ps1 -DenganDatabase   (periksa dan migrasi tabel siaos)' }
  Info '  - npm run dev, lalu Input Data > SIAOS > Unggah Excel > pilih tahun > pilih berkas Sinkarkes apa adanya.'
  Info '  - scripts\migrate\30_siaos_input.sql masuk .gitignore (*.sql); bila mau di-commit: git add -f scripts/migrate/30_siaos_input.sql'
}