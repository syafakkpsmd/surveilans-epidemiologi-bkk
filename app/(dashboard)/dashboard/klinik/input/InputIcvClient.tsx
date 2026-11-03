'use client';

import { useCallback, useEffect, useState } from 'react';
import { MAKS_KOMORBID, MAKS_VAKSIN, OPSI_KOMORBID, OPSI_LAYANAN, OPSI_VAKSIN } from '@/lib/klinik/icv-input';

type Baris = { id: number; noBaris: number; sumber: string; batchId: string | null; data: Record<string, string> };
interface Daftar { total: number; ukuran: number; baris: Baris[] }
interface Pratinjau {
  jumlahBaris: number; sah: number; ditolak: number; akanMasuk: number; akanDilewati: number;
  galat: { baris: number; pesan: string[] }[]; galatTerpotong: boolean; peringatan: { baris: number; pesan: string[] }[];
}
interface Riwayat { id: string; nama_file: string; jumlah_masuk: number; jumlah_ditolak: number; dibuat_oleh: string | null; dibuat_pada: string }
type Tab = 'form' | 'unggah' | 'daftar';

const LAINNYA = '__lainnya__';
const kls = {
  input: 'w-full rounded border border-gray-300 px-2 py-1 text-sm',
  tombol: 'rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  putih: 'rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50',
  kartu: 'mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
};

async function panggil<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string; galat?: string[] } }> {
  const r = await fetch(url, { cache: 'no-store', ...init });
  return { ok: r.ok, data: (await r.json().catch(() => ({}))) as T & { error?: string; galat?: string[] } };
}

const waktuWita = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(d) + ' WITA';
};

interface Isian {
  noDok: string; tglTerbit: string; nama: string; tglLahir: string; jk: string; kebangsaan: string; paspor: string; nik: string;
  tglBerangkat: string; hp: string; email: string; wus: string; hasilWus: string; kontra: string; masaMM: string; kipi: string;
  layanan: string; travel: string; petugasTravel: string; hpTravel: string; ket: string;
}
const KOSONG: Isian = {
  noDok: '', tglTerbit: '', nama: '', tglLahir: '', jk: '', kebangsaan: 'Indonesia', paspor: '', nik: '', tglBerangkat: '', hp: '', email: '',
  wus: '', hasilWus: '', kontra: '', masaMM: '', kipi: 'Tidak', layanan: 'Vaksinasi', travel: '', petugasTravel: '', hpTravel: '', ket: '',
};

/** Tanggal input type=date (yyyy-mm-dd) -> dd/mm/yyyy yang dibaca server tanpa ambigu. */
const dd = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);

