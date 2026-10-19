'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { simpanInputHarianPosko } from '@/app/(dashboard)/dashboard/posko/actions';
import {
  DAFTAR_PENYAKIT,
  DAFTAR_PTM,
  LABEL_POSKO,
  WILAYAH_POSKO,
  type JenisPosko,
  type PeriodePosko,
  type WilayahPosko,
} from '@/lib/posko/konstanta';
import { tanggalPanjang } from '@/lib/posko/hitung';
import type { InputHarianPosko } from '@/lib/posko/queries';

const KOLOM = ['L <5', 'L ≥5', 'P <5', 'P ≥5'];
const angka = (teks: string) => (teks.trim() === '' ? 0 : Number(teks));
const bilanganBulat = (n: number) => Number.isInteger(n) && n >= 0;

export default function PoskoInputClient({
  slug,
  posko,
  periode,
  tanggal,
  wilayah,
  tanggalMaks,
  awal,
  bolehKelola,
  catatan,
}: {
  slug: string;
  posko: JenisPosko;
  periode: PeriodePosko | null;
  tanggal: string;
  wilayah: WilayahPosko;
  /** tanggal terakhir yang boleh diinput = min(selesai periode, hari ini WITA); '' bila posko belum mulai */
  tanggalMaks: string;
  awal: InputHarianPosko | null;
  bolehKelola: boolean;
  catatan: string[];
}) {
  const router = useRouter();
  const judul = LABEL_POSKO[posko];

  const [penyakit, setPenyakit] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      DAFTAR_PENYAKIT.map((j) => [j, awal?.penyakit[j] ? awal.penyakit[j].map(String) : Array(8).fill('')])
    )
  );
  const [klbJumlah, setKlbJumlah] = useState(awal?.klbJumlah != null ? String(awal.klbJumlah) : '');
  const [klbKet, setKlbKet] = useState(awal?.klbKeterangan ?? '');
  const [ptm, setPtm] = useState<Record<string, string>>(() =>
    Object.fromEntries(DAFTAR_PTM.map((j) => [j, awal?.ptm[j] != null ? String(awal.ptm[j]) : '']))
  );
  const [kotor, setKotor] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const total = useMemo(() => {
    let kasus = 0, mati = 0;
    DAFTAR_PENYAKIT.forEach((j) => {
      penyakit[j].forEach((v, i) => { if (i < 4) kasus += angka(v) || 0; else mati += angka(v) || 0; });
    });
    return { kasus, mati };
  }, [penyakit]);

  function pindah(tanggalBaru: string, wilayahBaru: string) {
    if (kotor && !confirm('Ada isian yang belum disimpan. Pindah tanggal/wilayah dan buang isian ini?')) return;
    const q = new URLSearchParams({ tanggal: tanggalBaru, wilayah: wilayahBaru });
    if (periode) q.set('tahun', String(periode.tahun));
    router.replace(`/dashboard/posko/${slug}/input?${q.toString()}`);
  }

  function ubahPenyakit(jenis: string, indeks: number, nilai: string) {
    setKotor(true);
    setPenyakit((lama) => ({ ...lama, [jenis]: lama[jenis].map((v, i) => (i === indeks ? nilai : v)) }));
  }

  async function simpan() {
    setPesan(null);
    const dataPenyakit = Object.fromEntries(DAFTAR_PENYAKIT.map((j) => [j, penyakit[j].map(angka)]));
    const dataPtm = Object.fromEntries(DAFTAR_PTM.map((j) => [j, angka(ptm[j])]));
    const semua = [...Object.values(dataPenyakit).flat(), ...Object.values(dataPtm), angka(klbJumlah)];
    if (!semua.every(bilanganBulat)) {
      setPesan({ ok: false, teks: 'Semua angka harus bilangan bulat 0 atau lebih (tanpa koma atau minus).' });
      return;
    }
    setMenyimpan(true);
    try {
      const hasil = await simpanInputHarianPosko({
        posko, tanggal, wilayah,
        penyakit: dataPenyakit,
        klbJumlah: angka(klbJumlah),
        klbKeterangan: klbKet,
        ptm: dataPtm,
      });
      setPesan({ ok: hasil.ok, teks: hasil.pesan });
      if (hasil.ok) {
        setKotor(false);
        router.refresh();
      }
    } catch (err) {
      setPesan({ ok: false, teks: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setMenyimpan(false);
    }
  }

  const kotakAngka = 'w-14 rounded border border-gray-300 px-1.5 py-1 text-right text-xs text-gray-800';

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div>
        <Link href={`/dashboard/posko/${slug}${periode ? `?tahun=${periode.tahun}` : ''}`} className="text-sm font-medium text-[#0F4C5C] hover:underline">
          ← Kembali ke Dashboard {judul}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-[#0F2A38]">Input Data Harian {judul}</h1>
        <p className="text-xs text-gray-500">Penyakit potensial KLB, kejadian KLB, dan penyakit tidak menular per tanggal dan wilayah kerja.</p>
      </div>

      {catatan.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {catatan.map((c) => (<p key={c}>{c}</p>))}
        </div>
      )}

      {!bolehKelola ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-600">
          Input data posko hanya untuk Admin, Petugas, atau Petugas Klinik.{' '}
          <Link href="/login" className="font-semibold text-[#0F4C5C] hover:underline">Masuk</Link> terlebih dulu.
        </p>
      ) : !periode ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-600">
          Periode posko belum diatur. Atur periode di{' '}
          <Link href={`/dashboard/posko/${slug}`} className="font-semibold text-[#0F4C5C] hover:underline">dashboard {judul}</Link>.
        </p>
      ) : !tanggalMaks ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-600">
          Posko belum dimulai (mulai {tanggalPanjang(periode.tanggalMulai)}). Data bisa diinput mulai tanggal tersebut.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <label className="text-xs text-gray-600">
              Tanggal
              <input
                type="date"
                value={tanggal}
                min={periode.tanggalMulai}
                max={tanggalMaks}
                onChange={(e) => e.target.value && pindah(e.target.value, wilayah)}
                className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              Wilayah kerja
              <select
                value={wilayah}
                onChange={(e) => pindah(tanggal, e.target.value)}
                className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                {WILAYAH_POSKO.map((w) => (<option key={w} value={w}>{w}</option>))}
              </select>
            </label>
            <p className="pb-1 text-xs text-gray-500">
              Periode {tanggalPanjang(periode.tanggalMulai)} – {tanggalPanjang(periode.tanggalSelesai)}
            </p>
          </div>

          <p
            className={`rounded-lg px-4 py-2 text-xs ${
              awal?.adaData ? 'border border-blue-200 bg-blue-50 text-blue-800' : 'border border-gray-200 bg-gray-50 text-gray-600'
            }`}
          >
            {awal?.adaData
              ? `Data ${wilayah} tanggal ${tanggalPanjang(tanggal)} sudah ada — Anda sedang mengedit.`
              : `Belum ada data ${wilayah} untuk ${tanggalPanjang(tanggal)}. Kolom yang dikosongkan disimpan sebagai 0.`}
          </p>

          {/* PENYAKIT POTENSIAL KLB */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-800">Penyakit Potensial KLB</h2>
              <p className="text-xs text-gray-500">
                Total kasus <strong>{total.kasus}</strong> · meninggal <strong className={total.mati > 0 ? 'text-[#B71C1C]' : ''}>{total.mati}</strong>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th rowSpan={2} className="px-2 py-2 text-left">No</th>
                    <th rowSpan={2} className="px-2 py-2 text-left">Jenis Penyakit</th>
                    <th colSpan={4} className="border-l border-gray-200 px-2 py-1 text-center">Kasus</th>
                    <th colSpan={4} className="border-l border-gray-200 px-2 py-1 text-center">Meninggal</th>
                  </tr>
                  <tr className="bg-gray-50 text-gray-600">
                    {[...KOLOM, ...KOLOM].map((h, i) => (
                      <th key={`${h}${i}`} className={`px-1 py-1 text-center ${i % 4 === 0 ? 'border-l border-gray-200' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAFTAR_PENYAKIT.map((jenis, no) => (
                    <tr key={jenis} className="border-t border-gray-100">
                      <td className="px-2 py-1 text-gray-500">{no + 1}</td>
                      <td className="px-2 py-1 text-gray-800">{jenis}</td>
                      {penyakit[jenis].map((nilai, i) => (
                        <td key={i} className={`px-1 py-1 text-center ${i % 4 === 0 ? 'border-l border-gray-100' : ''}`}>
                          <input
                            type="number" min={0} step={1} inputMode="numeric" placeholder="0"
                            value={nilai}
                            onChange={(e) => ubahPenyakit(jenis, i, e.target.value)}
                            className={kotakAngka}
                            aria-label={`${jenis} ${i < 4 ? 'kasus' : 'meninggal'} ${KOLOM[i % 4]}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">L = laki-laki, P = perempuan; &lt;5 = kurang dari 5 tahun, ≥5 = 5 tahun ke atas.</p>
          </div>

          {/* KLB */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-gray-800">Kejadian KLB Hari Ini</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-600">
                Jumlah kejadian KLB
                <input
                  type="number" min={0} step={1} inputMode="numeric" placeholder="0"
                  value={klbJumlah}
                  onChange={(e) => { setKotor(true); setKlbJumlah(e.target.value); }}
                  className="mt-1 block w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="min-w-[16rem] flex-1 text-xs text-gray-600">
                Keterangan (opsional)
                <input
                  value={klbKet}
                  maxLength={300}
                  onChange={(e) => { setKotor(true); setKlbKet(e.target.value); }}
                  placeholder="mis. keracunan pangan di ..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          </div>

          {/* PTM */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-gray-800">Penyakit Tidak Menular</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {DAFTAR_PTM.map((jenis) => (
                <label key={jenis} className="flex items-center justify-between gap-3 text-xs text-gray-700">
                  {jenis}
                  <input
                    type="number" min={0} step={1} inputMode="numeric" placeholder="0"
                    value={ptm[jenis]}
                    onChange={(e) => { setKotor(true); setPtm((lama) => ({ ...lama, [jenis]: e.target.value })); }}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-md">
            <button
              type="button"
              onClick={simpan}
              disabled={menyimpan}
              className="rounded-md bg-[#0F4C5C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
            >
              {menyimpan ? 'Menyimpan…' : `Simpan Data ${wilayah}`}
            </button>
            {kotor && !pesan && <span className="text-xs text-amber-700">Ada perubahan yang belum disimpan.</span>}
            {pesan && <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-700'}`}>{pesan.teks}</span>}
          </div>
        </>
      )}
    </div>
  );
}
