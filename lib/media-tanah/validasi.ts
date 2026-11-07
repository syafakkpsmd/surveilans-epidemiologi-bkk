// lib/media-tanah/validasi.ts
// Dipakai bersama oleh form input dan unggah Excel.
import { ITEM_B, ITEM_C, ITEM_D, ITEM_E, KODE_WILAYAH, KESIMPULAN, teksBatas, statusLab } from './config';
import { parseTanggalCkg, keIsoTanggal } from '@/lib/klinik/ckg/tanggalCkg'; // pembungkus parseTanggalSheet

export type HasilRow = {
  bagian: 'B' | 'C' | 'D' | 'E';
  kode: string;
  hasil: number | null;
  batas_teks: string | null;
  status: string | null;
  keterangan: string | null;
  tindak_lanjut: string | null;
};

export type Header = {
  tanggal_periksa: string;
  wilayah: string;
  nama_pelabuhan: string;
  area_lokasi: string;
  penanggung_jawab: string;
  alamat_titik: string;
  petugas_pemeriksa: string;
  kondisi_cuaca: string;
  jenis_kegiatan: string;
  kesimpulan: string;
  uraian_kesimpulan: string;
};

export type Pemeriksaan = { header: Header; hasil: HasilRow[] };
type Hasil = { ok: true; data: Pemeriksaan } | { ok: false; error: string };

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

function teks(v: unknown, maks: number, nama: string, wajib = false): string {
  const s = String(v ?? '').trim();
  if (wajib && !s) throw new Error(`${nama} wajib diisi`);
  if (s.length > maks) throw new Error(`${nama} terlalu panjang (maks ${maks} karakter)`);
  return s;
}

// '' -> null, tidak terbaca -> NaN
const angka = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const MEMENUHI = /^(memenuhi|m|ya|y|1|true|v|✓|✔|☑)$/;
const TIDAK_MEMENUHI = /^(tidak memenuhi|tidak_memenuhi|tm|tidak|tdk|x|0|false|n|☒)$/;
const ADA = /^(ada|a|ya|y|1|true|v|✓|✔|☑)$/;
const TIDAK_ADA = /^(tidak ada|tidak_ada|tidak|tdk|t|x|0|false|n|☒)$/;

// null = kosong, undefined = tidak dikenali
function baca(v: unknown, ya: RegExp, tidak: RegExp, nilaiYa: string, nilaiTidak: string): string | null | undefined {
  const t = norm(v);
  if (!t) return null;
  if (ya.test(t)) return nilaiYa;
  if (tidak.test(t)) return nilaiTidak;
  return undefined;
}

export function bacaKesimpulan(v: unknown): string | null {
  const t = norm(v);
  if (!t) return null;
  if (KESIMPULAN.some((k) => k.nilai === t)) return t;
  if (t.includes('lab')) return 'perlu_lab';
  if (t.includes('tidak')) return 'tidak_memenuhi';
  if (t.includes('memenuhi')) return 'memenuhi';
  return null;
}

