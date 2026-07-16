'use client';

export async function uploadFotoKegiatan(file: File, judul: string, deskripsi?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('judul', judul);
  if (deskripsi) formData.append('deskripsi', deskripsi);

  const res = await fetch('/api/foto', { method: 'POST', body: formData });
  const hasil = await res.json();

  if (!res.ok) throw new Error(hasil.error ?? 'Gagal upload foto.');
}

export async function hapusFotoKegiatan(id: number, publicId: string) {
  const res = await fetch('/api/foto', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, publicId }),
  });
  const hasil = await res.json();

  if (!res.ok) throw new Error(hasil.error ?? 'Gagal hapus foto.');
}