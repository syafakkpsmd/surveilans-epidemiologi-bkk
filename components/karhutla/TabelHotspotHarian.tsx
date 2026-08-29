'use client';

import { Fragment, useMemo, useState } from 'react';
import type { BarisTabelHotspot } from '@/lib/supabase/queries-karhutla-server';
import { klasifikasiKabKota, CATATAN_METODE_KLASIFIKASI } from '@/lib/karhutla/klasifikasiKabKota';

interface AgregatHotspotHarian {
  tanggal: string;
  jumlahTitik: number;
  confidenceRataRata: number | null;
  frpTotal: number | null;
  frpRataRata: number | null;
  satelitUnik: string[];
  titik: BarisTabelHotspot[];
}

function formatTanggal(tanggal: string) {
  return new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function agregasiPerTanggal(data: BarisTabelHotspot[]): AgregatHotspotHarian[] {
  const map = new Map<string, BarisTabelHotspot[]>();
  for (const h of data) {
    const grup = map.get(h.tanggal_deteksi) ?? [];
    grup.push(h);
    map.set(h.tanggal_deteksi, grup);
  }

  return Array.from(map.entries())
    .map(([tanggal, titik]) => {
      const confidenceValid = titik.map((t) => t.confidence).filter((c): c is number => c != null);
      const frpValid = titik.map((t) => t.frp).filter((f): f is number => f != null);
      const satelitUnik = Array.from(new Set(titik.map((t) => t.satelit).filter((s): s is string => !!s)));

      return {
        tanggal,
        jumlahTitik: titik.length,
        confidenceRataRata: confidenceValid.length ? confidenceValid.reduce((a, b) => a + b, 0) / confidenceValid.length : null,
        frpTotal: frpValid.length ? frpValid.reduce((a, b) => a + b, 0) : null,
        frpRataRata: frpValid.length ? frpValid.reduce((a, b) => a + b, 0) / frpValid.length : null,
        satelitUnik,
        titik: titik.sort((a, b) => (a.jam_deteksi ?? '').localeCompare(b.jam_deteksi ?? '')),
      };
    })
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)); // terbaru dulu
}

interface GrupKabKota {
  nama: string;
  jumlahTitik: number;
  confidenceRataRata: number | null;
  frpTotal: number | null;
  frpRataRata: number | null;
  titik: BarisTabelHotspot[];
}

function kelompokkanPerKabKota(titik: BarisTabelHotspot[]): GrupKabKota[] {
  const map = new Map<string, BarisTabelHotspot[]>();
  for (const h of titik) {
    const nama = klasifikasiKabKota(h.latitude, h.longitude);
    const grup = map.get(nama) ?? [];
    grup.push(h);
    map.set(nama, grup);
  }

  return Array.from(map.entries())
    .map(([nama, titik]) => {
      const confidenceValid = titik.map((t) => t.confidence).filter((c): c is number => c != null);
      const frpValid = titik.map((t) => t.frp).filter((f): f is number => f != null);
      return {
        nama,
        jumlahTitik: titik.length,
        confidenceRataRata: confidenceValid.length ? confidenceValid.reduce((a, b) => a + b, 0) / confidenceValid.length : null,
        frpTotal: frpValid.length ? frpValid.reduce((a, b) => a + b, 0) : null,
        frpRataRata: frpValid.length ? frpValid.reduce((a, b) => a + b, 0) / frpValid.length : null,
        titik: titik.sort((a, b) => (a.jam_deteksi ?? '').localeCompare(b.jam_deteksi ?? '')),
      };
    })
    .sort((a, b) => b.jumlahTitik - a.jumlahTitik);
}

function GrupKabKotaBlok({ grup }: { grup: GrupKabKota }) {
  const [terbuka, setTerbuka] = useState(false);
  const diLuarKaltim = grup.nama.startsWith('Luar Kaltim');

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
          diLuarKaltim ? 'bg-amber-50/60' : ''
        }`}
      >
        <span className="flex items-center gap-2 font-medium text-gray-800">
          <span className={`inline-block text-gray-400 transition-transform ${terbuka ? 'rotate-90' : ''}`}>▶</span>
          {grup.nama}
          {diLuarKaltim && (
            <span className="text-[10px] font-normal text-amber-600">estimasi &middot; di luar Kaltim</span>
          )}
        </span>
        <span className="whitespace-nowrap text-xs text-gray-500">
          {grup.jumlahTitik} titik &middot; conf. {grup.confidenceRataRata != null ? `${grup.confidenceRataRata.toFixed(0)}%` : '-'}{' '}
          &middot; FRP total {grup.frpTotal != null ? grup.frpTotal.toFixed(2) : '-'} &middot; rata&sup2;{' '}
          {grup.frpRataRata != null ? grup.frpRataRata.toFixed(2) : '-'}
        </span>
      </button>

      {terbuka && (
        <div className="overflow-x-auto border-t border-gray-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-1.5 pl-9 text-left">Jam</th>
                <th className="px-3 py-1.5 text-left">Koordinat</th>
                <th className="px-3 py-1.5 text-left">Confidence</th>
                <th className="px-3 py-1.5 text-left">Satelit</th>
                <th className="px-3 py-1.5 text-left">FRP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grup.titik.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-1.5 pl-9 whitespace-nowrap text-gray-500">{h.jam_deteksi ?? '-'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">
                    {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{h.confidence != null ? `${h.confidence}%` : '-'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{h.satelit ?? '-'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{h.frp ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TabelHotspotHarian({ data }: { data: BarisTabelHotspot[] }) {
  const agregat = useMemo(() => agregasiPerTanggal(data), [data]);
  const jumlahHariUnik = agregat.length;
  const [tanggalTerbuka, setTanggalTerbuka] = useState<string | null>(null);

  function toggleTanggal(tanggal: string) {
    setTanggalTerbuka((prev) => (prev === tanggal ? null : tanggal));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Riwayat Titik Panas (Hotspot)</h2>
        <span className="text-xs text-gray-500">
          {data.length} titik &middot; {jumlahHariUnik} hari terekam
        </span>
      </div>

      {agregat.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">Belum ada data hotspot pada rentang ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left w-8"></th>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Jumlah Titik</th>
                <th className="px-3 py-2 text-left">Confidence Rata-rata</th>
                <th className="px-3 py-2 text-left">FRP Total</th>
                <th className="px-3 py-2 text-left">FRP Rata-rata</th>
                <th className="px-3 py-2 text-left">Satelit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agregat.map((hari) => {
                const terbuka = tanggalTerbuka === hari.tanggal;
                return (
                  <Fragment key={hari.tanggal}>
                    <tr
                      onClick={() => toggleTanggal(hari.tanggal)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-gray-400">
                        <span className={`inline-block transition-transform ${terbuka ? 'rotate-90' : ''}`}>▶</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                        {formatTanggal(hari.tanggal)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{hari.jumlahTitik}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {hari.confidenceRataRata != null ? `${hari.confidenceRataRata.toFixed(0)}%` : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {hari.frpTotal != null ? hari.frpTotal.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {hari.frpRataRata != null ? hari.frpRataRata.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {hari.satelitUnik.length ? hari.satelitUnik.join(', ') : '-'}
                      </td>
                    </tr>

                    {terbuka && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 px-3 py-3">
                          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                              Titik panas per kabupaten/kota
                            </div>
                            {kelompokkanPerKabKota(hari.titik).map((grup) => (
                              <GrupKabKotaBlok key={grup.nama} grup={grup} />
                            ))}
                            <p className="px-3 py-2 text-[11px] italic text-gray-400">{CATATAN_METODE_KLASIFIKASI}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}