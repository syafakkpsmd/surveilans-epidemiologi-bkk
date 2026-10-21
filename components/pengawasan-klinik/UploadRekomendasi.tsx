'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, Upload, X } from 'lucide-react';

export default function UploadRekomendasi({
  pengawasanId,
  namaFile,
}: {
  pengawasanId: string;
  namaFile: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const url = `/api/pengawasan-klinik/${pengawasanId}/rekomendasi`;
  const btn = 'inline-flex items-center gap-1 border rounded px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50';

  async function onPilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(url, { method: 'POST', body: fd });
    setLoading(false);
    if (!res.ok) setError((await res.json()).error ?? 'Gagal upload');
    else router.refresh();
    e.target.value = '';
  }

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onPilih} />

        {namaFile && (
          <>
            <button type="button" onClick={() => setPreview(true)} className={btn}>
              <Eye size={14} /> Lihat
            </button>
            <a href={`${url}?download=1`} className={btn}>
              <Download size={14} /> Unduh
            </a>
          </>
        )}

        <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className={btn}>
          <Upload size={14} />
          {loading ? 'Mengunggah…' : namaFile ? 'Ganti PDF' : 'Upload Rekomendasi (PDF)'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(false)}>
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="truncate text-sm font-medium">{namaFile}</p>
              <div className="flex items-center gap-3">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline">
                  Buka di tab baru
                </a>
                <button type="button" onClick={() => setPreview(false)} aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe src={url} title="Preview surat rekomendasi" className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}