/**
 * app/(dashboard)/dashboard/alat-angkut/pesawat/loading.tsx
 * -----------------------------------------------------------------
 * Sama seperti app/(dashboard)/cop/loading.tsx -- ditampilkan
 * otomatis oleh Next.js selagi halaman Pesawat mengambil data
 * (termasuk saat ganti filter wilayah/rentang minggu/bulan lewat
 * router.push()). Tanpa file ini, halaman lama diam di layar tanpa
 * tanda apa pun sampai data baru selesai diambil.
 */
export default function LoadingPesawat() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F4C5C] border-t-transparent" />
        <span className="text-sm font-medium text-gray-500">Memuat data Pesawat...</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mx-auto h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-6 h-56 w-full rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
