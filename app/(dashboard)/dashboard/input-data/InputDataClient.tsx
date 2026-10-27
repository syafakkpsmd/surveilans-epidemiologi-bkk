'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LABEL_RBA, type KolomModul, type ModulInput } from '@/lib/input-data/modul';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';
import MasterNegara from './MasterNegara';

type Baris = Record<string, string | number | null>;
interface Pratinjau {
  mode: 'pratinjau' | 'simpan';
  jumlahBaris: number; sah: number; ditolak: number; baru: number; diperbarui: number;
  wilayah: string[]; kolomDiabaikan: string[]; negaraTerisi: number; pelabuhanTanpaMaster: string[];
  galat: { baris: number; pesan: string[] }[]; galatTerpotong: boolean;
}
interface Riwayat {
  id: string; tahun: number | null; sumber: string; nama_file: string | null;
  jumlah_baris: number; jumlah_masuk: number; jumlah_ditolak: number; jumlah_diganti: number;
  dibuat_oleh: string | null; dibuat_pada: string;
}

const TAHUN_INI = new Date().getFullYear();
const PILIHAN_TAHUN = Array.from({ length: 7 }, (_, i) => TAHUN_INI + 1 - i); // tahun+1 ... tahun-5
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const LAINNYA = '__lainnya__';
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

async function panggil<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string; perluWilayah?: boolean } }> {
  const r = await fetch(url, { cache: 'no-store', ...init });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; perluWilayah?: boolean };
  return { ok: r.ok, data };
}

/** Dropdown isian manual (RBA, faktor risiko, ...). "Lainnya…" membuka isian teks bebas untuk kolom non-RBA. */
function PilihanManual({ kolom, nilai, opsi, onUbah, disabled }: {
  kolom: KolomModul; nilai: string; opsi: string[]; onUbah: (v: string) => void; disabled?: boolean;
}) {
  const daftar = nilai && !opsi.some((o) => o.toLowerCase() === nilai.toLowerCase()) ? [...opsi, nilai] : opsi;
  return (
    <select className={`${kls.input} max-w-[11rem]`} disabled={disabled} value={nilai}
      onChange={(e) => {
        const v = e.target.value;
        if (v === LAINNYA) {
          const t = window.prompt(`${kolom.label}: ketik pilihan baru`)?.trim();
          if (t) onUbah(t);
        } else onUbah(v);
      }}>
      <option value="">—</option>
      {daftar.map((o) => <option key={o} value={o}>{kolom.tipe === 'rba' ? (LABEL_RBA[o] ?? o) : o}</option>)}
      {kolom.tipe !== 'rba' && <option value={LAINNYA}>Lainnya…</option>}
    </select>
  );
}

