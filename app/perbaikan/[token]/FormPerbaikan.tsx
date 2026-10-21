'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Trash2 } from 'lucide-react';
import type { DataPerbaikan } from '@/lib/pengawasan-klinik/perbaikan';

type Item = { key: string; label: string; kategori: string };

async function kompres(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * skala);
  c.height = Math.round(bmp.height * skala);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('Gagal memproses foto'))), 'image/jpeg', 0.7)
  );
}

function BarisItem({ token, item, awal }: { token: string; item: Item; awal?: DataPerbaikan[string] }) {
  const router = useRouter();
  const [ket, setKet] = useState(awal?.keterangan ?? '');
  const [tgl, setTgl] = useState(awal?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const foto = awal?.foto ?? [];

  async function simpan() {
    setBusy('simpan');
    setPesan(null);
    const res = await fetch(`/api/perbaikan/${token}/keterangan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_key: item.key, keterangan: ket, tanggal_perbaikan: tgl }),
    });
    setBusy(null);
    setPesan(res.ok ? 'Tersimpan ✓' : 'Gagal menyimpan');
    if (res.ok) router.refresh();
  }

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('foto');
    setPesan(null);
    try {
      const blob = await kompres(file);
      const fd = new FormData();
      fd.append('item_key', item.key);
      fd.append('file', blob, 'foto.jpg');
      const res = await fetch(`/api/perbaikan/${token}/foto`, { method: 'POST', body: fd });
      if (!res.ok) setPesan((await res.json()).error ?? 'Gagal mengunggah');
      else router.refresh();
    } catch {
      setPesan('Foto tidak dapat diproses, coba foto lain');
    }
    setBusy(null);
  }

  async function hapus(id: string) {
    if (!confirm('Hapus foto ini?')) return;
    await fetch(`/api/perbaikan/${token}/foto?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{item.kategori}</p>
      <p className="text-sm font-medium text-gray-800">{item.label}</p>

      <textarea
        value={ket}
        onChange={(e) => setKet(e.target.value)}
        rows={2}
        placeholder="Apa yang sudah disediakan / diperbaiki?"
        className="mt-3 w-full rounded border px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        <button
          type="button"
          onClick={simpan}
          disabled={busy !== null}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {busy === 'simpan' ? 'Menyimpan…' : 'Simpan keterangan'}
        </button>
        {pesan && <span className="text-xs text-gray-600">{pesan}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {foto.map((id) => (
          <div key={id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/perbaikan-foto/${id}`} alt="Foto perbaikan" className="h-24 w-24 rounded border object-cover" />
            <button
              type="button"
              onClick={() => hapus(id)}
              aria-label="Hapus foto"
              className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {foto.length < 5 && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed text-xs text-gray-500 hover:bg-gray-50">
            <Camera size={18} />
            {busy === 'foto' ? 'Mengunggah…' : 'Tambah foto'}
            <input type="file" accept="image/*" className="hidden" onChange={unggah} disabled={busy !== null} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function FormPerbaikan({
  token,
  items,
  dataAwal,
}: {
  token: string;
  items: Item[];
  dataAwal: DataPerbaikan;
}) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <BarisItem key={it.key} token={token} item={it} awal={dataAwal[it.key]} />
      ))}
    </div>
  );
}