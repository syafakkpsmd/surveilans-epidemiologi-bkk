// lib/pengawasan-klinik/uploadFoto.ts
export async function uploadFotoKlinik(file: File, jenisDokumen: string, namaKlinik: string) {
  const folder = `pengawasan-klinik/${namaKlinik.replace(/\s+/g, '-').toLowerCase()}`;
  const signRes = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    body: JSON.stringify({ folder }),
  });
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
  });
  const result = await uploadRes.json();
  // simpan result.secure_url dan result.public_id ke tabel pengawasan_klinik_dokumen
  return { url: result.secure_url as string, publicId: result.public_id as string, jenisDokumen };
}