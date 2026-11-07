# migrasi-wilker.ps1
# Mengganti nama lama (OPSI_WILAYAH / NAMA_WILAYAH / KODE_WILAYAH) ke kamus wilker secara massal.
#
#   .\migrasi-wilker.ps1             -> UJI COBA: hanya menampilkan file yang akan berubah
#   .\migrasi-wilker.ps1 -Terapkan   -> menulis perubahan
#
# Jalankan dari folder utama proyek. Commit dulu (git add -A; git commit) supaya bisa dibatalkan
# dengan: git restore .
#
# Yang dikerjakan skrip (mekanis, aman):
#   OPSI_WILAYAH.map(      -> wk.aktif.map(
#   NAMA_WILAYAH[          -> wk.namaPanjangByKode[
#   KODE_WILAYAH.includes( -> wk.isKode(                      (membaca/filter data)
#                          -> wk.daftarKodeAktif.includes(    (khusus unggahan & validasi media-tanah: input baru)
#   nama lama dihapus dari baris import; import yang kosong dibuang
#   lib/vektor/umum.ts     -> ekspor nama lama dihapus
#
# Yang TIDAK dikerjakan (harus manual): menyediakan variabel `wk` di tiap file
#   - server / route API : const wk = await getKamusWilker();   (dari '@/lib/wilayah-kerja/server')
#   - fungsi validasi    : terima `wk` sebagai parameter
#   - komponen client    : terima props `wilayah`, lalu useMemo(() => buatKamus(wilayah), [wilayah])
#   - pemanggilan petakanWilayah(teks) -> wk.kodeDariTeks(teks)
# Setelah skrip, `npx tsc --noEmit` akan menampilkan "Cannot find name 'wk'" di tiap file tersebut.

param([switch]$Terapkan)
$ErrorActionPreference = 'Stop'

$utf8 = New-Object System.Text.UTF8Encoding($false)
$namaLama = 'OPSI_WILAYAH', 'NAMA_WILAYAH', 'KODE_WILAYAH'
$polaLama = 'OPSI_WILAYAH|NAMA_WILAYAH|KODE_WILAYAH'
$khususInput = 'media-tanah\\validasi\.ts$|media-tanah\\upload\\route\.ts$'
$sumberSah = '^(@/lib/(vektor/umum|vektor/diare/config|media-tanah/config)|\./config|\./diare/config)$'

$reImport = [regex]"import\s+(?<tipe>type\s+)?\{(?<isi>[^}]*)\}\s*from\s*(?<q>['""])(?<sumber>[^'""]+)\k<q>;?"

$evaluator = [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  if ($m.Groups['sumber'].Value -notmatch $sumberSah) { return $m.Value }
  $isi = $m.Groups['isi'].Value
  $adaLama = $namaLama | Where-Object { $isi -match "\b$_\b" }
  if (-not $adaLama) { return $m.Value }
  $sisa = @($isi -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and ($namaLama -notcontains $_) })
  if ($sisa.Count -eq 0) { return '' }
  return "import $($m.Groups['tipe'].Value){ $($sisa -join ', ') } from '$($m.Groups['sumber'].Value)';"
}

$jumlah = 0
$berkas = Get-ChildItem app, components, lib -Recurse -Include *.ts, *.tsx -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' }

foreach ($f in $berkas) {
  $asal = [IO.File]::ReadAllText($f.FullName)
  if ($asal -notmatch $polaLama) { continue }

  if ($f.FullName -match 'lib\\vektor\\umum\.ts$') {
    $baru = $asal -replace 'export \{ OPSI_WILAYAH, KODE_WILAYAH, NAMA_WILAYAH, petakanWilayah, parseAngka \}', 'export { petakanWilayah, parseAngka }'
  } else {
    $baru = $reImport.Replace($asal, $evaluator)
    $cekKode = if ($f.FullName -match $khususInput) { 'wk.daftarKodeAktif.includes(' } else { 'wk.isKode(' }
    $baru = $baru -replace '\bOPSI_WILAYAH\.map\(', 'wk.aktif.map('
    $baru = $baru -replace '\bNAMA_WILAYAH\[', 'wk.namaPanjangByKode['
    $baru = $baru -replace '\bKODE_WILAYAH\.includes\(', $cekKode
  }

  if ($baru -ne $asal) {
    $sisaLama = ([regex]::Matches($baru, $polaLama)).Count
    $rel = Resolve-Path -LiteralPath $f.FullName -Relative
    '{0}   (nama lama tersisa: {1})' -f $rel, $sisaLama
    if ($Terapkan) { [IO.File]::WriteAllText($f.FullName, $baru, $utf8) }
    $jumlah++
  }
}

''
if ($Terapkan) { "Selesai: $jumlah file diubah. Jalankan: npx tsc --noEmit" }
else { "Uji coba: $jumlah file akan diubah. Jalankan dengan -Terapkan untuk menulis perubahan." }