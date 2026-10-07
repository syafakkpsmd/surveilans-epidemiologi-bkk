// lib/pengawasan-klinik/antrianOffline.ts
// Antrian pengawasan klinik yang diinput saat OFFLINE, disimpan di IndexedDB perangkat
// (isian form + foto + tanda tangan), lalu dikirim otomatis saat ada sinyal.

export const EVENT_ANTRIAN = 'antrian-pengawasan-berubah';

export type MediaAntrian = { key: string; mime: string; data: ArrayBuffer };
export type StatusAntrian = 'menunggu' | 'mengirim' | 'gagal';

export type RekamAntrian = {
  id: string;
  dibuat: string; // ISO
  namaKlinik: string;
  fields: Record<string, string>; // isian form (termasuk foto_url_* yang sudah terunggah)
  media: MediaAntrian[]; // foto/tanda tangan yang BELUM terunggah
  status: StatusAntrian;
  pesan?: string;
};

/** Galat yang layak dicoba ulang nanti (sinyal putus / timeout / server sibuk). */
export class GalatJaringan extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatJaringan';
  }
}

export function adalahGalatJaringan(err: unknown): boolean {
  if (err instanceof GalatJaringan) return true;
  if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) return true;
  if (err instanceof Error) {
    return /failed to fetch|networkerror|network request failed|load failed|fetch failed|unexpected response was received/i.test(
      err.message
    );
  }
  return false;
}

export function idBaru(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------- IndexedDB ----------------
const NAMA_DB = 'epic-ai-offline';
const NAMA_STORE = 'antrian_pengawasan_klinik';

function bukaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAMA_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(NAMA_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function jalankan<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await bukaDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(NAMA_STORE, mode);
    const req = fn(tx.objectStore(NAMA_STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Transaksi penyimpanan dibatalkan'));
    };
  });
}

export async function simpanRekam(rekam: RekamAntrian): Promise<void> {
  await jalankan('readwrite', (s) => s.put(rekam));
}

export async function daftarRekam(): Promise<RekamAntrian[]> {
  const semua = await jalankan<RekamAntrian[]>('readonly', (s) => s.getAll());
  return semua.sort((a, b) => a.dibuat.localeCompare(b.dibuat));
}

export async function hapusRekam(id: string): Promise<void> {
  await jalankan('readwrite', (s) => s.delete(id));
}

// ---------------- media ----------------
export async function berkasKeMedia(key: string, file: File): Promise<MediaAntrian> {
  return { key, mime: file.type || 'image/jpeg', data: await file.arrayBuffer() };
}

export function mediaKeBerkas(media: MediaAntrian): File {
  const ekstensi = media.mime.includes('png') ? 'png' : 'jpg';
  return new File([media.data], `${media.key}.${ekstensi}`, { type: media.mime });
}

/**
 * Perkecil foto kamera HP (3–8 MB) jadi ±300–600 KB supaya muat di penyimpanan
 * offline dan cepat terunggah di sinyal lemah. Gagal/tidak didukung → file asli.
 */
export async function kompresGambar(file: File, sisiMaks = 1600, kualitas = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const skala = Math.min(1, sisiMaks / Math.max(bitmap.width, bitmap.height));
    const lebar = Math.round(bitmap.width * skala);
    const tinggi = Math.round(bitmap.height * skala);
    const canvas = document.createElement('canvas');
    canvas.width = lebar;
    canvas.height = tinggi;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, lebar, tinggi);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', kualitas));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
