'use client';

import { useCallback, useEffect, useState } from 'react';

interface Baris { id: number; nama_pelabuhan: string; negara: string }
interface Belum { pelabuhan: string; jumlah: number }
interface PratinjauMaster {
  jumlahBaris: number; sah: number; ditolak: number; galat: { baris: number; pesan: string }[]; disimpan: boolean;
}

const kls = {
  input: 'rounded border border-gray-300 px-2 py-1 text-sm',
  tombol: 'rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  tombolPutih: 'rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50',
};

async function panggil<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const r = await fetch(url, { cache: 'no-store', ...init });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  return { ok: r.ok, data };
}

export default function MasterNegara({ admin, onPesan, onBerubah }: {
  admin: boolean;
  onPesan: (jenis: 'ok' | 'galat', teks: string) => void;
  onBerubah: () => void;
}) {
  const dasar = '/api/input-data/master-negara';
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [daftar, setDaftar] = useState<{ total: number; baris: Baris[]; ukuran: number } | null>(null);
  const [belum, setBelum] = useState<Belum[]>([]);
  const [nama, setNama] = useState('');
  const [negara, setNegara] = useState('');
  const [isianBelum, setIsianBelum] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<PratinjauMaster | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    const r = await panggil<{ total: number; baris: Baris[]; ukuran: number }>(`${dasar}/daftar?cari=${encodeURIComponent(cari)}&halaman=${halaman}`);
    if (r.ok) setDaftar(r.data);
    const b = await panggil<{ belum: Belum[] }>(`${dasar}/belum`);
    if (b.ok) setBelum(b.data.belum);
  }, [cari, halaman]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muat(); }, [muat]);

  async function simpan(n: string, g: string) {
    setSibuk(true);
    const r = await panggil<{ ok: boolean }>(`${dasar}/simpan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: n, negara: g }) });
    setSibuk(false);
    if (!r.ok) { onPesan('galat', r.data.error ?? 'Gagal menyimpan'); return false; }
    return true;
  }

  async function tambah() {
    if (await simpan(nama, negara)) { setNama(''); setNegara(''); onPesan('ok', 'Master tersimpan.'); void muat(); }
  }

  async function simpanBelum(p: string) {
    const g = (isianBelum[p] ?? '').trim();
    if (!g) return;
    if (await simpan(p, g)) { setIsianBelum((x) => ({ ...x, [p]: '' })); onPesan('ok', `"${p}" ditambahkan ke master. Klik "Terapkan ke data COP" agar data lama ikut terisi.`); void muat(); }
  }

  async function terapkan() {
    setSibuk(true);
    const r = await panggil<{ terisi: number }>(`${dasar}/terapkan`, { method: 'POST' });
    setSibuk(false);
    if (!r.ok) { onPesan('galat', r.data.error ?? 'Gagal menerapkan'); return; }
    onPesan('ok', `${r.data.terisi} baris COP terisi negara kedatangannya.`);
    void muat(); onBerubah();
  }

  async function kirim(mode: 'pratinjau' | 'simpan') {
    if (!berkas) return;
    setSibuk(true);
    const fd = new FormData(); fd.set('file', berkas); fd.set('mode', mode);
    const r = await panggil<PratinjauMaster>(`${dasar}/unggah`, { method: 'POST', body: fd });
    setSibuk(false);
    if (!r.ok) { onPesan('galat', r.data.error ?? 'Gagal memproses berkas'); setPratinjau(null); return; }
    if (mode === 'simpan') { onPesan('ok', `${r.data.sah} pelabuhan tersimpan ke master.`); setBerkas(null); setPratinjau(null); void muat(); }
    else setPratinjau(r.data);
  }

  async function hapus(b: Baris) {
    if (!window.confirm(`Hapus "${b.nama_pelabuhan}" dari master? Data COP yang sudah terisi negaranya tidak berubah.`)) return;
    const r = await panggil<{ dihapus: number }>(`${dasar}/hapus?id=${b.id}`, { method: 'DELETE' });
    if (!r.ok) onPesan('galat', r.data.error ?? 'Gagal menghapus'); else void muat();
  }

  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.ukuran)) : 1;

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        Master ini dipakai bersama oleh semua wilayah kerja: saat data COP masuk, <b>Negara Kedatangan</b> terisi otomatis dari <b>Pelabuhan Kedatangan</b>
        (mis. “Qingdao” → China). Nama dicocokkan tanpa memperhatikan huruf besar/kecil, spasi, dan tanda baca; “Pasir Gudang, Johor” juga dicoba sebagai “Pasir Gudang”.
      </p>

      {belum.length > 0 && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <div className="mb-2 font-medium">Pelabuhan di data COP yang belum ada di master ({belum.length})</div>
          <div className="max-h-64 overflow-auto">
            {belum.map((b) => (
              <div key={b.pelabuhan} className="mb-1 flex flex-wrap items-center gap-2">
                <span className="min-w-[14rem]">{b.pelabuhan} <span className="text-gray-500">({b.jumlah} kapal)</span></span>
                <input className={kls.input} placeholder="Negara" value={isianBelum[b.pelabuhan] ?? ''}
                  onChange={(e) => setIsianBelum((x) => ({ ...x, [b.pelabuhan]: e.target.value }))} />
                <button className={kls.tombolPutih} disabled={sibuk || !(isianBelum[b.pelabuhan] ?? '').trim()} onClick={() => simpanBelum(b.pelabuhan)}>Simpan</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">Nama pelabuhan<br /><input className={kls.input} value={nama} onChange={(e) => setNama(e.target.value)} /></label>
        <label className="text-sm">Negara<br /><input className={kls.input} value={negara} onChange={(e) => setNegara(e.target.value)} /></label>
        <button className={kls.tombol} disabled={sibuk || !nama.trim() || !negara.trim()} onClick={tambah}>Tambah / ubah</button>
        <button className={kls.tombolPutih} disabled={sibuk} onClick={terapkan}>Terapkan ke data COP yang kosong</button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label>Unggah daftar dari Excel (kolom “Nama Pelabuhan” dan “Negara”)<br />
          <input type="file" accept=".xlsx,.xls,.html,.htm" onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPratinjau(null); }} />
        </label>
        <button className={kls.tombolPutih} disabled={!berkas || sibuk} onClick={() => kirim('pratinjau')}>Periksa berkas</button>
        {pratinjau && <button className={kls.tombol} disabled={sibuk || pratinjau.sah === 0} onClick={() => kirim('simpan')}>Simpan {pratinjau.sah} pelabuhan</button>}
      </div>
      {pratinjau && (
        <p className="mb-3 text-sm">Baris: {pratinjau.jumlahBaris} · sah: <b className="text-green-700">{pratinjau.sah}</b> · ditolak: <b className="text-red-700">{pratinjau.ditolak}</b>
          {pratinjau.galat.slice(0, 20).map((g) => <span key={g.baris} className="block text-red-700">Baris {g.baris}: {g.pesan}</span>)}
        </p>
      )}

      <input className={`${kls.input} mb-2`} placeholder="Cari pelabuhan atau negara…" value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(1); }} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b bg-gray-50"><th className="px-2 py-1 font-medium">Nama pelabuhan</th><th className="px-2 py-1 font-medium">Negara</th>{admin && <th />}</tr></thead>
          <tbody>
            {daftar?.baris.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="px-2 py-1">{b.nama_pelabuhan}</td><td className="px-2 py-1">{b.negara}</td>
                {admin && <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => hapus(b)}>Hapus</button></td>}
              </tr>
            ))}
            {daftar && daftar.baris.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={3}>Belum ada data master.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button className={kls.tombolPutih} disabled={halaman <= 1} onClick={() => setHalaman(halaman - 1)}>Sebelumnya</button>
        <span>Halaman {halaman} dari {totalHalaman} · {daftar?.total ?? 0} pelabuhan</span>
        <button className={kls.tombolPutih} disabled={halaman >= totalHalaman} onClick={() => setHalaman(halaman + 1)}>Berikutnya</button>
      </div>
    </div>
  );
}
