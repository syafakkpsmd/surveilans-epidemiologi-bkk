// lib/media-tanah/kolom.ts
// Satu sumber untuk template Excel (unduh) dan pembaca unggahan, dibangkitkan dari config.ts.
import { ITEM_B, ITEM_C, ITEM_D, ITEM_E, SATUAN_E, teksBatas } from './config';

const low = (k: string) => k.toLowerCase();

export const kunciKolom = (s: string) => s.trim().toLowerCase().replace(/[\s\-]+/g, '_');

export type InfoKolom = { kolom: string; arti: string; isian: string };

export function daftarKolom(): InfoKolom[] {
  const k: InfoKolom[] = [
    { kolom: 'tanggal', arti: 'A.5 Tanggal pemeriksaan', isian: 'dd/MM/yyyy, yyyy-MM-dd, atau tanggal Excel' },
    { kolom: 'nama_pelabuhan', arti: 'A.1 Nama pelabuhan', isian: 'Teks (wajib)' },
    { kolom: 'area_lokasi', arti: 'A.2 Area/lokasi pemeriksaan', isian: 'Teks' },
    { kolom: 'penanggung_jawab', arti: 'A.3 Nama pengelola/penanggung jawab', isian: 'Teks' },
    { kolom: 'alamat_titik', arti: 'A.4 Alamat/lokasi titik pemeriksaan', isian: 'Teks' },
    { kolom: 'petugas_pemeriksa', arti: 'A.6 Nama petugas pemeriksa', isian: 'Teks (wajib)' },
    { kolom: 'kondisi_cuaca', arti: 'A.7 Kondisi cuaca', isian: 'Teks' },
    { kolom: 'jenis_kegiatan', arti: 'A.8 Jenis kegiatan di lokasi', isian: 'Teks' },
  ];
  ITEM_B.forEach((b, i) => {
    k.push({ kolom: low(b.kode), arti: `B.${i + 1} ${b.label}`, isian: 'memenuhi / tidak memenuhi (atau M / TM). Wajib' });
    k.push({ kolom: `${low(b.kode)}_keterangan`, arti: `B.${i + 1} Keterangan`, isian: 'Teks' });
    k.push({ kolom: `${low(b.kode)}_tindak_lanjut`, arti: `B.${i + 1} Rekomendasi/tindak lanjut`, isian: 'Teks. Wajib jika tidak memenuhi' });
  });
  ITEM_C.forEach((c, i) => {
    k.push({ kolom: `${low(c.kode)}_hasil`, arti: `C.${i + 1} ${c.label} (${c.satuan}): hasil`, isian: `Angka ${c.min} sampai ${c.max}` });
    k.push({ kolom: `${low(c.kode)}_sbmkl`, arti: `C.${i + 1} Nilai SBMKL`, isian: 'Teks, mis. 6-8' });
    k.push({ kolom: `${low(c.kode)}_status`, arti: `C.${i + 1} Memenuhi / Tidak`, isian: 'memenuhi / tidak memenuhi' });
  });
  ITEM_D.forEach((d, i) => {
    k.push({ kolom: low(d.kode), arti: `D.${i + 1} ${d.label}`, isian: 'ada / tidak (atau A / T). Wajib' });
    k.push({ kolom: `${low(d.kode)}_keterangan`, arti: `D.${i + 1} Keterangan`, isian: 'Teks' });
    k.push({ kolom: `${low(d.kode)}_tindak_lanjut`, arti: `D.${i + 1} Tindak lanjut`, isian: 'Teks' });
  });
  ITEM_E.forEach((e, i) => {
    k.push({
      kolom: low(e.kode),
      arti: `E.${i + 1} ${e.label} (${SATUAN_E}), SBMKL ${teksBatas(e.batas)}`,
      isian: 'Angka. Kosongkan jika tidak diperiksa. Status dihitung otomatis',
    });
  });
  k.push({ kolom: 'kesimpulan', arti: 'F. Kesimpulan pemeriksaan', isian: 'memenuhi / tidak memenuhi / perlu lab. Wajib' });
  k.push({ kolom: 'uraian_kesimpulan', arti: 'F. Uraian kesimpulan/rekomendasi', isian: 'Teks' });
  return k;
}

// r = satu baris Excel dengan kunci sudah dinormalkan lewat kunciKolom
export function barisKePayload(r: Record<string, any>) {
  const g = (k: string) => r[k] ?? '';
  const item: Record<string, Record<string, any>> = {};
  for (const b of [...ITEM_B, ...ITEM_D]) {
    const l = low(b.kode);
    item[b.kode] = { status: g(l), keterangan: g(`${l}_keterangan`), tindak_lanjut: g(`${l}_tindak_lanjut`) };
  }
  for (const c of ITEM_C) {
    const l = low(c.kode);
    item[c.kode] = { hasil: g(`${l}_hasil`), batas: g(`${l}_sbmkl`), status: g(`${l}_status`) };
  }
  for (const e of ITEM_E) item[e.kode] = { hasil: g(low(e.kode)) };
  return {
    tanggal: g('tanggal'),
    nama_pelabuhan: g('nama_pelabuhan'),
    area_lokasi: g('area_lokasi'),
    penanggung_jawab: g('penanggung_jawab'),
    alamat_titik: g('alamat_titik'),
    petugas_pemeriksa: g('petugas_pemeriksa'),
    kondisi_cuaca: g('kondisi_cuaca'),
    jenis_kegiatan: g('jenis_kegiatan'),
    kesimpulan: g('kesimpulan'),
    uraian_kesimpulan: g('uraian_kesimpulan'),
    item,
  };
}