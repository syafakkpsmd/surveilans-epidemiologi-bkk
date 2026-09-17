import { RingkasanStokKlinik, JENIS_STOK_LABEL, StatusStok, ambilSatuan } from '@/lib/klinik/agregasiStok';

const WARNA_STATUS: Record<StatusStok, string> = {
  kritis: 'bg-red-100 text-red-800',
  waspada: 'bg-amber-100 text-amber-800',
  aman: 'bg-emerald-50 text-emerald-800',
};

export function TabelStokPerKlinik({ ringkasan }: { ringkasan: RingkasanStokKlinik[] }) {
  const klinikUnik = Array.from(new Set(ringkasan.map((r) => r.namaKlinik))).sort();
  const jenisUnik = Array.from(new Set(ringkasan.map((r) => r.jenisStok)));

  const peta = new Map(ringkasan.map((r) => [r.namaKlinik + '|' + r.jenisStok, r]));

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 overflow-x-auto">
      <p className="text-sm font-semibold text-[#0F2A38] mb-3">Sisa Stok per Klinik</p>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left pb-2 text-xs font-medium text-gray-500">Klinik</th>
            {jenisUnik.map((j) => (
              <th key={j} className="text-center pb-2 text-xs font-medium text-gray-500">
                {JENIS_STOK_LABEL[j] ?? j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {klinikUnik.map((klinik) => (
            <tr key={klinik} className="border-t border-gray-100">
              <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{klinik}</td>
              {jenisUnik.map((jenis) => {
                const r = peta.get(klinik + '|' + jenis);
                if (!r) return <td key={jenis} className="text-center text-gray-300">—</td>;
                return (
                  <td key={jenis} className="text-center py-1 px-1">
                    <span
                        title={
                            r.estimasiHariHabis !== null
                            ? `${r.sisaStokTerkini} ${ambilSatuan(jenis)} — ~${r.estimasiHariHabis} hari lagi`
                            : `${r.sisaStokTerkini} ${ambilSatuan(jenis)} — pemakaian rendah/stabil`
                        }
                        className={`inline-block rounded-md px-2 py-1 font-medium min-w-12 ${WARNA_STATUS[r.status]}`}
                        >
                        {r.sisaStokTerkini}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}