export default function InputDataClient({ modul, role }: { modul: ModulInput[]; role: string }) {
  const [kunci, setKunci] = useState(modul[0].kunci); // atau 'master'
  const adaCop = modul.some((x) => x.kunci === 'cop');
  const m = useMemo(() => modul.find((x) => x.kunci === kunci) ?? modul[0], [modul, kunci]);
  const admin = role === 'admin';
  const kolomManual = useMemo(() => m.kolom.filter((k) => k.manual), [m]);
  const wilayahModul = useMemo(() => WILAYAH_KERJA.filter((w) => m.wilayahBoleh.includes(w.kode)), [m]);

  // ----- Unggah
  const [tahunUnggah, setTahunUnggah] = useState(TAHUN_INI);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [wilayahUnggah, setWilayahUnggah] = useState('');
  const [perluWilayah, setPerluWilayah] = useState(false);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  // ----- Daftar
  const [fTahun, setFTahun] = useState(String(TAHUN_INI));
  const [fBulan, setFBulan] = useState('');
  const [fWilayah, setFWilayah] = useState('');
  const [fSumber, setFSumber] = useState('');
  const [fBelum, setFBelum] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const [daftar, setDaftar] = useState<{ total: number; baris: Baris[]; ukuran: number } | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [pilihan, setPilihan] = useState<Record<string, string[]>>({});

  // ----- Form
  const [bukaForm, setBukaForm] = useState(false);
  const [isian, setIsian] = useState<Record<string, string>>({});
  const [galatForm, setGalatForm] = useState<string[]>([]);

  const dasar = `/api/input-data/${m.kunci}`;
  const mode = kunci === 'master' ? 'master' : 'modul';

  const muatDaftar = useCallback(async () => {
    if (mode === 'master') return;
    const p = new URLSearchParams({ halaman: String(halaman) });
    if (fTahun) p.set('tahun', fTahun);
    if (fBulan) p.set('bulan', fBulan);
    if (fWilayah) p.set('wilayah', fWilayah);
    if (fSumber) p.set('sumber', fSumber);
    if (fBelum) p.set('belum', '1');
    const r = await panggil<{ total: number; baris: Baris[]; ukuran: number }>(`${dasar}/data?${p}`);
    if (r.ok) setDaftar(r.data); else setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memuat data' });
  }, [dasar, mode, halaman, fTahun, fBulan, fWilayah, fSumber, fBelum]);

  const muatRiwayat = useCallback(async () => {
    if (mode === 'master') return;
    const r = await panggil<{ riwayat: Riwayat[] }>(`${dasar}/riwayat`);
    if (r.ok) setRiwayat(r.data.riwayat);
  }, [dasar, mode]);

  const muatPilihan = useCallback(async () => {
    if (mode === 'master') return;
    const r = await panggil<{ pilihan: Record<string, string[]> }>(`${dasar}/pilihan`);
    if (r.ok) setPilihan(r.data.pilihan);
  }, [dasar, mode]);

  // Pengambilan data dari server: setState terjadi setelah await, bukan sinkron.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatDaftar(); }, [muatDaftar]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatRiwayat(); }, [muatRiwayat]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muatPilihan(); }, [muatPilihan]);

  function pilihModul(k: string) {
    setKunci(k); setBerkas(null); setPratinjau(null); setPesan(null); setHalaman(1); setIsian({}); setGalatForm([]);
    setFWilayah(''); setFBulan(''); setFSumber(''); setFBelum(false); setPerluWilayah(false); setWilayahUnggah('');
  }

  async function kirimBerkas(mod: 'pratinjau' | 'simpan') {
    if (!berkas) return;
    setSibuk(true); setPesan(null);
    const fd = new FormData();
    fd.set('file', berkas); fd.set('tahun', String(tahunUnggah)); fd.set('mode', mod);
    if (wilayahUnggah) fd.set('wilayah', wilayahUnggah);
    const r = await panggil<Pratinjau>(`${dasar}/unggah`, { method: 'POST', body: fd });
    setSibuk(false);
    if (!r.ok) {
      setPerluWilayah(!!r.data.perluWilayah);
      setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal memproses berkas' });
      if (mod === 'pratinjau') setPratinjau(null);
      return;
    }
    setPerluWilayah(false);
    setPratinjau(r.data);
    if (mod === 'simpan') {
      setPesan({ jenis: 'ok', teks: `Tersimpan: ${r.data.baru} baris baru, ${r.data.diperbarui} baris diperbarui, ${r.data.ditolak} ditolak.` });
      setBerkas(null); setPratinjau(null);
      void muatDaftar(); void muatRiwayat(); void muatPilihan();
    }
  }

  async function simpanForm() {
    setSibuk(true); setGalatForm([]); setPesan(null);
    const r = await panggil<{ galat?: string[] }>(`${dasar}/baris`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nilai: isian }),
    });
    setSibuk(false);
    if (!r.ok) { setGalatForm(r.data.galat ?? [r.data.error ?? 'Gagal menyimpan']); return; }
    setPesan({ jenis: 'ok', teks: 'Data tersimpan.' }); setIsian({}); void muatDaftar(); void muatPilihan();
  }

  async function ubahManual(id: string, kolom: string, nilai: string) {
    const lama = daftar?.baris.find((b) => String(b.id) === id)?.[kolom] ?? null;
    setDaftar((d) => d && { ...d, baris: d.baris.map((b) => (String(b.id) === id ? { ...b, [kolom]: nilai || null } : b)) });
    const r = await panggil<{ ok: boolean }>(`${dasar}/ubah`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nilai: { [kolom]: nilai } }),
    });
    if (!r.ok) {
      setDaftar((d) => d && { ...d, baris: d.baris.map((b) => (String(b.id) === id ? { ...b, [kolom]: lama } : b)) });
      setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal menyimpan isian' });
    } else if (nilai && !(pilihan[kolom] ?? []).some((o) => o.toLowerCase() === nilai.toLowerCase())) void muatPilihan();
  }

  async function hapus(jenis: 'baris' | 'batch', id: string, konfirmasi: string) {
    if (!window.confirm(konfirmasi)) return;
    const r = await panggil<{ dihapus: number }>(`${dasar}/${jenis}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) { setPesan({ jenis: 'galat', teks: r.data.error ?? 'Gagal menghapus' }); return; }
    setPesan({ jenis: 'ok', teks: `${r.data.dihapus} baris dihapus.` });
    void muatDaftar(); void muatRiwayat();
  }

  const labelKolom = (nama: string) => m.kolom.find((k) => k.nama === nama)?.label ?? nama;
  const kolomTabel = [...m.kolomDaftar];
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.ukuran)) : 1;
  const kolomForm = m.kolom.filter((k) => !k.arsip);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold">Input Data</h1>
      <p className="mb-4 text-sm text-gray-600">Unggah Excel (termasuk ekspor Sinkarkes) atau isi form. Isian petugas (RBA dst.) diisi langsung di daftar.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {modul.map((x) => (
          <button key={x.kunci} onClick={() => pilihModul(x.kunci)} className={x.kunci === kunci ? kls.tombol : kls.tombolPutih}>{x.label}</button>
        ))}
        {adaCop && <button onClick={() => pilihModul('master')} className={mode === 'master' ? kls.tombol : kls.tombolPutih}>Master Negara Kedatangan</button>}
      </div>

      {pesan && (
        <div role="status" className={`mb-4 rounded border p-3 text-sm ${pesan.jenis === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {pesan.teks}
        </div>
      )}

      {mode === 'master' ? (
        <section className={kls.kartu}>
          <h2 className="mb-2 font-medium">Master Negara Kedatangan</h2>
          <MasterNegara admin={admin} onPesan={(jenis, teks) => setPesan({ jenis, teks })} onBerubah={() => void muatDaftar()} />
        </section>
      ) : (
        <>
          {/* ---------- Unggah ---------- */}
          <section className={kls.kartu}>
            <h2 className="mb-2 font-medium">Unggah berkas — {m.label}</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">Tahun data<br />
                <select className={kls.input} value={tahunUnggah} onChange={(e) => { setTahunUnggah(Number(e.target.value)); setPratinjau(null); }}>
                  {PILIHAN_TAHUN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-sm">Berkas (.xlsx atau ekspor .xls Sinkarkes)<br />
                <input type="file" accept=".xlsx,.xls,.html,.htm" className="text-sm"
                  onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPratinjau(null); setPesan(null); setPerluWilayah(false); }} />
              </label>
              {(perluWilayah || wilayahUnggah) && (
                <label className="text-sm">Wilayah kerja untuk seluruh baris<br />
                  <select className={kls.input} value={wilayahUnggah} onChange={(e) => { setWilayahUnggah(e.target.value); setPratinjau(null); }}>
                    <option value="">— pilih —</option>
                    {wilayahModul.map((w) => <option key={w.kode} value={w.kode}>{w.namaPendek}</option>)}
                  </select>
                </label>
              )}
              <button className={kls.tombolPutih} disabled={!berkas || sibuk} onClick={() => kirimBerkas('pratinjau')}>Periksa berkas</button>
              <a className={kls.tombolPutih} href={`${dasar}/template`}>Unduh template</a>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Baris dicocokkan lewat wilayah + nama kapal + tanggal: yang belum ada ditambahkan, yang sudah ada diperbarui. Isian petugas (RBA dst.) tidak ditimpa dengan kosong, jadi berkas boleh diunggah ulang.
            </p>

            {pratinjau && (
              <div className="mt-4 text-sm">
                <p>
                  Baris data: <b>{pratinjau.jumlahBaris}</b> · sah: <b className="text-green-700">{pratinjau.sah}</b> · ditolak: <b className="text-red-700">{pratinjau.ditolak}</b>
                  {' '}· baru: <b>{pratinjau.baru}</b> · diperbarui: <b>{pratinjau.diperbarui}</b> · wilayah: {pratinjau.wilayah.join(', ') || '-'}
                </p>
                {m.negaraDariMaster && <p className="mt-1 text-gray-600">Negara kedatangan terisi otomatis dari master: {pratinjau.negaraTerisi} baris.</p>}
                {pratinjau.pelabuhanTanpaMaster.length > 0 && (
                  <p className="mt-1 text-amber-700">
                    Pelabuhan belum ada di master ({pratinjau.pelabuhanTanpaMaster.length}): {pratinjau.pelabuhanTanpaMaster.slice(0, 8).join('; ')}
                    {pratinjau.pelabuhanTanpaMaster.length > 8 ? '; …' : ''}. Boleh tetap disimpan, lalu lengkapi di tab Master Negara Kedatangan.
                  </p>
                )}
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
                  {kolomForm.map((k) => (
                    <label key={k.nama} className="text-sm">{k.label}{k.wajib ? ' *' : ''}<br />
                      {k.tipe === 'wilker' ? (
                        <select className={`${kls.input} w-full`} value={isian[k.nama] ?? ''} onChange={(e) => setIsian({ ...isian, [k.nama]: e.target.value })}>
                          <option value="">— pilih —</option>
                          {wilayahModul.map((w) => <option key={w.kode} value={w.kode}>{w.namaPendek}</option>)}
                        </select>
                      ) : k.manual ? (
                        <PilihanManual kolom={k} nilai={isian[k.nama] ?? ''} opsi={pilihan[k.nama] ?? k.pilihan ?? []} onUbah={(v) => setIsian({ ...isian, [k.nama]: v })} />
                      ) : (
                        <input className={`${kls.input} w-full`}
                          type={k.tipe === 'tanggal' ? 'date' : k.tipe === 'bilangan' || k.tipe === 'desimal' ? 'number' : k.tipe === 'waktu' ? 'time' : 'text'}
                          min={k.tipe === 'bilangan' || k.tipe === 'desimal' ? 0 : undefined} value={isian[k.nama] ?? ''}
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
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <select className={kls.input} value={fTahun} onChange={(e) => { setFTahun(e.target.value); if (!e.target.value) setFBulan(''); setHalaman(1); }}>
                <option value="">Semua tahun</option>{PILIHAN_TAHUN.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className={kls.input} value={fBulan} onChange={(e) => { setFBulan(e.target.value); if (e.target.value && !fTahun) setFTahun(String(TAHUN_INI)); setHalaman(1); }}>
                <option value="">Semua bulan</option>{NAMA_BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
              </select>
              <select className={kls.input} value={fWilayah} onChange={(e) => { setFWilayah(e.target.value); setHalaman(1); }}>
                <option value="">Semua wilayah kerja</option>
                {wilayahModul.map((w) => <option key={w.kode} value={w.namaPendek}>{w.namaPendek}</option>)}
              </select>
              <select className={kls.input} value={fSumber} onChange={(e) => { setFSumber(e.target.value); setHalaman(1); }}>
                <option value="">Semua sumber</option><option value="migrasi">Migrasi lama</option><option value="input">Form</option><option value="upload">Unggah</option>
              </select>
              {kolomManual.length > 0 && (
                <label className="flex items-center gap-1"><input type="checkbox" checked={fBelum} onChange={(e) => { setFBelum(e.target.checked); setHalaman(1); }} />
                  Hanya yang isian petugasnya belum lengkap</label>
              )}
              <span className="text-gray-500">{daftar ? `${daftar.total} baris` : 'Memuat…'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {kolomTabel.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1 font-medium">{labelKolom(c)}</th>)}
                  {kolomManual.map((k) => <th key={k.nama} className="whitespace-nowrap bg-amber-50 px-2 py-1 font-medium">{k.label}</th>)}
                  <th className="px-2 py-1 font-medium">Sumber</th>{admin && <th />}
                </tr></thead>
                <tbody>
                  {daftar?.baris.map((b) => (
                    <tr key={String(b.id)} className="border-b">
                      {kolomTabel.map((c) => <td key={c} className="whitespace-nowrap px-2 py-1">{b[c] ?? ''}</td>)}
                      {kolomManual.map((k) => (
                        <td key={k.nama} className="bg-amber-50/40 px-2 py-1">
                          <PilihanManual kolom={k} nilai={String(b[k.nama] ?? '')} opsi={pilihan[k.nama] ?? k.pilihan ?? []}
                            onUbah={(v) => ubahManual(String(b.id), k.nama, v)} />
                        </td>
                      ))}
                      <td className="px-2 py-1">{b.sumber}</td>
                      {admin && <td className="px-2 py-1"><button className="text-red-600 hover:underline" onClick={() => hapus('baris', String(b.id), 'Hapus baris ini?')}>Hapus</button></td>}
                    </tr>
                  ))}
                  {daftar && daftar.baris.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={kolomTabel.length + kolomManual.length + 2}>Belum ada data.</td></tr>}
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
                  <th className="px-2 py-1 font-medium">Tahun</th><th className="px-2 py-1 font-medium">Baru</th><th className="px-2 py-1 font-medium">Diperbarui</th><th className="px-2 py-1 font-medium">Ditolak</th>{admin && <th />}
                </tr></thead>
                <tbody>
                  {riwayat.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-2 py-1">{waktuWita(r.dibuat_pada)}</td><td className="px-2 py-1">{r.dibuat_oleh}</td><td className="px-2 py-1">{r.nama_file}</td>
                      <td className="px-2 py-1">{r.tahun}</td><td className="px-2 py-1">{r.jumlah_masuk}</td><td className="px-2 py-1">{r.jumlah_diganti}</td><td className="px-2 py-1">{r.jumlah_ditolak}</td>
                      {admin && <td className="px-2 py-1"><button className="text-red-600 hover:underline"
                        onClick={() => hapus('batch', r.id, `Batalkan unggahan ini? ${r.jumlah_masuk} baris BARU yang dimasukkannya akan dihapus (termasuk isian petugas pada baris itu). Baris lama yang sempat diperbarui tidak dikembalikan.`)}>Batalkan</button></td>}
                    </tr>
                  ))}
                  {riwayat.length === 0 && <tr><td className="px-2 py-4 text-gray-500" colSpan={8}>Belum ada unggahan.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
