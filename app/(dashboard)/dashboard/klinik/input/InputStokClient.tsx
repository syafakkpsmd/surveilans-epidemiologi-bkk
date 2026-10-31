'use client';

import { useCallback, useEffect, useState } from 'react';
import { JENIS_STOK_INPUT } from '@/lib/klinik/stok-input';

type Tab = 'form' | 'unggah' | 'daftar';
interface Saldo { jenis: string; sisa: number; tanggal: string }
interface BarisStok { tanggal: string; masuk: number; terbit: number; rusak: number; sisa: number; keterangan: string; sumber: string }
interface Daftar { total: number; ukuran: number; baris: BarisStok[] }
interface Pratinjau {
  jumlahBaris: number; sah: number; ditolak: number; akanBaru: number; akanDiganti: number;
  galat: { baris: number; pesan: string[] }[]; galatTerpotong: boolean; peringatan: { baris: number; pesan: string[] }[];
}
interface Riwayat { id: string; nama_file: string; jumlah_masuk: number; jumlah_ditolak: number; dibuat_oleh: string | null; dibuat_pada: string }

const kls = {
  input: 'w-full rounded border border-gray-300 px-2 py-1 text-sm',
  tombol: 'rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  putih: 'rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50',
  kartu: 'mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
};
const labelJenis = (k: string) => JENIS_STOK_INPUT.find((j) => j.kunci === k)?.label ?? k;
const satuan = (k: string) => JENIS_STOK_INPUT.find((j) => j.kunci === k)?.satuan ?? '';
const tglId = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const waktuWita = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(d) + ' WITA';
};
/** Tanggal hari ini menurut WITA (yyyy-mm-dd), bukan zona perangkat. */
const hariIniWita = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());

async function panggil<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; galat?: string[]; sudahAda?: boolean } }> {
  const r = await fetch(url, { cache: 'no-store', ...init });
  return { ok: r.ok, status: r.status, data: (await r.json().catch(() => ({}))) as T & { error?: string; galat?: string[]; sudahAda?: boolean } };
}

function PilihJenis({ nilai, onUbah, kosong }: { nilai: string; onUbah: (v: string) => void; kosong?: string }) {
  return (
    <select className={kls.input} value={nilai} onChange={(e) => onUbah(e.target.value)}>
      {kosong !== undefined && <option value="">{kosong}</option>}
      <optgroup label="Buku ICV / e-ICV">{JENIS_STOK_INPUT.filter((j) => j.kelompok === 'buku').map((j) => <option key={j.kunci} value={j.kunci}>{j.label}</option>)}</optgroup>
      <optgroup label="Vaksin">{JENIS_STOK_INPUT.filter((j) => j.kelompok === 'vaksin').map((j) => <option key={j.kunci} value={j.kunci}>{j.label}</option>)}</optgroup>
    </select>
  );
}

