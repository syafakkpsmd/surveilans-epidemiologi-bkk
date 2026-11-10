'use client';

// Dialog "Edit" satu baris, dibentuk otomatis dari konfigurasi modul (lib/input-data/modul.ts).
// Membaca baris lewat GET /api/input-data/{modul}/baris?id=, menyimpan lewat POST .../perbarui.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LABEL_RBA, PILIHAN_RBA, type KolomModul, type ModulInput } from '@/lib/input-data/modul';

type Wilayah = { kode: string; nama: string };

const kotak =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F2A38] outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20';
const rapi = (s: string) => s.toLowerCase().replace(/\s+/g, '');

function Isian({ k, nilai, ubah, wilayah }: { k: KolomModul; nilai: string; ubah: (v: string) => void; wilayah: Wilayah[] }) {
  const id = `edit-${k.nama}`;
  const pas = { id, value: nilai, className: kotak, onChange: (e: { target: { value: string } }) => ubah(e.target.value) };
  switch (k.tipe) {
    case 'wilker': {
      const ada = wilayah.some((w) => w.kode === nilai);
      return (
        <select {...pas}>
          <option value="">Pilih wilayah kerja</option>
          {!ada && nilai && <option value={nilai}>{nilai}</option>}
          {wilayah.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
        </select>
      );
    }
    case 'rba':
      return (
        <select {...pas}>
          <option value="">-</option>
          {PILIHAN_RBA.map((o) => <option key={o} value={o}>{LABEL_RBA[o] ?? o}</option>)}
        </select>
      );
    case 'ya_tidak':
      return (
        <select {...pas}>
          <option value="">Belum dinilai</option>
          <option>Ya</option><option>Tidak</option><option>N/A</option>
        </select>
      );
    case 'tanggal': return <input {...pas} type="date" value={nilai.slice(0, 10)} />;
    case 'tanggalwaktu': return <input {...pas} type="datetime-local" value={nilai.replace(' ', 'T').slice(0, 16)} />;
    case 'waktu': return <input {...pas} type="time" value={nilai.slice(0, 5)} />;
    case 'bilangan': return <input {...pas} type="number" step={1} inputMode="numeric" />;
    case 'desimal': return <input {...pas} type="text" inputMode="decimal" />;
    default:
      if ((k.maks ?? 255) > 255 && !k.pilihan?.length) return <textarea {...pas} rows={3} maxLength={k.maks} />;
      return (
        <>
          <input {...pas} type="text" maxLength={k.maks ?? 255} list={k.pilihan?.length ? `${id}-daftar` : undefined} />
          {k.pilihan?.length ? <datalist id={`${id}-daftar`}>{k.pilihan.map((o) => <option key={o} value={o} />)}</datalist> : null}
        </>
      );
  }
}

export default function EditBarisDialog({ modul, wilayah, id, onSelesai }: {
  modul: ModulInput; wilayah: Wilayah[]; id: string; onSelesai: (disimpan: boolean) => void;
}) {
  const kolom = useMemo(() => modul.kolom.filter((k) => !k.turunan && !k.arsip), [modul]);
  const [isi, setIsi] = useState<Record<string, string> | null>(null);
  const [galat, setGalat] = useState<string[]>([]);
  const [kirim, setKirim] = useState(false);

    // Versi terbaru prop disimpan di ref agar efek pemuatan hanya berjalan saat dialog dibuka,
  // bukan setiap induk render ulang (yang akan memuat ulang dan menimpa ketikan petugas).
  const wilayahRef = useRef(wilayah);
  const selesaiRef = useRef(onSelesai);
  useEffect(() => { wilayahRef.current = wilayah; selesaiRef.current = onSelesai; });

  // Pengambilan data dari server: setState terjadi setelah await, bukan sinkron.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let batal = false;
    (async () => {
      const r = await fetch(`/api/input-data/${modul.kunci}/baris?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (batal) return;
      if (!r.ok || !j.baris) { setGalat([j.error ?? 'Data tidak ditemukan']); return; }
      const awal: Record<string, string> = {};
      for (const k of kolom) {
        const v = j.baris[k.nama];
        let s = v == null ? '' : String(v);
        if (k.tipe === 'wilker') s = wilayahRef.current.find((w) => rapi(w.nama) === rapi(s))?.kode ?? s; // "APT Pranoto" -> WK07
        awal[k.nama] = s;
      }
      setIsi(awal);
    })();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') selesaiRef.current(false); };
    window.addEventListener('keydown', esc);
    return () => { batal = true; window.removeEventListener('keydown', esc); };
  }, [id, modul.kunci, kolom]);

  async function simpan() {
    if (!isi) return;
    setKirim(true); setGalat([]);
    try {
      const r = await fetch(`/api/input-data/${modul.kunci}/perbarui`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nilai: isi }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setGalat(Array.isArray(j.galat) && j.galat.length ? j.galat : [j.error ?? 'Gagal menyimpan']); return; }
      onSelesai(true);
    } catch {
      setGalat(['Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.']);
    } finally {
      setKirim(false);
    }
  }

  let kelompokKini = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Edit data ${modul.label}`}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#0F2A38]">Edit data {modul.label}</h2>
          <button type="button" onClick={() => onSelesai(false)} className="text-sm text-gray-500 hover:text-gray-800" aria-label="Tutup">Tutup</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {!isi && !galat.length && <p className="text-sm text-gray-500">Memuat data…</p>}
          {isi && (
            <div className="grid gap-4 sm:grid-cols-2">
              {kolom.map((k) => {
                const judul = k.kelompok && k.kelompok !== kelompokKini ? (kelompokKini = k.kelompok) : null;
                return (
                  <div key={k.nama} className={(k.maks ?? 255) > 255 ? 'sm:col-span-2' : ''}>
                    {judul && <h3 className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-[#0F4C5C] sm:col-span-2">{judul}</h3>}
                    <label htmlFor={`edit-${k.nama}`} className="mb-1 block text-xs font-medium text-gray-700">
                      {k.label}{k.wajib && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    <Isian k={k} nilai={isi[k.nama] ?? ''} ubah={(v) => setIsi((s) => ({ ...(s ?? {}), [k.nama]: v }))} wilayah={wilayah} />
                  </div>
                );
              })}
            </div>
          )}
          {galat.length > 0 && (
            <ul role="alert" className="mt-4 list-disc rounded-lg border border-red-200 bg-red-50 py-2 pl-7 pr-3 text-sm text-red-800">
              {galat.map((g) => <li key={g}>{g}</li>)}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button type="button" onClick={() => onSelesai(false)} disabled={kirim} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Batal</button>
          <button type="button" onClick={simpan} disabled={!isi || kirim} className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B3A46] disabled:opacity-60">
            {kirim ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}