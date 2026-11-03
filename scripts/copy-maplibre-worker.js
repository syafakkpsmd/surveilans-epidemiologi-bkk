// scripts/copy-maplibre-worker.js
//
// Menyalin file worker MapLibre GL JS (maplibre-gl-worker.mjs +
// maplibre-gl-shared.mjs -- keduanya WAJIB disalin bareng krn worker
// meng-import shared.mjs lewat relative path) dari node_modules ke
// public/, supaya bisa dimuat sebagai file statis biasa lewat
// setWorkerUrl('/maplibre-gl-worker.mjs') di kode kita.
//
// KENAPA PERLU INI: mulai v6, MapLibre GL JS full ESM dan mengandalkan
// import.meta.url utk auto-detect lokasi worker-nya sendiri -- tapi ini
// TIDAK RELIABLE lewat bundler modern manapun (Vite/webpack/esbuild/
// Turbopack), termasuk Turbopack punya bug spesifik dgn worker MapLibre
// (github.com/vercel/next.js/issues/86495: "Turbopack dev server drops
// MapLibre inline worker"). Solusi resmi dari tim MapLibre sendiri:
// salin file worker jadi aset statis + setWorkerUrl() manual -- ini
// bundler-agnostic, jalan sama persis di dev (Turbopack) maupun
// production build (Vercel).
//
// Dijalankan otomatis lewat npm lifecycle hook "predev"/"prebuild" di
// package.json (lihat instruksi). Ditulis pakai Node.js biasa (bukan
// shell command cp/copy) supaya jalan sama di Windows maupun Mac/Linux.

const fs = require('fs');
const path = require('path');

const FILE_YANG_DISALIN = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

const sumberDir = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const tujuanDir = path.join(__dirname, '..', 'public');

for (const nama of FILE_YANG_DISALIN) {
  const sumber = path.join(sumberDir, nama);
  const tujuan = path.join(tujuanDir, nama);

  if (!fs.existsSync(sumber)) {
    console.warn(`[copy-maplibre-worker] Lewati: ${sumber} tidak ditemukan (maplibre-gl belum ter-install?)`);
    continue;
  }

  fs.copyFileSync(sumber, tujuan);
  console.log(`[copy-maplibre-worker] Disalin: ${nama} -> public/${nama}`);
}