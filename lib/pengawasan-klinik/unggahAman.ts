// lib/pengawasan-klinik/unggahAman.ts
// Unggah foto/tanda tangan ke Cloudinary (signed upload) dengan: batas waktu (sinyal lemah tidak
// menggantung selamanya), pengecekan hasil, dan galat jaringan yang bisa dicoba ulang.
import { GalatJaringan } from './antrianOffline';

function sinyalBatas(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(ms)
    : undefined;
}

export async function unggahFotoAman(file: File, jenisDokumen: string, namaKlinik: string) {
  const folder = `pengawasan-klinik/${namaKlinik.replace(/\s+/g, '-').toLowerCase()}`;

  const signRes = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    body: JSON.stringify({ folder }),
    signal: sinyalBatas(20000),
  });
  if (signRes.status >= 500) throw new GalatJaringan(`Server sibuk (${signRes.status})`);
  if (!signRes.ok) throw new Error(`Gagal meminta izin unggah (${signRes.status})`);
  const { timestamp, signature, apiKey, cloudName } = await signRes.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
    signal: sinyalBatas(90000),
  });
  const result = await uploadRes.json().catch(() => null);
  if (uploadRes.status >= 500) throw new GalatJaringan(`Cloudinary sibuk (${uploadRes.status})`);
  if (!uploadRes.ok || !result?.secure_url) {
    throw new Error(result?.error?.message ?? 'Upload ke Cloudinary gagal');
  }
  return { url: result.secure_url as string, publicId: result.public_id as string, jenisDokumen };
}
