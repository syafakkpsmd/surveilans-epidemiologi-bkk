/**
 * app/(dashboard)/cop/loading.tsx
 * -----------------------------------------------------------------
 * Ditampilkan OTOMATIS oleh Next.js selagi Server Component
 * app/(dashboard)/cop/page.tsx sedang mengambil data (baik saat buka
 * halaman pertama kali MAUPUN saat ganti filter mode/wilayah/rentang
 * lewat router.push() di FilterPeriodeWilayah.tsx).
 *
 * SEBELUM file ini ada: tidak ada indikator apa pun selama proses
 * itu -- halaman lama tetap kelihatan diam di layar sampai semua
 * data baru selesai diambil, jadi klik terasa "tidak responsif"/
 * macet padahal sebenarnya sedang bekerja di background. Cukup
 * dengan menaruh file ini di sini, Next.js langsung menampilkannya
 * begitu navigasi terjadi -- tidak perlu ubah apa pun di page.tsx.
 */
export default function LoadingCop() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-center gap-3 rounded-card bg-surface p-6">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted">Memuat data COP...</span>
      </div>

      {/* Skeleton kartu ringkasan (Section 3) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-card bg-surface p-4">
            <div className="h-3 w-2/3 rounded bg-black/10" />
            <div className="mt-3 h-6 w-1/2 rounded bg-black/10" />
          </div>
        ))}
      </div>

      {/* Skeleton chart besar */}
      <div className="animate-pulse rounded-card bg-surface p-6">
        <div className="mx-auto h-4 w-1/3 rounded bg-black/10" />
        <div className="mt-6 h-64 w-full rounded bg-black/5" />
      </div>

      {/* Skeleton 2 kartu donut/kategori */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-card bg-surface p-6">
            <div className="mx-auto h-4 w-1/2 rounded bg-black/10" />
            <div className="mx-auto mt-6 h-40 w-40 rounded-full bg-black/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