export default function InputStokClient({ klinikId, namaKlinik }: { klinikId: string; namaKlinik: string }) {
  const [tab, setTab] = useState<Tab>('form');
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [saldo, setSaldo] = useState<Saldo[]>([]);

  const [jenis, setJenis] = useState('e-icv');
  const [tanggal, setTanggal] = useState(hariIniWita());
  const [masuk, setMasuk] = useState('');
  const [terbit, setTerbit] = useState('');
  const [rusak, setRusak] = useState('');
  const [ket, setKet] = useState('');
  const [galatForm, setGalatForm] = useState<string[]>([]);

  const [jenisDaftar, setJenisDaftar] = useState('e-icv');
  const [halaman, setHalaman] = useState(1);
  const [daftar, setDaftar] = useState<Daftar | null>(null);

  const [jenisBawaan, setJenisBawaan] = useState('');
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);

  const muatSaldo = useCallback(async () => {
    const r = await panggil<{ saldo: Saldo[] }>(`/api/klinik/stok/input/saldo?klinik=${klinikId}`);
    if (r.ok) setSaldo(r.data.saldo);
  }, [klinikId]);
  const muatDaftar = useCallback(async () => {
    const r = await panggil<Daftar>(`/api/klinik/stok/input/daftar?klinik=${klinikId}&jenis=${jenisDaftar}&halaman=${halaman}`);
    if (r.ok) setDaftar(r.data); else setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memuat daftar' });
  }, [klinikId, jenisDaftar, halaman]);
  const muatRiwayat = useCallback(async () => {
    const r = await panggil<{ riwayat: Riwayat[] }>(`/api/klinik/stok/input/riwayat?klinik=${klinikId}`);
    if (r.ok) setRiwayat(r.data.riwayat);
  }, [klinikId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatSaldo(); }, [muatSaldo]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatDaftar(); }, [muatDaftar]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatRiwayat(); }, [muatRiwayat]);

  const segarkan = () => { void muatSaldo(); void muatDaftar(); void muatRiwayat(); };

  async function kirimForm(ganti: boolean) {
    setSibuk(true); setGalatForm([]); setPesan(null);
    const r = await panggil<{ peringatan?: string[] }>('/api/klinik/stok/input/baris', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klinikId, ganti, nilai: { jenis, tanggal, masuk, terbit, rusak, keterangan: ket } }),
    });
    setSibuk(false);
    if (r.status === 409 && r.data.sudahAda) {
      if (window.confirm(`Data ${labelJenis(jenis)} tanggal ${tglId(tanggal)} sudah ada. Ganti dengan isian ini?`)) void kirimForm(true);
      return;
    }
    if (!r.ok) { setGalatForm(r.data.galat ?? [r.data.error ?? 'Gagal menyimpan']); return; }
    setPesan({ jenis: 'ok', teks: `Stok ${labelJenis(jenis)} tanggal ${tglId(tanggal)} tersimpan.` });
    setMasuk(''); setTerbit(''); setRusak(''); setKet('');
    setJenisDaftar(jenis); setHalaman(1);
    segarkan();
  }

  async function kirimBerkas(mode: 'pratinjau' | 'simpan') {
    if (!berkas) return;
    setSibuk(true); setPesan(null);
    const fd = new FormData();
    fd.set('file', berkas); fd.set('klinikId', klinikId); fd.set('mode', mode);
    if (jenisBawaan) fd.set('jenisBawaan', jenisBawaan);
    const r = await panggil<Pratinjau & { baru?: number; diganti?: number; ditolak?: number }>('/api/klinik/stok/input/unggah', { method: 'POST', body: fd });
    setSibuk(false);
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memproses berkas' }); if (mode === 'pratinjau') setPratinjau(null); return; }
    if (mode === 'pratinjau') { setPratinjau(r.data); return; }
    setPesan({ jenis: 'ok', teks: `Tersimpan: ${r.data.baru} hari baru, ${r.data.diganti} hari diganti, ${r.data.ditolak} ditolak.` });
    setBerkas(null); setPratinjau(null);
    segarkan();
  }

  async function hapus(url: string, tanya: string) {
    if (!window.confirm(tanya)) return;
    const r = await panggil<{ dihapus: number }>(url, { method: 'DELETE' });
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal menghapus' }); return; }
    setPesan({ jenis: 'ok', teks: `${r.data.dihapus} baris dihapus.` });
    segarkan();
  }

  const tombolTab = (t: Tab, label: string) => (
    <button key={t} onClick={() => { setTab(t); setPesan(null); }} className={tab === t ? kls.tombol : kls.putih}>{label}</button>
  );
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.ukuran)) : 1;
  const saldoJenis = saldo.find((s) => s.jenis === jenis);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">{tombolTab('form', 'Input Stok')}{tombolTab('unggah', 'Unggah Excel')}{tombolTab('daftar', 'Riwayat Stok')}</div>

      {saldo.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {saldo.map((s) => (
            <div key={s.jenis} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
              <div className="text-xs text-gray-500">{labelJenis(s.jenis)}</div>
              <div className="font-semibold">{s.sisa} <span className="text-xs font-normal text-gray-500">{satuan(s.jenis)} · per {tglId(s.tanggal)}</span></div>
            </div>
          ))}
        </div>
      )}

      {pesan && <div role="status" className={`mb-4 rounded border p-3 text-sm ${pesan.jenis === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>{pesan.teks}</div>}

      {tab === 'form' && (
        <section className={kls.kartu}>
          <h2 className="mb-3 font-medium">Catatan stok harian — {namaKlinik}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Jenis stok *<br /><PilihJenis nilai={jenis} onUbah={setJenis} /></label>
            <label className="text-sm">Tanggal *<br /><input className={kls.input} type="date" value={tanggal} max={hariIniWita()} onChange={(e) => setTanggal(e.target.value)} /></label>
            <div className="text-sm">Sisa terakhir<br /><div className="py-1 font-semibold">{saldoJenis ? `${saldoJenis.sisa} ${satuan(jenis)} (per ${tglId(saldoJenis.tanggal)})` : 'Belum ada catatan'}</div></div>
            <label className="text-sm">Stok masuk<br /><input className={kls.input} type="number" min={0} step={1} value={masuk} onChange={(e) => setMasuk(e.target.value)} /></label>
            <label className="text-sm">Terbit / dipakai<br /><input className={kls.input} type="number" min={0} step={1} value={terbit} onChange={(e) => setTerbit(e.target.value)} /></label>
            <label className="text-sm">Rusak<br /><input className={kls.input} type="number" min={0} step={1} value={rusak} onChange={(e) => setRusak(e.target.value)} /></label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">Keterangan<br /><input className={kls.input} maxLength={500} value={ket} onChange={(e) => setKet(e.target.value)} /></label>
          </div>
          {galatForm.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-red-700">{galatForm.map((g) => <li key={g}>{g}</li>)}</ul>}
          <button className={`${kls.tombol} mt-4`} disabled={sibuk} onClick={() => void kirimForm(false)}>Simpan</button>
          <p className="mt-2 text-xs text-gray-500">
            Sisa dihitung otomatis: sisa kemarin + stok masuk − terbit − rusak. Stok awal klinik diisi sebagai <b>Stok masuk</b> pada tanggal mulai memakai aplikasi.
            Satu baris per tanggal per jenis; mengisi tanggal yang sudah ada akan menawarkan penggantian. Isian yang membuat sisa negatif ditolak.
          </p>
        </section>
      )}

      {tab === 'unggah' && (
        <>
          <section className={kls.kartu}>
            <h2 className="mb-2 font-medium">Unggah Excel stok — {namaKlinik}</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">Jenis stok (bila berkas tanpa kolom Jenis Stok)<br />
                <PilihJenis nilai={jenisBawaan} onUbah={(v) => { setJenisBawaan(v); setPratinjau(null); }} kosong="— ikuti kolom berkas —" />
              </label>
              <label className="text-sm">Berkas (.xlsx / .xls)<br />
                <input type="file" accept=".xlsx,.xls" className="text-sm" onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPratinjau(null); setPesan(null); }} />
              </label>
              <button className={kls.putih} disabled={!berkas || sibuk} onClick={() => void kirimBerkas('pratinjau')}>Periksa berkas</button>
              {/* unduhan berkas, bukan navigasi halaman */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className={kls.putih} href="/api/klinik/stok/input/template">Unduh template</a>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Judul tab Sheets lama dikenali (Stok Pelayanan, E-ICV Terbit, Vaksin Terbit, Vaksin Rusak); kolom Sisa diabaikan karena dihitung ulang.
              Baris yang hanya berisi tanggal (sisa templat) dilewati. Tanggal yang sudah terisi akan <b>diganti</b> oleh isi berkas; unggahan yang membuat sisa negatif ditolak seluruhnya.
            </p>
            {pratinjau && (
              <div className="mt-4 text-sm">
                <p>Baris data: <b>{pratinjau.jumlahBaris}</b> · sah: <b className="text-green-700">{pratinjau.sah}</b> · ditolak: <b className="text-red-700">{pratinjau.ditolak}</b> · hari baru: <b>{pratinjau.akanBaru}</b> · hari diganti: <b className="text-amber-700">{pratinjau.akanDiganti}</b></p>
                {pratinjau.galat.length > 0 && (
                  <div className="mt-2 max-h-56 overflow-auto rounded border border-red-200 bg-red-50 p-2">
                    {pratinjau.galat.map((g) => <div key={g.baris}>Baris {g.baris}: {g.pesan.join('; ')}</div>)}
                    {pratinjau.galatTerpotong && <div className="mt-1 italic">Daftar dipotong; perbaiki lalu periksa ulang.</div>}
                  </div>
                )}
                {pratinjau.peringatan.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-amber-800">
                    {pratinjau.peringatan.map((g) => <div key={g.baris}>Baris {g.baris}: {g.pesan.join('; ')}</div>)}
                  </div>
                )}
                <button className={`${kls.tombol} mt-3`} disabled={sibuk || pratinjau.sah === 0} onClick={() => void kirimBerkas('simpan')}>
                  Simpan {pratinjau.sah} baris{pratinjau.ditolak ? ` (lewati ${pratinjau.ditolak} yang ditolak)` : ''}
                </button>
              </div>
            )}
          </section>
          <section className={kls.kartu}>
            <h2 className="mb-2 font-medium">Riwayat unggahan</h2>
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="px-2 py-1">Waktu</th><th className="px-2 py-1">Oleh</th><th className="px-2 py-1">Berkas</th><th className="px-2 py-1">Hari</th><th className="px-2 py-1">Ditolak</th><th /></tr></thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-2 py-1">{waktuWita(r.dibuat_pada)}</td><td className="px-2 py-1">{r.dibuat_oleh}</td><td className="px-2 py-1">{r.nama_file}</td>
                    <td className="px-2 py-1">{r.jumlah_masuk}</td><td className="px-2 py-1">{r.jumlah_ditolak}</td>
                    <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => void hapus(`/api/klinik/stok/input/batch?klinik=${klinikId}&id=${r.id}`, `Batalkan unggahan ini? Hari-hari yang dimasukkannya dihapus dan sisa dihitung ulang. Hari lama yang sempat diganti tidak kembali.`)}>Batalkan</button></td>
                  </tr>
                ))}
                {riwayat.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={6}>Belum ada unggahan.</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'daftar' && (
        <section className={kls.kartu}>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <label>Jenis stok <PilihJenis nilai={jenisDaftar} onUbah={(v) => { setJenisDaftar(v); setHalaman(1); }} /></label>
            <span className="text-gray-500">{daftar ? `${daftar.total} hari tercatat (diinput lewat aplikasi)` : 'Memuat…'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b bg-gray-50">{['Tanggal', 'Stok masuk', 'Terbit', 'Rusak', 'Sisa', 'Keterangan', 'Sumber', ''].map((h) => <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {daftar?.baris.map((b) => (
                  <tr key={b.tanggal} className="border-b">
                    <td className="px-2 py-1">{tglId(b.tanggal)}</td><td className="px-2 py-1">{b.masuk || ''}</td><td className="px-2 py-1">{b.terbit}</td><td className="px-2 py-1">{b.rusak || ''}</td>
                    <td className="px-2 py-1 font-semibold">{b.sisa}</td><td className="px-2 py-1">{b.keterangan}</td><td className="px-2 py-1">{b.sumber === 'upload' ? 'Excel' : 'Form'}</td>
                    <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => void hapus(`/api/klinik/stok/input/baris?klinik=${klinikId}&jenis=${jenisDaftar}&tanggal=${b.tanggal}`, `Hapus catatan ${labelJenis(jenisDaftar)} tanggal ${tglId(b.tanggal)}? Sisa hari berikutnya dihitung ulang.`)}>Hapus</button></td>
                  </tr>
                ))}
                {daftar && daftar.baris.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={8}>Belum ada catatan untuk jenis ini.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button className={kls.putih} disabled={halaman <= 1} onClick={() => setHalaman(halaman - 1)}>Sebelumnya</button>
            <span>Halaman {halaman} dari {totalHalaman}</span>
            <button className={kls.putih} disabled={halaman >= totalHalaman} onClick={() => setHalaman(halaman + 1)}>Berikutnya</button>
          </div>
        </section>
      )}
    </div>
  );
}
