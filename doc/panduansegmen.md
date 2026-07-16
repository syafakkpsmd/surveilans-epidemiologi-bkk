# Panduan Penerapan File — Per Segmen

Legenda:
- 🆕 **BARU** — file belum ada di proyek Anda, buat foldernya kalau perlu, lalu buat file ini
- ♻️ **TIMPA** — file sudah ada, GANTI seluruh isinya dengan versi ini
- ✅ **SUDAH ADA** — dari segmen sebelumnya, tidak perlu diubah lagi di segmen ini

Struktur folder ditulis dengan format Windows (backslash), sesuai environment Anda.

---

## SEGMEN 1 — Fondasi Proyek

| Status | File |
|---|---|
| 🆕 | `lib\supabase\client.ts` |
| 🆕 | `lib\supabase\server.ts` |
| 🆕 | `lib\supabase\middleware.ts` |
| 🆕 | `middleware.ts` (root) |
| 🆕 | `types\database.types.ts` (placeholder — nanti ditimpa di Segmen 2) |
| 🆕 | `.env.local.example` |
| ♻️ | `app\globals.css` (design tokens) |
| ♻️ | `app\layout.tsx` (lepas font Google) |
| ♻️ | `app\page.tsx` (placeholder sementara) |

---

## SEGMEN 2 — Skema Database & Query *(sudah Anda buat sendiri)*

| Status | File |
|---|---|
| ♻️ | `types\database.types.ts` (isi lengkap, generic `Database` type) |
| ♻️ | `lib\supabase\client.ts` (jadi generic `<Database>`) |
| ♻️ | `lib\supabase\server.ts` (jadi generic `<Database>`) |
| 🆕 | `lib\supabase\queries.ts` (`getRingkasanMingguan`, `getRingkasanBulanan`, `getKategoriBreakdown`, dll — dengan overload per tabel) |

---

## SEGMEN 3 — Autentikasi Opsional & Kunjungan Tamu *(sudah Anda buat sendiri)*

| Status | File |
|---|---|
| 🆕 | SQL: tabel `kunjungan_tamu` & `profiles` + RLS (jalankan di Supabase SQL Editor, bukan file kode) |
| 🆕 | `lib\auth\actions.ts` (`login`, `logout`) |
| 🆕 | `lib\auth\getUserRole.ts` |
| 🆕 | `app\actions\kunjungan.ts` (`catatKunjungan`) |
| 🆕 | `app\login\page.tsx` |
| ✅ | `lib\supabase\middleware.ts`, `middleware.ts` — **tidak berubah** dari Segmen 1 |

---

## SEGMEN 4 — Navbar, Live Clock, Tombol Analisis AI

| Status | File |
|---|---|
| 🆕 | `lib\auth\getStatusAkses.ts` |
| 🆕 | `components\LiveClock.tsx` |
| 🆕 | `components\LiveBadge.tsx` |
| 🆕 | `components\Navbar.tsx` |
| 🆕 | `components\NavbarClient.tsx` |
| 🆕 | `components\Footer.tsx` |
| 🆕 | `components\TombolAnalisisAI.tsx` |
| 🆕 | `app\(dashboard)\layout.tsx` |
| 🆕 | `app\(dashboard)\dashboard\page.tsx` (placeholder — **akan ditimpa lagi di Segmen 5**, jangan bingung kalau isinya beda dari yang Anda taruh sekarang) |
| ♻️ | `app\page.tsx` (jadi `redirect('/dashboard')`) |
| ♻️ | `lib\supabase\queries.ts` — **cuma tambah 1 baris** komentar `eslint-disable` di baris yang mengandung `as any).select('*')`, TIDAK ada perubahan logika |

---

## SEGMEN 5 — Isi Dashboard Utama Sungguhan

| Status | File |
|---|---|
| 🆕 | `lib\epi-week.ts` |
| ♻️ | `app\(dashboard)\dashboard\page.tsx` — **isi placeholder Segmen 4 diganti total** dengan dashboard sungguhan |
| ♻️ | `app\globals.css` — tambah 1 baris token `--color-bg` yang kelupaan di Segmen 1 |

---

## SEGMEN 6 — Dashboard COP Lengkap

| Status | File |
|---|---|
| 🆕 | `components\cop\FilterCop.tsx` |
| 🆕 | `components\TrenChart.tsx` (dipakai ulang di Segmen 7) |
| 🆕 | `components\BreakdownCard.tsx` (dipakai ulang di Segmen 7) |
| 🆕 | `app\(dashboard)\cop\page.tsx` |
| ⚙️ | Jalankan `npm install recharts` (dependency baru) |

---

## SEGMEN 7 — Dashboard PHQC Lengkap

| Status | File |
|---|---|
| 🆕 | `components\FilterPeriodeWilayah.tsx` (pindahan dari `components\cop\FilterCop.tsx`) |
| 🆕 | `app\(dashboard)\phqc\page.tsx` |
| 🗑️ | Hapus folder `components\cop\` (tidak dipakai lagi) |
| ♻️ | `app\(dashboard)\cop\page.tsx` — import diganti ke `FilterPeriodeWilayah` |

---

## RESTRUKTURISASI — Dashboard Utama Jadi Hub Multi-Modul

Dikerjakan setelah Segmen 9, sebelum modul-modul baru (Vektor, Pesawat,
TPP/TTU/PAB, PIE, KLB) mulai dibangun.

| Status | File |
|---|---|
| 🆕 | `components\KartuKategoriHub.tsx` |
| ♻️ | `app\(dashboard)\dashboard\page.tsx` — diganti total jadi HUB navigasi |
| 🆕 | `app\(dashboard)\dashboard\alat-angkut\page.tsx` — isi dashboard COP+PHQC (dulu di `/dashboard`) pindah ke sini |

**PENTING:** dashboard COP+PHQC yang dulu ada di `/dashboard` sekarang
ada di **`/dashboard/alat-angkut`**. Konteks `TombolAnalisisAI` di
halaman itu berubah dari `"dashboard-utama"` jadi `"alat-angkut-ringkasan"`.

**Pola menambah modul baru** (Vektor, PIE, dll nanti):
1. Buat `app\(dashboard)\dashboard\<nama-modul>\page.tsx`
2. Di `app\(dashboard)\dashboard\page.tsx`, tambahkan `href="/dashboard/<nama-modul>"` ke `<KartuKategoriHub>` yang sesuai (kartu otomatis jadi aktif, tidak perlu ubah bagian lain)

---

## Cara memverifikasi setelah tiap segmen (jalankan urut)

```powershell
npx tsc --noEmit
npm run build
npm run dev
```

Kalau ketiga perintah itu sukses tanpa error, segmen tersebut sudah benar diterapkan — baru lanjut segmen berikutnya.

## Kalau ragu file mana yang aktif dipakai di mana

Jalankan ini di root proyek untuk melihat isi file tanpa perlu buka satu-satu:
```powershell
Get-Content "app\(dashboard)\dashboard\page.tsx" | Select-Object -First 5
```
Bandingkan 5 baris pertamanya dengan yang saya kirim di setiap segmen — kalau beda, berarti file itu belum ditimpa.

---

*Dokumen ini akan saya perbarui setiap kali kita menyelesaikan segmen baru — minta saya kirim ulang versi terbaru kapan saja kalau builder-nya sudah maju.*