function PilihDaftar({ nilai, onUbah, opsi, placeholder }: { nilai: string; onUbah: (v: string) => void; opsi: readonly string[]; placeholder: string }) {
  const dalamDaftar = nilai === '' || opsi.includes(nilai);
  const [bebas, setBebas] = useState(!dalamDaftar);
  return (
    <div className="flex gap-2">
      <select className={kls.input} value={bebas ? LAINNYA : nilai}
        onChange={(e) => { if (e.target.value === LAINNYA) { setBebas(true); onUbah(''); } else { setBebas(false); onUbah(e.target.value); } }}>
        <option value="">{placeholder}</option>
        {opsi.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={LAINNYA}>Lainnya (ketik sendiri)…</option>
      </select>
      {bebas && <input className={kls.input} placeholder="Ketik nama" value={nilai} onChange={(e) => onUbah(e.target.value)} />}
    </div>
  );
}

export default function InputIcvClient({ klinikId, namaKlinik }: { klinikId: string; namaKlinik: string }) {
  const [tab, setTab] = useState<Tab>('form');
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [f, setF] = useState<Isian>(KOSONG);
  const [vaksin, setVaksin] = useState<string[]>(['']);
  const [komorbid, setKomorbid] = useState<string[]>([]);
  const [galatForm, setGalatForm] = useState<string[]>([]);
  const [peringatanForm, setPeringatanForm] = useState<string[]>([]);

  const [q, setQ] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [daftar, setDaftar] = useState<Daftar | null>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);

  const ubah = (k: keyof Isian) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const teks = (k: keyof Isian, tipe = 'text') => (
    <input className={kls.input} type={tipe} value={f[k]} onChange={(e) => ubah(k)(e.target.value)} />
  );

  const muatDaftar = useCallback(async () => {
    const p = new URLSearchParams({ klinik: klinikId, halaman: String(halaman) });
    if (q.trim()) p.set('q', q.trim());
    const r = await panggil<Daftar>(`/api/klinik/icv/daftar?${p}`);
    if (r.ok) setDaftar(r.data); else setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memuat daftar' });
  }, [klinikId, halaman, q]);
  const muatRiwayat = useCallback(async () => {
    const r = await panggil<{ riwayat: Riwayat[] }>(`/api/klinik/icv/riwayat?klinik=${klinikId}`);
    if (r.ok) setRiwayat(r.data.riwayat);
  }, [klinikId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatDaftar(); }, [muatDaftar]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatRiwayat(); }, [muatRiwayat]);

  async function simpanForm() {
    setSibuk(true); setGalatForm([]); setPeringatanForm([]); setPesan(null);
    const nilai: Record<string, string> = {
      'No Dokumen ICV / e-ICV': f.noDok, 'Tanggal Terbit': dd(f.tglTerbit), 'Nama': f.nama, 'Tanggal Lahir': dd(f.tglLahir), 'Jenis Kelamin': f.jk,
      'Kebangsaan': f.kebangsaan, 'No Paspor': f.paspor, 'NIK': f.nik, 'Tanggal Berangkat': dd(f.tglBerangkat), 'No HP': f.hp, 'Email': f.email,
      'WUS': f.wus, 'Hasil WUS': f.hasilWus, 'Kontraindikasi': f.kontra, 'Masa Berlaku MM Sampai': dd(f.masaMM), 'KIPI': f.kipi,
      'Jenis Layanan': f.layanan, 'Nama Travel': f.travel, 'Nama Petugas Travel': f.petugasTravel, 'No HP Travel': f.hpTravel, 'Keterangan': f.ket,
    };
    vaksin.forEach((v, i) => { nilai[`Jenis Vaksin ${i + 1}`] = v; });
    komorbid.forEach((v, i) => { nilai[`Komorbid ${i + 1}`] = v; });
    const r = await panggil<{ peringatan?: string[] }>('/api/klinik/icv/baris', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ klinikId, nilai }),
    });
    setSibuk(false);
    if (!r.ok) { setGalatForm(r.data.galat ?? [r.data.error ?? 'Gagal menyimpan']); return; }
    setPesan({ jenis: 'ok', teks: `Data ${f.nama} tersimpan.` });
    setPeringatanForm(r.data.peringatan ?? []);
    setF({ ...KOSONG, tglTerbit: f.tglTerbit, layanan: f.layanan, travel: f.travel, petugasTravel: f.petugasTravel, hpTravel: f.hpTravel }); // tanggal terbit & travel dipertahankan untuk input berurutan
    setVaksin(['']); setKomorbid([]);
    void muatDaftar();
  }

  async function kirimBerkas(mode: 'pratinjau' | 'simpan') {
    if (!berkas) return;
    setSibuk(true); setPesan(null);
    const fd = new FormData();
    fd.set('file', berkas); fd.set('klinikId', klinikId); fd.set('mode', mode);
    const r = await panggil<Pratinjau & { baru?: number; dilewati?: number; ditolak?: number }>('/api/klinik/icv/unggah', { method: 'POST', body: fd });
    setSibuk(false);
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memproses berkas' }); if (mode === 'pratinjau') setPratinjau(null); return; }
    if (mode === 'pratinjau') { setPratinjau(r.data); return; }
    setPesan({ jenis: 'ok', teks: `Tersimpan: ${r.data.baru} baris baru, ${r.data.dilewati} dilewati (nomor dokumen sudah ada), ${r.data.ditolak} ditolak.` });
    setBerkas(null); setPratinjau(null);
    void muatDaftar(); void muatRiwayat();
  }

  async function hapus(jenis: 'baris' | 'batch', id: string | number, tanya: string) {
    if (!window.confirm(tanya)) return;
    const r = await panggil<{ dihapus: number }>(`/api/klinik/icv/${jenis}?klinik=${klinikId}&id=${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal menghapus' }); return; }
    setPesan({ jenis: 'ok', teks: `${r.data.dihapus} baris dihapus.` });
    void muatDaftar(); void muatRiwayat();
  }

  const tombolTab = (t: Tab, label: string) => (
    <button key={t} onClick={() => { setTab(t); setPesan(null); }} className={tab === t ? kls.tombol : kls.putih}>{label}</button>
  );
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.ukuran)) : 1;

  return (
    <div>
      <div className="mb-4"><div className="flex gap-2">{tombolTab('form', 'Input Data')}{tombolTab('unggah', 'Unggah Excel')}{tombolTab('daftar', 'Daftar Data')}</div></div>

      {pesan && <div role="status" className={`mb-4 rounded border p-3 text-sm ${pesan.jenis === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>{pesan.teks}</div>}

      {tab === 'form' && (
        <section className={kls.kartu}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Jenis Layanan *<br />
              <select className={kls.input} value={f.layanan} onChange={(e) => ubah('layanan')(e.target.value)}>{OPSI_LAYANAN.map((o) => <option key={o}>{o}</option>)}</select>
            </label>
            <label className="text-sm">No Dokumen ICV / e-ICV *<br />{teks('noDok')}</label>
            <label className="text-sm">Tanggal Terbit *<br />{teks('tglTerbit', 'date')}</label>
            <label className="text-sm">Nama *<br />{teks('nama')}</label>
            <label className="text-sm">Tanggal Lahir *<br />{teks('tglLahir', 'date')}</label>
            <label className="text-sm">Jenis Kelamin *<br />
              <select className={kls.input} value={f.jk} onChange={(e) => ubah('jk')(e.target.value)}><option value="">— pilih —</option><option>Laki-laki</option><option>Perempuan</option></select>
            </label>
            <label className="text-sm">Kebangsaan<br />{teks('kebangsaan')}</label>
            <label className="text-sm">No Paspor<br />{teks('paspor')}</label>
            <label className="text-sm">NIK<br />{teks('nik')}</label>
            <label className="text-sm">Tanggal Berangkat<br />{teks('tglBerangkat', 'date')}</label>
            <label className="text-sm">No HP<br />{teks('hp', 'tel')}</label>
            <label className="text-sm">Email<br />{teks('email', 'email')}</label>
            {f.jk === 'Perempuan' && (
              <>
                <label className="text-sm">WUS<br />
                  <select className={kls.input} value={f.wus} onChange={(e) => ubah('wus')(e.target.value)}><option value="">— pilih —</option><option>Ya</option><option>Tidak</option></select>
                </label>
                {f.wus === 'Ya' && <label className="text-sm">Hasil WUS<br />{teks('hasilWus')}</label>}
              </>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="mb-1 text-sm font-medium">Jenis Vaksin (maksimal {MAKS_VAKSIN}){f.layanan === 'Vaksinasi' ? ' *' : ''}</h2>
              {vaksin.map((v, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <span className="w-5 pt-1 text-sm">{i + 1}.</span>
                  <div className="flex-1"><PilihDaftar nilai={v} placeholder="— pilih vaksin —" opsi={OPSI_VAKSIN.filter((o) => o === v || !vaksin.includes(o))}
                    onUbah={(x) => setVaksin(vaksin.map((y, j) => (j === i ? x : y)))} /></div>
                  {vaksin.length > 1 && <button className="text-sm text-red-600" onClick={() => setVaksin(vaksin.filter((_, j) => j !== i))}>Hapus</button>}
                </div>
              ))}
              {vaksin.length < MAKS_VAKSIN && <button className={kls.putih} onClick={() => setVaksin([...vaksin, ''])}>+ Tambah vaksin</button>}
            </div>
            <div>
              <h2 className="mb-1 text-sm font-medium">Komorbid (satu penyakit per isian, maksimal {MAKS_KOMORBID})</h2>
              {komorbid.length === 0 && <p className="mb-2 text-sm text-gray-500">Tidak ada komorbid. Klik tombol di bawah bila ada.</p>}
              {komorbid.map((v, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <span className="w-5 pt-1 text-sm">{i + 1}.</span>
                  <div className="flex-1"><PilihDaftar nilai={v} placeholder="— pilih penyakit —" opsi={OPSI_KOMORBID.filter((o) => o === v || !komorbid.includes(o))}
                    onUbah={(x) => setKomorbid(komorbid.map((y, j) => (j === i ? x : y)))} /></div>
                  <button className="text-sm text-red-600" onClick={() => setKomorbid(komorbid.filter((_, j) => j !== i))}>Hapus</button>
                </div>
              ))}
              {komorbid.length < MAKS_KOMORBID && <button className={kls.putih} onClick={() => setKomorbid([...komorbid, ''])}>+ Tambah komorbid</button>}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Kontraindikasi<br /><input className={kls.input} placeholder="-" value={f.kontra} onChange={(e) => ubah('kontra')(e.target.value)} /></label>
            <label className="text-sm">Masa Berlaku MM Sampai<br />{teks('masaMM', 'date')}</label>
            <label className="text-sm">KIPI<br />
              <select className={kls.input} value={f.kipi} onChange={(e) => ubah('kipi')(e.target.value)}><option>Tidak</option><option>Ya</option></select>
            </label>
            <label className="text-sm">Nama Travel<br />{teks('travel')}</label>
            <label className="text-sm">Nama Petugas Travel<br />{teks('petugasTravel')}</label>
            <label className="text-sm">No HP Travel<br />{teks('hpTravel', 'tel')}</label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">Keterangan<br />{teks('ket')}</label>
          </div>

          {galatForm.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-red-700">{galatForm.map((g) => <li key={g}>{g}</li>)}</ul>}
          {peringatanForm.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-700">{peringatanForm.map((g) => <li key={g}>{g}</li>)}</ul>}
          <button className={`${kls.tombol} mt-4`} disabled={sibuk} onClick={simpanForm}>Simpan data</button>
          <p className="mt-2 text-xs text-gray-500">Kolom bertanda * wajib diisi. Nomor dokumen yang sama tidak bisa dimasukkan dua kali di klinik yang sama.</p>
        </section>
      )}

      {tab === 'unggah' && (
        <>
          <section className={kls.kartu}>
            <h2 className="mb-2 font-medium">Unggah Excel — {namaKlinik}</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">Berkas (.xlsx / .xls)<br />
                <input type="file" accept=".xlsx,.xls" className="text-sm" onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPratinjau(null); setPesan(null); }} />
              </label>
              <button className={kls.putih} disabled={!berkas || sibuk} onClick={() => kirimBerkas('pratinjau')}>Periksa berkas</button>
              {/* unduhan berkas, bukan navigasi halaman */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className={kls.putih} href="/api/klinik/icv/template">Unduh template</a>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Judul kolom sama dengan sheet lama (baris judul laporan di atasnya dilewati). Tanggal boleh berbentuk 27/10/2026, 27 Oktober 2026, atau tanggal Excel; bila satu kolom bercampur gaya hari/bulan dan bulan/hari, berkas ditolak.
              Nomor dokumen yang sudah ada <b>dilewati</b> (tidak menimpa data yang mungkin sudah dikoreksi). Kolom NIK harus berformat Teks.
            </p>
            {pratinjau && (
              <div className="mt-4 text-sm">
                <p>Baris data: <b>{pratinjau.jumlahBaris}</b> · sah: <b className="text-green-700">{pratinjau.sah}</b> · ditolak: <b className="text-red-700">{pratinjau.ditolak}</b> · akan masuk: <b>{pratinjau.akanMasuk}</b> · dilewati (sudah ada): <b>{pratinjau.akanDilewati}</b></p>
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
                <button className={`${kls.tombol} mt-3`} disabled={sibuk || pratinjau.akanMasuk === 0} onClick={() => kirimBerkas('simpan')}>
                  Simpan {pratinjau.akanMasuk} baris baru{pratinjau.ditolak ? ` (lewati ${pratinjau.ditolak} yang ditolak)` : ''}
                </button>
              </div>
            )}
          </section>
          <section className={kls.kartu}>
            <h2 className="mb-2 font-medium">Riwayat unggahan</h2>
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="px-2 py-1">Waktu</th><th className="px-2 py-1">Oleh</th><th className="px-2 py-1">Berkas</th><th className="px-2 py-1">Masuk</th><th className="px-2 py-1">Ditolak</th><th /></tr></thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-2 py-1">{waktuWita(r.dibuat_pada)}</td><td className="px-2 py-1">{r.dibuat_oleh}</td><td className="px-2 py-1">{r.nama_file}</td>
                    <td className="px-2 py-1">{r.jumlah_masuk}</td><td className="px-2 py-1">{r.jumlah_ditolak}</td>
                    <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => hapus('batch', r.id, `Batalkan unggahan ini? ${r.jumlah_masuk} baris yang dimasukkannya akan dihapus.`)}>Batalkan</button></td>
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
            <input className={`${kls.input} max-w-xs`} placeholder="Cari nama / NIK / nomor dokumen" value={q} onChange={(e) => { setQ(e.target.value); setHalaman(1); }} />
            <span className="text-gray-500">{daftar ? `${daftar.total} baris (diinput lewat aplikasi)` : 'Memuat…'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b bg-gray-50">
                {['Tanggal Terbit', 'No Dokumen', 'Nama', 'Vaksin', 'Layanan', 'Sumber', ''].map((h) => <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {daftar?.baris.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="px-2 py-1">{b.data['Tanggal Terbit']}</td><td className="px-2 py-1">{b.data['No Dokumen ICV / e-ICV']}</td><td className="px-2 py-1">{b.data['Nama']}</td>
                    <td className="px-2 py-1">{[1, 2, 3].map((i) => b.data[`Jenis Vaksin ${i}`]).filter(Boolean).join(', ')}</td>
                    <td className="px-2 py-1">{b.data['Jenis Layanan']}</td><td className="px-2 py-1">{b.sumber === 'upload' ? 'Excel' : 'Form'}</td>
                    <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => hapus('baris', b.id, `Hapus data ${b.data['Nama']}?`)}>Hapus</button></td>
                  </tr>
                ))}
                {daftar && daftar.baris.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={7}>Belum ada data yang diinput lewat aplikasi.</td></tr>}
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