export function validasiPemeriksaan(raw: Record<string, any>, o: { wilayah: string }): Hasil {
  try {
    if (!KODE_WILAYAH.includes(o.wilayah)) throw new Error('Wilayah kerja tidak dikenal');

    const tgl = parseTanggalCkg(raw.tanggal);
    if (!tgl) throw new Error('Tanggal pemeriksaan tidak terbaca');
    if (tgl.getTime() > Date.now() + 2 * 86400000) throw new Error('Tanggal pemeriksaan di masa depan');

    const item: Record<string, Record<string, any>> = raw.item ?? {};
    const hasil: HasilRow[] = [];
    const tidakMemenuhi: string[] = [];
    const kosong = (v: string) => (v ? v : null);

    // B. wajib diisi semua; yang tidak memenuhi wajib ada rekomendasi/tindak lanjut
    ITEM_B.forEach((b, i) => {
      const x = item[b.kode] ?? {};
      const s = baca(x.status, MEMENUHI, TIDAK_MEMENUHI, 'memenuhi', 'tidak_memenuhi');
      if (s === undefined) throw new Error(`Bagian B no. ${i + 1}: isi dengan Memenuhi atau Tidak memenuhi`);
      if (s === null) throw new Error(`Bagian B no. ${i + 1} belum diisi`);
      const tl = teks(x.tindak_lanjut, 1000, `Rekomendasi B no. ${i + 1}`);
      if (s === 'tidak_memenuhi') {
        if (!tl) throw new Error(`Bagian B no. ${i + 1} tidak memenuhi: rekomendasi/tindak lanjut wajib diisi`);
        tidakMemenuhi.push(b.kode);
      }
      hasil.push({
        bagian: 'B', kode: b.kode, hasil: null, batas_teks: null, status: s,
        keterangan: kosong(teks(x.keterangan, 1000, `Keterangan B no. ${i + 1}`)), tindak_lanjut: kosong(tl),
      });
    });

    // C. opsional; diisi hanya jika ada hasil/SBMKL/status
    ITEM_C.forEach((c, i) => {
      const x = item[c.kode] ?? {};
      const h = angka(x.hasil);
      if (h != null && (Number.isNaN(h) || h < c.min || h > c.max))
        throw new Error(`Bagian C no. ${i + 1} (${c.label}): hasil harus angka ${c.min} sampai ${c.max}`);
      const batas = teks(x.batas, 40, `Nilai SBMKL C no. ${i + 1}`);
      const s = baca(x.status, MEMENUHI, TIDAK_MEMENUHI, 'memenuhi', 'tidak_memenuhi');
      if (s === undefined) throw new Error(`Bagian C no. ${i + 1}: status harus Memenuhi atau Tidak memenuhi`);
      if (h == null && !batas && !s) return;
      if (s === 'tidak_memenuhi') tidakMemenuhi.push(c.kode);
      hasil.push({ bagian: 'C', kode: c.kode, hasil: h, batas_teks: kosong(batas), status: s, keterangan: null, tindak_lanjut: null });
    });

    // D. wajib diisi semua
    ITEM_D.forEach((d, i) => {
      const x = item[d.kode] ?? {};
      const s = baca(x.status, ADA, TIDAK_ADA, 'ada', 'tidak_ada');
      if (s === undefined) throw new Error(`Bagian D no. ${i + 1}: isi dengan Ada atau Tidak`);
      if (s === null) throw new Error(`Bagian D no. ${i + 1} belum diisi`);
      hasil.push({
        bagian: 'D', kode: d.kode, hasil: null, batas_teks: null, status: s,
        keterangan: kosong(teks(x.keterangan, 1000, `Keterangan D no. ${i + 1}`)),
        tindak_lanjut: kosong(teks(x.tindak_lanjut, 1000, `Tindak lanjut D no. ${i + 1}`)),
      });
    });

    // E. hanya parameter yang ada hasilnya; status dihitung otomatis dari SBMKL
    ITEM_E.forEach((e, i) => {
      const h = angka((item[e.kode] ?? {}).hasil);
      if (h == null) return;
      if (Number.isNaN(h) || h < 0) throw new Error(`Bagian E no. ${i + 1} (${e.label}): hasil harus angka 0 atau lebih`);
      const s = statusLab(h, e.batas);
      if (s === 'tidak_memenuhi') tidakMemenuhi.push(e.kode);
      hasil.push({ bagian: 'E', kode: e.kode, hasil: h, batas_teks: teksBatas(e.batas), status: s, keterangan: null, tindak_lanjut: null });
    });

    const kesimpulan = bacaKesimpulan(raw.kesimpulan);
    if (!kesimpulan) throw new Error('Kesimpulan pemeriksaan belum dipilih');
    if (kesimpulan === 'memenuhi' && tidakMemenuhi.length)
      throw new Error(`Kesimpulan "memenuhi" bertentangan dengan temuan tidak memenuhi (${tidakMemenuhi.join(', ')})`);

    return {
      ok: true,
      data: {
        header: {
          tanggal_periksa: keIsoTanggal(tgl),
          wilayah: o.wilayah,
          nama_pelabuhan: teks(raw.nama_pelabuhan, 150, 'Nama pelabuhan', true),
          area_lokasi: teks(raw.area_lokasi, 150, 'Area/lokasi pemeriksaan'),
          penanggung_jawab: teks(raw.penanggung_jawab, 150, 'Penanggung jawab'),
          alamat_titik: teks(raw.alamat_titik, 255, 'Alamat/lokasi titik'),
          petugas_pemeriksa: teks(raw.petugas_pemeriksa, 150, 'Nama petugas pemeriksa', true),
          kondisi_cuaca: teks(raw.kondisi_cuaca, 60, 'Kondisi cuaca'),
          jenis_kegiatan: teks(raw.jenis_kegiatan, 200, 'Jenis kegiatan'),
          kesimpulan,
          uraian_kesimpulan: teks(raw.uraian_kesimpulan, 2000, 'Uraian kesimpulan'),
        },
        hasil,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Data tidak valid' };
  }
}