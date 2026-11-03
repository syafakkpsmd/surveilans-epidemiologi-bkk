// components/vektor/DaftarLokasiTidakMemenuhi.tsx
export default function DaftarLokasiTidakMemenuhi({
  data,
  daftarWilker,
}: {
  data: any[];
  daftarWilker: { kode: string; nama: string }[];
}) {
  const petaWilker = Object.fromEntries(
    daftarWilker.map((w) => [w.kode, w.nama])
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Lokasi Tidak Memenuhi Syarat</h3>
        <p className="text-sm text-gray-400">Tidak ada lokasi tidak memenuhi syarat untuk periode ini.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        Lokasi Tidak Memenuhi Syarat ({data.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 pr-3">Tanggal</th>
              <th className="pb-2 pr-3">Wilker</th>
              <th className="pb-2 pr-3">Lokasi</th>
              <th className="pb-2 pr-3">Tindakan Pengendalian</th>
              <th className="pb-2 pr-3">Insektisida (ml)</th>
              <th className="pb-2">Luas Semprot (m²)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 pr-3">{new Date(r.tgl_kegiatan).toLocaleDateString('id-ID')}</td>
                <td className="py-2 pr-3">{petaWilker[r.kode_wilker] ?? r.kode_wilker}</td>
                <td className="py-2 pr-3">{r.lokasi ?? '-'}</td>
                <td className="py-2 pr-3 text-risiko-merah">{r.tindakan_pengendalian ?? '-'}</td>
                <td className="py-2 pr-3">{r.insektisida_terpakai_ml ?? '-'}</td>
                <td className="py-2">{r.luas_area_semprot_m2 ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}