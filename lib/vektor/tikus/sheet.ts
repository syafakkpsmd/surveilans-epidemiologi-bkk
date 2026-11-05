// lib/vektor/tikus/sheet.ts
import * as XLSX from 'xlsx';

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Baca sheet pertama. `penanda` = judul yang harus ada di baris judul terakhir (mis. rt, rn, mm);
 * baris pertama yang memuat semuanya dianggap akhir blok judul. Tanpa penanda, baris 1 = judul.
 * Nomor baris (`n`) sesuai nomor baris di Excel.
 */
export function bacaTabel(buf: Buffer, penanda: string[] = []) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });

  let akhir = 0;
  if (penanda.length) {
    for (let i = 0; i < Math.min(aoa.length, 8); i++) {
      const sel = aoa[i].map(norm);
      if (penanda.every((p) => sel.includes(p))) {
        akhir = i;
        break;
      }
    }
  }

  const lebar = Math.max(0, ...aoa.slice(0, akhir + 1).map((r) => r.length));
  const judul: string[] = [];
  for (let c = 0; c < lebar; c++) {
    let j = '';
    for (let i = 0; i <= akhir; i++) {
      const t = String(aoa[i]?.[c] ?? '').trim();
      if (t) j = t;
    }
    judul.push(j);
  }

  return aoa.slice(akhir + 1).map((r, i) => {
    const b: Record<string, unknown> = {};
    judul.forEach((j, c) => {
      if (j && b[j] === undefined) b[j] = r[c] ?? '';
    });
    return { n: akhir + i + 2, b };
  });
}