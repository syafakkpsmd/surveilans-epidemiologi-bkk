import type { BarisTabelHotspot } from '@/lib/supabase/queries-karhutla-server';

export default function TabelHotspotHarian({ data }: { data: BarisTabelHotspot[] }) {
  const jumlahHariUnik = new Set(data.map((d) => d.tanggal_deteksi)).size;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Riwayat Titik Panas (Hotspot NASA FIRMS)</h2>
        <span className="text-xs text-gray-500">
          {data.length} titik &middot; {jumlahHariUnik} hari terekam
        </span>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">Belum ada data hotspot pada rentang ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Jam</th>
                <th className="px-3 py-2 text-left">Koordinat</th>
                <th className="px-3 py-2 text-left">Confidence</th>
                <th className="px-3 py-2 text-left">Satelit</th>
                <th className="px-3 py-2 text-left">FRP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(h.tanggal_deteksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{h.jam_deteksi ?? '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.confidence}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{h.satelit ?? '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{h.frp ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}