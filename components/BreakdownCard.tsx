interface ItemBreakdown {
  nilai: string;
  jumlah: number;
}

interface BreakdownCardProps {
  judul: string;
  data: ItemBreakdown[];
  warnaFn?: (nilai: string) => string;
}

export function BreakdownCard({ judul, data, warnaFn }: BreakdownCardProps) {
  const max = Math.max(1, ...data.map((d) => d.jumlah));

  return (
    <div className="rounded-card bg-surface p-6">
      {/* Judul hanya akan muncul jika prop judul ada isinya */}
      {judul && (
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
          {judul}
        </h3>
      )}
      {data.length === 0 ? (
        <p className="text-sm text-muted">Tidak ada data untuk periode ini.</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 8).map((d) => (
            <div key={d.nilai}>
              <div className="mb-1 flex justify-between items-center text-sm">
                {/* w-40 memberikan ruang yang cukup untuk label agar sejajar */}
                <span className="text-ink truncate w-40">{d.nilai}</span>
                <span className="font-semibold text-ink">{d.jumlah}</span>
              </div>
              
              {/* h-3 untuk ketebalan yang lebih solid */}
              <div className="h-3 rounded-full bg-bg">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${(d.jumlah / max) * 100}%`,
                    background: warnaFn ? warnaFn(d.nilai) : "var(--color-teal)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}