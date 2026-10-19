'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanPeriodePosko } from '@/app/(dashboard)/dashboard/posko/actions';
import { JENDELA_BAWAAN, LABEL_POSKO, type JenisPosko, type PeriodePosko } from '@/lib/posko/konstanta';
import { tambahHari, tanggalPanjang } from '@/lib/posko/hitung';

/** Form "Atur Periode": pilih Hari H lalu N hari sebelum/sesudah, atau isi tanggal mulai-selesai manual. */
export default function PengaturPeriodePosko({
  posko,
  periode,
}: {
  posko: JenisPosko;
  periode: PeriodePosko | null;
}) {
  const router = useRouter();
  const bawaan = JENDELA_BAWAAN[posko];

  const [mode, setMode] = useState<'hariH' | 'manual'>('hariH');
  const [hariH, setHariH] = useState(periode ? tambahHari(periode.tanggalMulai, bawaan.sebelum) : '');
  const [sebelum, setSebelum] = useState(String(bawaan.sebelum));
  const [sesudah, setSesudah] = useState(String(bawaan.sesudah));
  const [mulaiManual, setMulaiManual] = useState(periode?.tanggalMulai ?? '');
  const [selesaiManual, setSelesaiManual] = useState(periode?.tanggalSelesai ?? '');
  const [tahunUbah, setTahunUbah] = useState<string | null>(null);
  const [nama, setNama] = useState(periode?.nama ?? '');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const hitung = useMemo(() => {
    if (mode === 'hariH') {
      const sb = Number(sebelum), sd = Number(sesudah);
      if (!hariH || !Number.isInteger(sb) || !Number.isInteger(sd) || sb < 0 || sd < 0) {
        return { mulai: '', selesai: '', tahunOtomatis: '' };
      }
      return { mulai: tambahHari(hariH, -sb), selesai: tambahHari(hariH, sd), tahunOtomatis: hariH.slice(0, 4) };
    }
    return { mulai: mulaiManual, selesai: selesaiManual, tahunOtomatis: mulaiManual.slice(0, 4) };
  }, [mode, hariH, sebelum, sesudah, mulaiManual, selesaiManual]);

  const tahun = tahunUbah ?? hitung.tahunOtomatis;
  const lama = hitung.mulai && hitung.selesai
    ? (Date.parse(`${hitung.selesai}T00:00:00Z`) - Date.parse(`${hitung.mulai}T00:00:00Z`)) / 86400000 + 1
    : 0;

  async function simpan() {
    setMenyimpan(true);
    setPesan(null);
    try {
      const hasil = await simpanPeriodePosko({
        posko,
        tahun: Number(tahun),
        nama: nama.trim() || `${LABEL_POSKO[posko]} ${tahun}`,
        tanggalMulai: hitung.mulai,
        tanggalSelesai: hitung.selesai,
      });
      setPesan({ ok: hasil.ok, teks: hasil.pesan });
      if (hasil.ok) router.replace(`/dashboard/posko/${posko === 'nataru' ? 'nataru' : 'idul-fitri'}?tahun=${tahun}`);
      if (hasil.ok) router.refresh();
    } catch (err) {
      setPesan({ ok: false, teks: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setMenyimpan(false);
    }
  }

  const input = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800';

  return (
    <div className="space-y-3 rounded-lg border border-[#0F4C5C]/30 bg-[#0F4C5C]/5 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold text-[#0F2A38]">Atur periode {LABEL_POSKO[posko]}</p>
        <div className="flex rounded-md border border-gray-200 bg-white p-0.5 text-xs font-medium">
          {(['hariH', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${mode === m ? 'bg-[#0F4C5C] text-white' : 'text-gray-600'}`}
            >
              {m === 'hariH' ? 'Berdasarkan Hari H' : 'Tanggal manual'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'hariH' ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-600">
            Hari H <span className="text-gray-400">({bawaan.keteranganHariH})</span>
            <input type="date" value={hariH} onChange={(e) => setHariH(e.target.value)} className={`${input} mt-1 block`} />
          </label>
          <label className="text-xs text-gray-600">
            Hari sebelum H
            <input type="number" min={0} max={60} value={sebelum} onChange={(e) => setSebelum(e.target.value)} className={`${input} mt-1 block w-24`} />
          </label>
          <label className="text-xs text-gray-600">
            Hari sesudah H
            <input type="number" min={0} max={60} value={sesudah} onChange={(e) => setSesudah(e.target.value)} className={`${input} mt-1 block w-24`} />
          </label>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-600">
            Tanggal mulai
            <input type="date" value={mulaiManual} onChange={(e) => setMulaiManual(e.target.value)} className={`${input} mt-1 block`} />
          </label>
          <label className="text-xs text-gray-600">
            Tanggal selesai
            <input type="date" value={selesaiManual} onChange={(e) => setSelesaiManual(e.target.value)} className={`${input} mt-1 block`} />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-600">
          Tahun posko
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahunUbah(e.target.value)}
            className={`${input} mt-1 block w-24`}
          />
        </label>
        <label className="min-w-[14rem] flex-1 text-xs text-gray-600">
          Nama (opsional)
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder={`${LABEL_POSKO[posko]} ${tahun || ''}`.trim()}
            className={`${input} mt-1 block w-full`}
          />
        </label>
      </div>

      <p className="text-xs text-gray-600">
        {hitung.mulai && hitung.selesai
          ? `Periode: ${tanggalPanjang(hitung.mulai)} – ${tanggalPanjang(hitung.selesai)} (${lama} hari)`
          : 'Isi tanggal untuk melihat periode.'}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={simpan}
          disabled={menyimpan || !hitung.mulai || !hitung.selesai || !tahun}
          className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
        >
          {menyimpan ? 'Menyimpan…' : 'Simpan Periode'}
        </button>
        {pesan && <span className={`text-xs ${pesan.ok ? 'text-green-700' : 'text-red-700'}`}>{pesan.teks}</span>}
      </div>
    </div>
  );
}
