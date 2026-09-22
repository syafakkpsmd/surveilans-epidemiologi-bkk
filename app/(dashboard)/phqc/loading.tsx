/**
 * app/(dashboard)/phqc/loading.tsx
 * -----------------------------------------------------------------
 * Sama seperti app/(dashboard)/cop/loading.tsx -- struktur halaman
 * PHQC mirip persis COP (Promise.all besar + banyak box AI), jadi
 * perlakuan loading state-nya disamakan.
 */
export default function LoadingPhqc() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-center gap-3 rounded-card bg-surface p-6">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted">Memuat data PHQC...</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-card bg-surface p-4">
            <div className="h-3 w-2/3 rounded bg-black/10" />
            <div className="mt-3 h-6 w-1/2 rounded bg-black/10" />
          </div>
        ))}
      </div>

      <div className="animate-pulse rounded-card bg-surface p-6">
        <div className="mx-auto h-4 w-1/3 rounded bg-black/10" />
        <div className="mt-6 h-64 w-full rounded bg-black/5" />
      </div>

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
