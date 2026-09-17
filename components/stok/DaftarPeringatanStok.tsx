import { RingkasanStokKlinik, JENIS_STOK_LABEL, ambilSatuan } from '@/lib/klinik/agregasiStok';

export function DaftarPeringatanStok({ ringkasan }: { ringkasan: RingkasanStokKlinik[] }) {
  const kritis = ringkasan
    .filter((r) => r.status === 'kritis')
    .sort((a, b) => (a.estimasiHariHabis ?? 999) - (b.estimasiHariHabis ?? 999));

  if (kritis.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <p className="text-sm font-semibold text-[#0F2A38] mb-2">Peringatan Stok Kritis</p>
        <p className="text-sm text-emerald-600">✓ Tidak ada klinik dengan stok kritis saat ini.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
      <p className="text-sm font-semibold text-[#0F2A38] mb-3">
        Peringatan Stok Kritis <span className="text-red-600">({kritis.length})</span>
      </p>
      <div className="space-y-2">
        {kritis.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
            <div>
              <span className="font-medium text-gray-900">{r.namaKlinik}</span>
              <span className="text-gray-500"> — {JENIS_STOK_LABEL[r.jenisStok] ?? r.jenisStok}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-red-700">
                {r.sisaStokTerkini} {ambilSatuan(r.jenisStok)}
              </span>
              {r.estimasiHariHabis !== null && (
                <span className="block text-[11px] text-red-500">~{r.estimasiHariHabis} hari lagi habis</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}