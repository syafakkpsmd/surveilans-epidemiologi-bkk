'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ModulInput } from '@/lib/input-data/modul';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

type Baris = Record<string, string | number | null>;
interface Pratinjau {
  mode: 'pratinjau' | 'simpan';
  jumlahBaris: number; sah: number; ditolak: number; akanDiganti: number;
  wilayah: string[]; kolomDiabaikan: string[];
  galat: { baris: number; pesan: string[] }[]; galatTerpotong: boolean;
  masuk?: number; diganti?: number;
}
interface Riwayat {
  id: string; tahun: number | null; sumber: string; nama_file: string | null;
  jumlah_baris: number; jumlah_masuk: number; jumlah_ditolak: number; jumlah_diganti: number;
  dibuat_oleh: string | null; dibuat_pada: string;
}

const TAHUN_INI = new Date().getFullYear();
const PILIHAN_TAHUN = Array.from({ length: 7 }, (_, i) => TAHUN_INI + 1 - i); // tahun+1 ... tahun-5
const WILKER_KAPAL = WILAYAH_KERJA.filter((w) => w.jenis === 'Pelabuhan');
const kls = {
  input: 'rounded border border-gray-300 px-2 py-1 text-sm',
  tombol: 'rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  tombolPutih: 'rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50',
  kartu: 'mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
};

// Waktu tersimpan UTC; tampil WITA (UTC+8).
function waktuWita(s: string): string {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(d) + ' WITA';
}

async function panggil<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const r = await fetch(url, { cache: 'no-store', ...init });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  return { ok: r.ok, data };
}

