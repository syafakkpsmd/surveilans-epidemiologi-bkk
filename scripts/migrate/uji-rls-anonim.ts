// Uji regresi keamanan: pengunjung ANONIM (belum login) hanya boleh menulis ke tabel yang disetujui.
// Tanpa database. Jalankan: npx tsx --test scripts/migrate/uji-rls-anonim.ts
// Daftar di bawah SENGAJA ditulis ulang di sini (bukan diimpor dari buat-rls.mjs): bila seseorang
// menambah tabel ke ANONIM_BOLEH_TULIS, uji ini gagal dan memaksa keputusan itu ditinjau.
import test from 'node:test';
import assert from 'node:assert/strict';
import { putuskan } from '../../lib/db/rls';
import { POLICY_RLS } from '../../lib/db/rls-policy.generated';
import type { KonteksAuth } from '../../lib/db/rls';

const ANON: KonteksAuth = { uid: null, role: null };
const PETUGAS: KonteksAuth = { uid: '11111111-1111-1111-1111-111111111111', role: 'petugas' };
const KLINIK: KonteksAuth = { uid: '33333333-3333-3333-3333-333333333333', role: 'petugas_klinik' };
const ADMIN: KonteksAuth = { uid: '22222222-2222-2222-2222-222222222222', role: 'admin' };

const ANONIM_BOLEH: Record<string, string[]> = {
  ispa_harian: ['INSERT'], // formulir publik
  kualitas_udara_harian: ['INSERT'], // formulir publik
  kunjungan_tamu: ['INSERT'], // penghitung kunjungan
  statistik_kunjungan: ['INSERT'], // penghitung kunjungan
};
const PERINTAH_TULIS = ['INSERT', 'UPDATE', 'DELETE'] as const;

test('anonim DITOLAK menulis ke semua tabel kecuali daftar yang disetujui', () => {
  const salah: string[] = [];
  for (const tabel of Object.keys(POLICY_RLS)) {
    for (const cmd of PERINTAH_TULIS) {
      const izin = putuskan(tabel, cmd, ANON).izin !== 'tolak';
      const seharusnya = (ANONIM_BOLEH[tabel] ?? []).includes(cmd);
      if (izin !== seharusnya) salah.push(`${tabel} ${cmd}: anonim ${izin ? 'DIIZINKAN' : 'ditolak'}, seharusnya ${seharusnya ? 'diizinkan' : 'ditolak'}`);
    }
  }
  assert.deepEqual(salah, []);
});

test('tabel di luar POLICY_RLS (RLS aktif tanpa policy) tertutup untuk semua role, termasuk admin', () => {
  for (const k of [ANON, PETUGAS, KLINIK, ADMIN]) {
    for (const cmd of ['SELECT', ...PERINTAH_TULIS] as const) assert.equal(putuskan('pengaturan_ai', cmd, k).izin, 'tolak');
  }
});

test('pengguna login tetap bisa menulis di tabel yang sebelumnya terbuka untuk anonim', () => {
  for (const tabel of ['kegiatan_cop', 'kegiatan_pesawat', 'kegiatan_phqc', 'skdr_mingguan', 'laporan_penyakit_nasional']) {
    assert.notEqual(putuskan(tabel, 'INSERT', PETUGAS).izin, 'tolak', `${tabel} INSERT petugas`);
    assert.notEqual(putuskan(tabel, 'UPDATE', PETUGAS).izin, 'tolak', `${tabel} UPDATE petugas`);
  }
  // alur pengawasan klinik dikerjakan petugas_klinik: tidak boleh ikut terkunci
  assert.notEqual(putuskan('pengawasan_klinik', 'INSERT', KLINIK).izin, 'tolak');
  assert.notEqual(putuskan('pengawasan_klinik_dokumen', 'INSERT', KLINIK).izin, 'tolak');
});

test('membaca data publik tidak berubah (dashboard untuk tamu tetap jalan)', () => {
  for (const tabel of ['rat_guard', 'ispa_harian', 'kualitas_udara_harian', 'hotspot_nasa_kaltim']) {
    assert.notEqual(putuskan(tabel, 'SELECT', ANON).izin, 'tolak', `${tabel} SELECT anonim`);
  }
});

test('profiles: tidak ada jalur anonim; pengguna biasa hanya barisnya sendiri', () => {
  for (const cmd of ['SELECT', ...PERINTAH_TULIS] as const) assert.equal(putuskan('profiles', cmd, ANON).izin, 'tolak');
  assert.deepEqual(putuskan('profiles', 'UPDATE', PETUGAS), { izin: 'baris', kolom: 'id', nilai: PETUGAS.uid });
});
