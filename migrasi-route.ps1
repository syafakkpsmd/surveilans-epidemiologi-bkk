# migrasi-route.ps1
# Menambahkan kamus wilker (getKamusWilker) ke route API yang masih memanggil fungsi lama.
#
#   .\migrasi-route.ps1             -> UJI COBA (tidak menulis apa pun)
#   .\migrasi-route.ps1 -Terapkan   -> menulis perubahan
#
# Tiap berkas diubah ATAU dilewati utuh: bila jumlah kecocokan suatu aturan tidak sesuai harapan,
# berkas itu tidak disentuh dan ditandai PERIKSA. Jalankan dari folder utama proyek; commit dulu.
param([switch]$Terapkan)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$impor = "import { getKamusWilker } from '@/lib/wilayah-kerja/server';"

$rencana = @(
  @{ Berkas = 'app\api\media-tanah\dashboard\route.ts'; Aturan = @(
    @{ Cari = 'filterDariQuery\(req\.nextUrl\.searchParams\)'; Ganti = 'filterDariQuery(req.nextUrl.searchParams, await getKamusWilker())'; Harap = 1 }
  )},
  @{ Berkas = 'app\api\media-tanah\route.ts'; Aturan = @(
    @{ Cari = "validasiPemeriksaan\(body, \{ wilayah: String\(body\.wilayah \?\? ''\) \}\)"; Ganti = "validasiPemeriksaan(body, { wilayah: String(body.wilayah ?? ''), wk: await getKamusWilker() })"; Harap = 1 },
    @{ Cari = 'filterDariQuery\(sp\)'; Ganti = 'filterDariQuery(sp, await getKamusWilker())'; Harap = 1 }
  )},
  @{ Berkas = 'app\api\vektor\anopheles\route.ts'; Aturan = @(
    @{ Cari = 'filterDariQuery\(sp\)'; Ganti = 'filterDariQuery(sp, await getKamusWilker())'; Harap = 1 },
    @{ Cari = 'validasiLarva\(body\)'; Ganti = 'validasiLarva(body, { wk: await getKamusWilker() })'; Harap = 2 },
    @{ Cari = 'validasiDewasa\(body\)'; Ganti = 'validasiDewasa(body, { wk: await getKamusWilker() })'; Harap = 2 }
  )}
)
# Tiga route unggahan: `const o = {...}` diberi `wk` (satu kali per berkas).
foreach ($b in 'app\api\vektor\anopheles\upload\route.ts', 'app\api\vektor\diare\upload\route.ts', 'app\api\vektor\tikus\upload\route.ts') {
  $rencana += @{ Berkas = $b; Aturan = @(
    @{ Cari = '(?m)^([ \t]*)const o = \{[ \t]*'; Ganti = '@@UPLOAD@@'; Harap = 1 }
  )}
}

$diubah = 0; $periksa = 0
foreach ($r in $rencana) {
  if (-not (Test-Path -LiteralPath $r.Berkas)) { "PERIKSA  $($r.Berkas)  (berkas tidak ada)"; $periksa++; continue }
  $asal = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $r.Berkas).Path)
  $nl = if ($asal -match "`r`n") { "`r`n" } else { "`n" }
  $baru = $asal
  $ok = $true
  foreach ($a in $r.Aturan) {
    $n = [regex]::Matches($baru, $a.Cari).Count
    if ($n -ne $a.Harap) { "PERIKSA  $($r.Berkas)  (aturan '$($a.Cari)' cocok $n kali, diharapkan $($a.Harap))"; $ok = $false; break }
    if ($a.Ganti -eq '@@UPLOAD@@') {
      $baru = [regex]::Replace($baru, $a.Cari, { param($m) $m.Groups[1].Value + 'const wk = await getKamusWilker();' + $nl + $m.Groups[1].Value + 'const o = { wk, ' })
    } else {
      $baru = [regex]::Replace($baru, $a.Cari, $a.Ganti.Replace('$', '$$'))
    }
  }
  if (-not $ok) { $periksa++; continue }
  if ($baru -notmatch 'getKamusWilker \}') {
    $n2 = [regex]::Matches($baru, "(?m)^import [^\r\n]*from 'next/server';").Count
    if ($n2 -ne 1) { "PERIKSA  $($r.Berkas)  (baris import 'next/server' tidak ditemukan, tambahkan impor getKamusWilker manual)"; $periksa++; continue }
    $baru = [regex]::Replace($baru, "(?m)^(import [^\r\n]*from 'next/server';)", { param($m) $m.Groups[1].Value + $nl + $impor })
  }
  "OK       $($r.Berkas)"
  if ($Terapkan) { [IO.File]::WriteAllText((Resolve-Path -LiteralPath $r.Berkas).Path, $baru, $utf8) }
  $diubah++
}
''
if ($Terapkan) { "Selesai: $diubah berkas diubah, $periksa perlu diperiksa manual. Jalankan: npx tsc --noEmit" }
else { "Uji coba: $diubah berkas akan diubah, $periksa perlu diperiksa manual. Jalankan dengan -Terapkan untuk menulis." }