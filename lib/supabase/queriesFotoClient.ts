'use client';

export async function uploadFotoKegiatan(
  file: File,
  judul: string,
  jenisKegiatanId: number,
  deskripsi?: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('judul', judul);
  formData.append('jenisKegiatanId', String(jenisKegiatanId));
  if (deskripsi) formData.append('deskripsi', deskripsi);

  const res = await fetch('/api/foto', { method: 'POST', body: formData });
  const hasil = await res.json();

  if (!res.ok) throw new Error(hasil.error ?? 'Gagal upload foto.');
}

export async function editFotoKegiatan(
  id: number,
  data: { judul: string; deskripsi?: string; jenisKegiatanId?: number }
) {
  const res = await fetch('/api/foto', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const hasil = await res.json();

  if (!res.ok) throw new Error(hasil.error ?? 'Gagal edit foto.');
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

export async function tambahJenisKegiatan(nama: string) {
  const res = await fetch('/api/jenis-kegiatan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama }),
  });
  const hasil = await res.json();

  if (!res.ok) throw new Error(hasil.error ?? 'Gagal tambah jenis kegiatan.');
  return hasil.data as { id: number; nama: string };
}