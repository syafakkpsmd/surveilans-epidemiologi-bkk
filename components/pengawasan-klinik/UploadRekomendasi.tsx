'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Upload } from 'lucide-react';

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

  async function onPilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/pengawasan-klinik/${pengawasanId}/rekomendasi`, { method: 'POST', body: fd });
    setLoading(false);
    if (!res.ok) setError((await res.json()).error ?? 'Gagal upload');
    else router.refresh();
    e.target.value = '';
  }

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onPilih} />
      {namaFile && (
        <a
          href={`/api/pengawasan-klinik/${pengawasanId}/rekomendasi`}
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-blue-700 underline"
        >
          <FileText size={14} /> Surat rekomendasi
        </a>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 border rounded px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <Upload size={14} />
        {loading ? 'Mengunggah…' : namaFile ? 'Ganti PDF' : 'Upload Rekomendasi (PDF)'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}