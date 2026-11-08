# kumpulkan.ps1
# Mengumpulkan berkas kode yang berkaitan dengan modul HIV, TB, dan Migrasi Malaria + kerangka input data
# menjadi satu berkas kirim2.zip. Jalankan dari folder utama proyek:  .\kumpulkan.ps1
#
# Yang dikumpulkan hanya KODE dan skema (.ts, .tsx, .sql, .md, .mjs). Tidak ada berkas .env, node_modules, .next,
# dan tidak ada data peserta. Daftar berkas yang masuk ditampilkan di akhir supaya bisa kamu periksa.
$ErrorActionPreference = 'Stop'
$files = New-Object System.Collections.Generic.List[string]

function Semua($path) {
  if (Test-Path -LiteralPath $path) { Get-ChildItem -LiteralPath $path -Recurse -File | ForEach-Object { $files.Add($_.FullName) } }
}
function Satu($path) {
  if (Test-Path -LiteralPath $path) { $files.Add((Resolve-Path -LiteralPath $path).Path) }
}

# 1. Kerangka input data, pembaca tanggal, dan halaman/route input yang sudah ada
Semua 'lib\input-data'
Semua 'lib\tanggal'
Semua 'components\input-data'
Semua 'app\(dashboard)\dashboard\input-data'
Semua 'app\api\input-data'

# 2. Query dan modul HIV, TB, Migrasi Malaria
foreach ($p in 'lib\db\modul\hiv.ts', 'lib\db\modul\tb.ts', 'lib\db\modul\queriesHivVct.ts',
               'lib\db\modul\queriesTb.ts', 'lib\db\modul\queriesMigrasiMalaria.ts', 'lib\vektor\skema-input.ts') { Satu $p }

# 3. Berkas lain yang menyebut tabel/modul tersebut (halaman, skema SQL, skrip migrasi, dokumen)
$pola = 'hiv_data|tb_data|migrasi_malaria|MigrasiMalaria|queriesHivVct|queriesTb'
foreach ($akar in 'app', 'lib', 'components', 'schema', 'scripts', 'docs') {
  if (Test-Path -LiteralPath $akar) {
    Get-ChildItem -Path $akar -Recurse -File -Include *.ts, *.tsx, *.sql, *.md, *.mjs |
      Where-Object { $_.FullName -notmatch '\\(node_modules|\.next)\\' -and $_.Length -lt 400KB } |
      Select-String -Pattern $pola -List |
      ForEach-Object { $files.Add($_.Path) }
  }
}

$unik = $files | Sort-Object -Unique
if (-not $unik) { 'Tidak ada berkas yang ditemukan. Pastikan dijalankan dari folder utama proyek.'; return }

$stage = 'kirim2'
if (Test-Path -LiteralPath $stage) { Remove-Item -Recurse -Force -LiteralPath $stage }
foreach ($p in $unik) {
  $dst = Join-Path $stage (Resolve-Path -LiteralPath $p -Relative)
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  Copy-Item -LiteralPath $p -Destination $dst
}
Compress-Archive -LiteralPath (Get-ChildItem $stage | ForEach-Object FullName) -DestinationPath kirim2.zip -Force
Remove-Item -Recurse -Force -LiteralPath $stage

''
"$($unik.Count) berkas -> kirim2.zip"
''
$unik | ForEach-Object { Resolve-Path -LiteralPath $_ -Relative }