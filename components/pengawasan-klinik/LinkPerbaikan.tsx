'use client';
import { useState } from 'react';
import { Link2 } from 'lucide-react';

export default function LinkPerbaikan({ pengawasanId }: { pengawasanId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [salin, setSalin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function buat() {
    setBusy(true);
    const res = await fetch(`/api/pengawasan-klinik/${pengawasanId}/link-perbaikan`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) return alert('Gagal membuat link');
    const { url } = await res.json();
    setUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setSalin(true);
    } catch {}
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={buat}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <Link2 size={14} /> {busy ? 'Membuat…' : 'Link untuk klinik'}
      </button>
      {url && (
        <span className="text-xs text-gray-600">
          {salin ? 'Tersalin: ' : ''}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">
            {url}
          </a>
        </span>
      )}
    </span>
  );
}