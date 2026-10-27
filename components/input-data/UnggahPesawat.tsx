'use client';

// components/input-data/UnggahPesawat.tsx
// Unggah Excel: pilih file -> Periksa (pratinjau, tidak menulis apa pun) -> Simpan baris yang siap.

import { useState } from 'react';
import { simpanUnggahPesawat } from '@/app/(dashboard)/dashboard/input-data/pesawat/actions';
import type { HasilBaris } from '@/lib/db/modul/inputPesawat';

interface Pratinjau {
  peringatan: string[];
  ringkasan: { total: number; siap: number; duplikat: number; galat: number; rencana: number };
  baris: HasilBaris[];
}

const LABEL_STATUS = {
  siap: { teks: 'Siap', kelas: 'bg-green-100 text-green-800' },
  duplikat: { teks: 'Sudah ada', kelas: 'bg-gray-100 text-gray-700' },
  galat: { teks: 'Galat', kelas: 'bg-red-100 text-red-800' },
} as const;

export default function UnggahPesawat() {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [pesan, setPesan] = useState<{ sukses: boolean; teks: string } | null>(null);
  const [kunciInput, setKunciInput] = useState(0);

  async function periksa() {
    if (!berkas) return;
    setMemeriksa(true);
    setPesan(null);
    setPratinjau(null);
    try {
      const f = new FormData();
      f.set('file', berkas);
      const res = await fetch('/api/input-data/pesawat/periksa', { method: 'POST', body: f });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setPesan({ sukses: false, teks: json.error ?? 'Gagal memeriksa file.' });
      else setPratinjau(json as Pratinjau);
    } catch {
      setPesan({ sukses: false, teks: 'Gagal menghubungi server. Periksa koneksi lalu coba lagi.' });
    } finally {
      setMemeriksa(false);
    }
  }

  async function simpan() {
    if (!pratinjau) return;
    setMenyimpan(true);
    setPesan(null);
    // Kirim hanya baris yang siap; server tetap memvalidasi ulang dan mengecek duplikat.
    const kirim = pratinjau.baris.filter((b) => b.status === 'siap').map((b) => b.data);
    const res = await simpanUnggahPesawat(kirim);
    setMenyimpan(false);
    if (res.sukses) {
      setPesan({ sukses: true, teks: res.pesan });
      setPratinjau(null);
      setBerkas(null);
      setKunciInput((k) => k + 1);
    } else {
      setPesan({ sukses: false, teks: res.error });
    }
  }

  const r = pratinjau?.ringkasan;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[#EEF1F4] p-4 text-sm text-gray-700">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Unduh <a href="/api/input-data/pesawat/template" className="font-semibold text-[#0F4C5C] underline">template Excel</a> dan isi
            mulai baris 2 (petunjuk ada di sheet &ldquo;Petunjuk&rdquo;).
          </li>
          <li>Pilih file, klik <b>Periksa File</b>. Belum ada yang disimpan pada langkah ini.</li>
          <li>Cek hasilnya, lalu klik <b>Simpan</b>. Baris yang sudah ada dilewati, jadi aman mengunggah file yang sama dua kali.</li>
        </ol>
        <p className="mt-2 text-xs text-gray-500">Maksimum 2.000 baris dan 2 MB per file, format .xlsx.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          key={kunciInput}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setBerkas(e.target.files?.[0] ?? null);
            setPratinjau(null);
            setPesan(null);
          }}
          className="text-sm"
          aria-label="File Excel data pesawat"
        />
        <button
          type="button"
          onClick={periksa}
          disabled={!berkas || memeriksa || menyimpan}
          className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {memeriksa ? 'Memeriksa...' : 'Periksa File'}
        </button>
      </div>

      {pesan && (
        <div role="status" className={`rounded-lg p-3 text-sm ${pesan.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {pesan.teks}
        </div>
      )}

      {pratinjau && r && (
        <div className="space-y-3">
          {pratinjau.peringatan.map((p) => (
            <div key={p} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{p}</div>
          ))}

          <p className="text-sm text-gray-700">
            <b>{r.total}</b> baris dibaca: <span className="text-green-700">{r.siap} siap</span>
            {r.rencana > 0 && <> (termasuk {r.rencana} Rencana)</>}, {r.duplikat} sudah ada,{' '}
            <span className={r.galat > 0 ? 'text-red-700' : ''}>{r.galat} galat</span>.
          </p>

          <div className="max-h-96 overflow-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Maskapai</th>
                  <th className="px-3 py-2">Rute</th>
                  <th className="px-3 py-2 text-right">Penumpang B/D</th>
                  <th className="px-3 py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {pratinjau.baris.map((b) => {
                  const s = LABEL_STATUS[b.status];
                  const d = b.data;
                  return (
                    <tr key={b.nomor} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2">{b.nomor}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.kelas}`}>{s.teks}</span></td>
                      <td className="whitespace-nowrap px-3 py-2">{d?.tanggal ?? '-'}</td>
                      <td className="px-3 py-2">{d?.maskapai ?? '-'}</td>
                      <td className="px-3 py-2">{d ? `${d.keberangkatan ?? '-'} / ${d.kedatangan ?? '-'}` : '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{d ? `${d.penumpang_berangkat} / ${d.penumpang_datang}` : '-'}</td>
                      <td className="px-3 py-2 text-xs text-red-700">
                        {b.galat?.join(' ')}
                        {d?.status_data === 'rencana' && <span className="text-amber-700">Rencana</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={simpan}
            disabled={menyimpan || r.siap === 0}
            className="rounded-lg bg-[#0F4C5C] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {menyimpan ? 'Menyimpan...' : `Simpan ${r.siap} Baris`}
          </button>
          {r.galat > 0 && (
            <p className="text-xs text-gray-500">Baris galat tidak ikut disimpan. Perbaiki di Excel lalu unggah ulang; baris yang sudah tersimpan akan dilewati.</p>
          )}
        </div>
      )}
    </div>
  );
}
