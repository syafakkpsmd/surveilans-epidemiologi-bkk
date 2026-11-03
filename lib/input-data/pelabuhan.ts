// lib/input-data/pelabuhan.ts
// Pencocokan nama pelabuhan -> negara (master pelabuhan). MURNI, aman dipakai di klien dan server.

/** Kunci pembanding: huruf kecil, tanpa keterangan dalam kurung "(ex Pusan)", tanpa spasi/tanda baca. */
export function kunciPelabuhan(nama: string): string {
  return nama
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Cari negara untuk nama pelabuhan. Urutan: (1) nama lengkap, (2) bagian sebelum koma
 * ("Pasir Gudang, Johor" -> "Pasir Gudang"), (3) bagian setelah koma. Tidak ada tebakan lain:
 * hasil null berarti petugas perlu menambah master. `peta` = kunci -> negara.
 */
export function cariNegara(peta: Map<string, string>, nama: string | null | undefined): string | null {
  if (!nama) return null;
  const penuh = peta.get(kunciPelabuhan(nama));
  if (penuh) return penuh;
  const bagian = nama.split(',').map((x) => x.trim()).filter(Boolean);
  if (bagian.length > 1) {
    for (const b of bagian) {
      const k = kunciPelabuhan(b);
      if (k && peta.has(k)) return peta.get(k) ?? null;
    }
  }
  return null;
}