export default function InputDataClient({ modul, role }: { modul: ModulInput[]; role: string }) {
  const [kunci, setKunci] = useState(modul[0].kunci);
  const m = useMemo(() => modul.find((x) => x.kunci === kunci) ?? modul[0], [modul, kunci]);
  const admin = role === 'admin';

  // ----- Unggah
  const [tahunUnggah, setTahunUnggah] = useState(TAHUN_INI);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  // ----- Daftar
  const [fTahun, setFTahun] = useState('');
  const [fWilayah, setFWilayah] = useState('');
  const [fSumber, setFSumber] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [daftar, setDaftar] = useState<{ total: number; baris: Baris[]; ukuran: number } | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);

  // ----- Form
  const [bukaForm, setBukaForm] = useState(false);
  const [isian, setIsian] = useState<Record<string, string>>({});
  const [galatForm, setGalatForm] = useState<string[]>([]);

  const dasar = `/api/input-data/${m.kunci}`;

  const muatDaftar = useCallback(async () => {
    const p = new URLSearchParams({ halaman: String(halaman) });
    if (fTahun) p.set('tahun', fTahun);
    if (fWilayah) p.set('wilayah', fWilayah);
    if (fSumber) p.set('sumber', fSumber);
    const r = await panggil<{ total: number; baris: Baris[]; ukuran: number }>(`${dasar}/data?${p}`);
    if (r.ok) setDaftar(r.data); else setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memuat data' });
  }, [dasar, halaman, fTahun, fWilayah, fSumber]);

  const muatRiwayat = useCallback(async () => {
    const r = await panggil<{ riwayat: Riwayat[] }>(`${dasar}/riwayat`);
    if (r.ok) setRiwayat(r.data.riwayat);
  }, [dasar]);

  // Pengambilan data dari server: setState terjadi setelah await, bukan sinkron.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatDaftar(); }, [muatDaftar]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatRiwayat(); }, [muatRiwayat]);

  function pilihModul(k: string) {
    setKunci(k); setBerkas(null); setPratinjau(null); setPesan(null); setHalaman(1); setIsian({}); setGalatForm([]);
  }

  async function kirimBerkas(mode: 'pratinjau' | 'simpan') {
    if (!berkas) return;
    setSibuk(true); setPesan(null);
    const fd = new FormData();
    fd.set('file', berkas); fd.set('tahun', String(tahunUnggah)); fd.set('mode', mode);
    const r = await panggil<Pratinjau>(`${dasar}/unggah`, { method: 'POST', body: fd });
    setSibuk(false);
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memproses berkas' }); if (mode === 'pratinjau') setPratinjau(null); return; }
    setPratinjau(r.data);
    if (mode === 'simpan') {
      setPesan({ jenis: 'ok', teks: `Tersimpan: ${r.data.masuk} baris masuk, ${r.data.diganti} baris lama diganti, ${r.data.ditolak} ditolak.` });
      setBerkas(null); setPratinjau(null);
      void muatDaftar(); void muatRiwayat();
    }
  }

  async function simpanForm() {
    setSibuk(true); setGalatForm([]); setPesan(null);
    const r = await panggil<{ galat?: string[] }>(`${dasar}/baris`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nilai: isian }),
    });
    setSibuk(false);
    if (!r.ok) { setGalatForm(r.data.galat ?? [r.data.error ?? 'Gagal menyimpan']); return; }
    setPesan({ jenis: 'ok', teks: 'Data tersimpan.' }); setIsian({}); void muatDaftar();
  }

  async function hapus(jenis: 'baris' | 'batch', id: string, konfirmasi: string) {
    if (!window.confirm(konfirmasi)) return;
    const r = await panggil<{ dihapus: number }>(`${dasar}/${jenis}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal menghapus' }); return; }
    setPesan({ jenis: 'ok', teks: `${r.data.dihapus} baris dihapus.` });
    void muatDaftar(); void muatRiwayat();
  }

  const labelKolom = (nama: string) => m.kolom.find((k) => k.nama === nama)?.label ?? nama;
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.ukuran)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold">Input Data</h1>
      <p className="mb-4 text-sm text-gray-600">Unggah Excel atau isi form. Data yang tersimpan langsung dipakai dasbor.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {modul.map((x) => (
          <button key={x.kunci} onClick={() => pilihModul(x.kunci)}
            className={x.kunci === kunci ? kls.tombol : kls.tombolPutih}>{x.label}</button>
        ))}
      </div>

      {pesan && (
        <div role="status" className={`mb-4 rounded border p-3 text-sm ${pesan.jenis === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {pesan.teks}
        </div>
      )}

      {/* ---------- Unggah Excel ---------- */}
      <section className={kls.kartu}>
        <h2 className="mb-2 font-medium">Unggah Excel — {m.label}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Tahun data<br />
            <select className={kls.input} value={tahunUnggah} onChange={(e) => { setTahunUnggah(Number(e.target.value)); setPratinjau(null); }}>
              {PILIHAN_TAHUN.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm">Berkas (.xlsx)<br />
            <input type="file" accept=".xlsx" className="text-sm"
              onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPratinjau(null); setPesan(null); }} />
          </label>
          <button className={kls.tombolPutih} disabled={!berkas || sibuk} onClick={() => kirimBerkas('pratinjau')}>Periksa berkas</button>
          <a className={kls.tombolPutih} href={`${dasar}/template`}>Unduh template</a>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Menyimpan akan <b>mengganti</b> data {m.label} untuk wilayah kerja yang ada di berkas pada tahun {tahunUnggah}; unggah ulang tidak menggandakan data.
        </p>

        {pratinjau && (
          <div className="mt-4 text-sm">
            <p>
              Baris data: <b>{pratinjau.jumlahBaris}</b> · sah: <b className="text-green-700">{pratinjau.sah}</b> · ditolak: <b className="text-red-700">{pratinjau.ditolak}</b>
              {' '}· wilayah: {pratinjau.wilayah.join(', ') || '-'}
            </p>
            {pratinjau.akanDiganti > 0 && <p className="mt-1 text-amber-700">{pratinjau.akanDiganti} baris yang sudah ada akan diganti.</p>}
            {pratinjau.kolomDiabaikan.length > 0 && <p className="mt-1 text-gray-500">Kolom diabaikan: {pratinjau.kolomDiabaikan.join(', ')}</p>}
            {pratinjau.galat.length > 0 && (
              <div className="mt-2 max-h-56 overflow-auto rounded border border-red-200 bg-red-50 p-2">
                {pratinjau.galat.map((g) => <div key={g.baris}>Baris {g.baris}: {g.pesan.join('; ')}</div>)}
                {pratinjau.galatTerpotong && <div className="mt-1 italic">Daftar dipotong; perbaiki lalu periksa ulang.</div>}
              </div>
            )}
            <div className="mt-3">
              <button className={kls.tombol} disabled={sibuk || pratinjau.sah === 0} onClick={() => kirimBerkas('simpan')}>
                Simpan {pratinjau.sah} baris{pratinjau.ditolak ? ` (lewati ${pratinjau.ditolak} yang ditolak)` : ''}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Form ---------- */}
      <section className={kls.kartu}>
        <button className="font-medium" onClick={() => setBukaForm((v) => !v)}>{bukaForm ? '▾' : '▸'} Tambah satu data lewat form</button>
        {bukaForm && (
          <div className="mt-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {m.kolom.map((k) => (
                <label key={k.nama} className="text-sm">{k.label}{k.wajib ? ' *' : ''}<br />
                  {k.tipe === 'wilker' ? (
                    <select className={`${kls.input} w-full`} value={isian[k.nama] ?? ''} onChange={(e) => setIsian({ ...isian, [k.nama]: e.target.value })}>
                      <option value="">— pilih —</option>
                      {WILKER_KAPAL.filter((w) => m.wilayahBoleh.includes(w.kode)).map((w) => <option key={w.kode} value={w.kode}>{w.namaPendek}</option>)}
                    </select>
                  ) : k.tipe === 'rba' ? (
                    <select className={`${kls.input} w-full`} value={isian[k.nama] ?? ''} onChange={(e) => setIsian({ ...isian, [k.nama]: e.target.value })}>
                      <option value="">—</option><option>Hijau</option><option>Kuning</option><option>Merah</option>
                    </select>
                  ) : (
                    <input className={`${kls.input} w-full`} type={k.tipe === 'tanggal' ? 'date' : k.tipe === 'bilangan' ? 'number' : 'text'}
                      min={k.tipe === 'bilangan' ? 0 : undefined} value={isian[k.nama] ?? ''}
                      onChange={(e) => setIsian({ ...isian, [k.nama]: e.target.value })} />
                  )}
                </label>
              ))}
            </div>
            {galatForm.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-red-700">{galatForm.map((g) => <li key={g}>{g}</li>)}</ul>}
            <button className={`${kls.tombol} mt-3`} disabled={sibuk} onClick={simpanForm}>Simpan data</button>
          </div>
        )}
      </section>

      {/* ---------- Daftar data ---------- */}
      <section className={kls.kartu}>
        <h2 className="mb-2 font-medium">Daftar data — {m.label}</h2>
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          <select className={kls.input} value={fTahun} onChange={(e) => { setFTahun(e.target.value); setHalaman(1); }}>
            <option value="">Semua tahun</option>{PILIHAN_TAHUN.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={kls.input} value={fWilayah} onChange={(e) => { setFWilayah(e.target.value); setHalaman(1); }}>
            <option value="">Semua wilayah</option>
            {WILKER_KAPAL.filter((w) => m.wilayahBoleh.includes(w.kode)).map((w) => <option key={w.kode} value={w.namaPendek}>{w.namaPendek}</option>)}
          </select>
          <select className={kls.input} value={fSumber} onChange={(e) => { setFSumber(e.target.value); setHalaman(1); }}>
            <option value="">Semua sumber</option><option value="migrasi">Migrasi lama</option><option value="input">Form</option><option value="upload">Unggah Excel</option>
          </select>
          <span className="self-center text-gray-500">{daftar ? `${daftar.total} baris` : 'Memuat…'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b bg-gray-50">
              {m.kolomDaftar.map((c) => <th key={c} className="px-2 py-1 font-medium">{labelKolom(c)}</th>)}
              <th className="px-2 py-1 font-medium">Sumber</th>{admin && <th />}
            </tr></thead>
            <tbody>
              {daftar?.baris.map((b) => (
                <tr key={String(b.id)} className="border-b">
                  {m.kolomDaftar.map((c) => <td key={c} className="px-2 py-1">{b[c] ?? ''}</td>)}
                  <td className="px-2 py-1">{b.sumber}</td>
                  {admin && <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => hapus('baris', String(b.id), 'Hapus baris ini?')}>Hapus</button></td>}
                </tr>
              ))}
              {daftar && daftar.baris.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={m.kolomDaftar.length + 2}>Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button className={kls.tombolPutih} disabled={halaman <= 1} onClick={() => setHalaman(halaman - 1)}>Sebelumnya</button>
          <span>Halaman {halaman} dari {totalHalaman}</span>
          <button className={kls.tombolPutih} disabled={halaman >= totalHalaman} onClick={() => setHalaman(halaman + 1)}>Berikutnya</button>
        </div>
      </section>

      {/* ---------- Riwayat ---------- */}
      <section className={kls.kartu}>
        <h2 className="mb-2 font-medium">Riwayat unggahan</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="px-2 py-1 font-medium">Waktu</th><th className="px-2 py-1 font-medium">Oleh</th><th className="px-2 py-1 font-medium">Berkas</th>
              <th className="px-2 py-1 font-medium">Tahun</th><th className="px-2 py-1 font-medium">Masuk</th><th className="px-2 py-1 font-medium">Ditolak</th><th className="px-2 py-1 font-medium">Diganti</th>{admin && <th />}
            </tr></thead>
            <tbody>
              {riwayat.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-2 py-1">{waktuWita(r.dibuat_pada)}</td><td className="px-2 py-1">{r.dibuat_oleh}</td><td className="px-2 py-1">{r.nama_file}</td>
                  <td className="px-2 py-1">{r.tahun}</td><td className="px-2 py-1">{r.jumlah_masuk}</td><td className="px-2 py-1">{r.jumlah_ditolak}</td><td className="px-2 py-1">{r.jumlah_diganti}</td>
                  {admin && <td className="px-2 py-1"><button className="text-red-600 hover:underline"
                    onClick={() => hapus('batch', r.id, `Batalkan unggahan ini? ${r.jumlah_masuk} baris yang dimasukkannya akan dihapus. Baris lama yang sempat diganti TIDAK kembali; unggah ulang berkas sebelumnya bila perlu.`)}>Batalkan</button></td>}
                </tr>
              ))}
              {riwayat.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={8}>Belum ada unggahan.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
