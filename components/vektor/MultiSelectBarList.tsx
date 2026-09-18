type MultiSelectBarListProps = {
  judul: string;
  data: { kategori: string; jumlah: number; persenDariResponden: number }[];
  warna?: string;
};

export default function MultiSelectBarList({ judul, data, warna = '#0F4C5C' }: MultiSelectBarListProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">{judul}</h2>
      <p className="mb-3 text-[11px] text-gray-400">
        Responden bisa memilih lebih dari satu jawaban — persentase dihitung dari total responden yang
        menjawab pertanyaan ini, bukan dari total pilihan.
      </p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.kategori}>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{d.kategori}</span>
              <span className="font-medium">
                {d.jumlah} ({d.persenDariResponden}%)
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.min(d.persenDariResponden, 100)}%`, backgroundColor: warna }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-gray-400">Belum ada data.</p>}
      </div>
    </div>
  );
}