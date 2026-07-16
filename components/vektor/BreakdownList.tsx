// ================================================================
// SEGMEN 11 — components/vektor/BreakdownList.tsx
// Bar-list sederhana untuk "Top Kategori Minggu Ini". Server Component
// murni (tidak ada interaktivitas), menerima data yang sudah dihitung
// dari getBreakdownKategori().
// ================================================================

export default function BreakdownList({
  judul,
  data,
  warna = '#0F4C5C',
}: {
  judul: string;
  data: { kategori: string; jumlah: number }[];
  warna?: string;
}) {
  const maksimal = Math.max(...data.map((d) => d.jumlah), 1);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{judul}</h3>
      {data.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada data untuk minggu ini.</p>
      )}
      <div className="space-y-2">
        {data.slice(0, 8).map((d) => (
          <div key={d.kategori} className="flex items-center gap-2">
            <span className="w-28 truncate text-xs text-gray-600" title={d.kategori}>
              {d.kategori}
            </span>
            <div className="h-2 flex-1 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full"
                style={{ width: `${(d.jumlah / maksimal) * 100}%`, background: warna }}
              />
            </div>
            <span className="w-8 text-right text-xs font-semibold text-gray-700">{d.jumlah}</span>
          </div>
        ))}
      </div>
    </div>
  );
}