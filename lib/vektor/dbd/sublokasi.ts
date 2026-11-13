// lib/vektor/dbd/sublokasi.ts
// Penyamaan penulisan nama sub lokasi survei DBD. MURNI: aman dipakai di server maupun komponen 'use client'.

/** Spasi beruntun jadi satu, pinggir dipangkas, paling panjang 120 karakter. */
export const rapikanSub = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);

/** Kunci pembanding: tanpa huruf besar, spasi, dan tanda baca; angka tanpa nol di depan. "RT 01", "rt.1", dan "RT1" semuanya "rt1". */
export const kunciSub = (s: string | null | undefined): string =>
  rapikanSub(s).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\d+/g, (m) => String(Number(m)));

const pengurut = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

/** Gabungkan beberapa daftar nama; penulisan pertama yang ditemui dipakai. Urutan alami: RT 2 sebelum RT 10. */
export function gabungkanSub(...daftar: (string[] | undefined)[]): string[] {
  const peta = new Map<string, string>();
  for (const d of daftar) {
    for (const nama of d ?? []) {
      const rapi = rapikanSub(nama);
      const k = kunciSub(rapi);
      if (k && !peta.has(k)) peta.set(k, rapi);
    }
  }
  return [...peta.values()].sort(pengurut.compare);
}

/** Pakai penulisan yang sudah ada di `daftar` bila nama ini sama; kosong atau hanya nama zona jadi null. */
export function kanonikSub(teks: string | null | undefined, daftar: string[]): string | null {
  const rapi = rapikanSub(teks);
  if (!rapi || /^(buffer|perimeter)$/i.test(rapi)) return null;
  const k = kunciSub(rapi);
  return daftar.find((d) => kunciSub(d) === k) ?? rapi;
}