/* Service worker EPIC-AI — hanya untuk form pengawasan klinik agar bisa dibuka OFFLINE.
 * - /_next/static/* : cache-first (file ber-hash, aman disimpan)
 * - halaman form    : jaringan-dulu (maks 6 detik, sinyal lemah) lalu salinan tersimpan
 * Data yang diinput offline TIDAK lewat sini: disimpan di IndexedDB oleh aplikasi. */
const VERSI = 'v1';
const CACHE_HALAMAN = 'epic-halaman-' + VERSI;
const CACHE_ASET = 'epic-aset-' + VERSI;
const HALAMAN_FORM = '/dashboard/pengawasan-klinik/tambah';
const BATAS_JARINGAN_MS = 6000;

const HTML_BELUM_TERSIMPAN =
  '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline</title></head><body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">' +
  '<h2>Form belum tersimpan di perangkat ini</h2>' +
  '<p>Buka halaman form pengawasan klinik <b>sekali saat ada sinyal</b> agar bisa dipakai offline di lokasi.</p>' +
  '</body></html>';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nama = await caches.keys();
      await Promise.all(
        nama
          .filter((n) => n.startsWith('epic-') && n !== CACHE_HALAMAN && n !== CACHE_ASET)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

function adalahHalamanForm(url) {
  return url.pathname === HALAMAN_FORM || url.pathname === HALAMAN_FORM + '/';
}

function fetchDenganBatas(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_ASET);
  const ada = await cache.match(req);
  if (ada) return ada;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function halamanJaringanDulu(req) {
  const cache = await caches.open(CACHE_HALAMAN);
  try {
    const res = await fetchDenganBatas(req, BATAS_JARINGAN_MS);
    // jangan simpan hasil redirect (mis. ke halaman login) sebagai halaman form
    if (res.ok && !res.redirected) cache.put(HALAMAN_FORM, res.clone());
    return res;
  } catch (e) {
    const tersimpan = await cache.match(HALAMAN_FORM);
    if (tersimpan) return tersimpan;
    return new Response(HTML_BELUM_TERSIMPAN, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === 'navigate' && adalahHalamanForm(url)) {
    event.respondWith(halamanJaringanDulu(req));
  }
});

// ---- simpan halaman + semua aset JS/CSS/font yang dirujuk (dipicu dari aplikasi saat online) ----
async function simpanAset(daftarUrl) {
  const cache = await caches.open(CACHE_ASET);
  for (const u of daftarUrl) {
    try {
      if (await cache.match(u)) continue;
      const res = await fetch(u);
      if (!res.ok) continue;
      if (u.endsWith('.css')) {
        const teks = await res.clone().text();
        const font = teks.match(/\/_next\/static\/media\/[^)"'\s]+/g) || [];
        await simpanAset(Array.from(new Set(font)));
      }
      await cache.put(u, res);
    } catch (e) {
      /* aset gagal diunduh: lewati */
    }
  }
}

async function simpanHalamanForm() {
  try {
    const res = await fetch(HALAMAN_FORM, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
    if (!res.ok || res.redirected) return;
    const html = await res.clone().text();
    const cache = await caches.open(CACHE_HALAMAN);
    await cache.put(HALAMAN_FORM, res);
    const aset = html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || [];
    await simpanAset(Array.from(new Set(aset)));
  } catch (e) {
    /* abaikan */
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.tipe === 'simpan-halaman-form') {
    event.waitUntil(simpanHalamanForm());
  }
});
