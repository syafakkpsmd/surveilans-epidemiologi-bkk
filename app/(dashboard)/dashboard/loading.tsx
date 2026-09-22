/**
 * app/(dashboard)/dashboard/loading.tsx
 * -----------------------------------------------------------------
 * Sama seperti loading.tsx di cop/ dan alat-angkut/pesawat/ --
 * halaman Beranda ini juga melakukan banyak fetch data sekaligus
 * (COP, PHQC, Pesawat) di server, jadi butuh indikator loading
 * instan yang sama supaya tidak terasa macet.
 */
export default function LoadingBeranda() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F4C5C] border-t-transparent" />
        <span className="text-sm font-medium text-gray-500">Memuat data Beranda...</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
            <div className="mx-auto h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-6 h-48 w-full rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
