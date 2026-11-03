'use client';

import { useState } from 'react';
import { registerPetugas } from '@/lib/auth/actions';
import type { PilihanKlinik } from '@/lib/db/queries/queriesMaster';

type JenisAkun = 'bkk' | 'poliklinik' | 'klinik_binaan';

const input =
  'w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]';

export default function FormDaftar({
  error,
  daftarPoliklinik,
  daftarKlinikBinaan,
}: {
  error?: string;
  daftarPoliklinik: PilihanKlinik[];
  daftarKlinikBinaan: PilihanKlinik[];
}) {
  const [jenis, setJenis] = useState<JenisAkun>('bkk');

  const daftarKlinik = jenis === 'poliklinik' ? daftarPoliklinik : daftarKlinikBinaan;

  return (
    <form
      action={registerPetugas}
      className="bg-white rounded-[10px] shadow-sm border border-black/5 p-6 space-y-4"
    >
      {error ? (
        <div className="rounded-lg bg-[#D62839]/10 border border-[#D62839]/30 px-3 py-2 text-sm text-[#D62839]">
          {error}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="nama" className="block text-sm font-medium text-[#0F2A38]">Nama Lengkap</label>
        <input id="nama" name="nama" required className={input} />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-[#0F2A38]">Email</label>
        <input id="email" name="email" type="email" required className={input} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-[#0F2A38]">Kata sandi</label>
        <input id="password" name="password" type="password" required minLength={8} className={input} />
      </div>

      <div className="space-y-1">
        <label htmlFor="jenis_akun" className="block text-sm font-medium text-[#0F2A38]">Daftar sebagai</label>
        <select
          id="jenis_akun"
          name="jenis_akun"
          value={jenis}
          onChange={(e) => setJenis(e.target.value as JenisAkun)}
          className={input}
        >
          <option value="bkk">Petugas BKK</option>
          <option value="poliklinik">Poliklinik</option>
          <option value="klinik_binaan">Klinik Binaan</option>
        </select>
      </div>

      {jenis === 'bkk' && (
        <div className="space-y-1">
          <label htmlFor="peran_bkk" className="block text-sm font-medium text-[#0F2A38]">Peran</label>
          <select id="peran_bkk" name="peran_bkk" defaultValue="petugas" className={input}>
            <option value="petugas">Petugas</option>
            <option value="petugas_klinik">Petugas Klinik</option>
          </select>
        </div>
      )}

      {jenis !== 'bkk' && (
        <div className="space-y-1">
          <label htmlFor="kode_klinik" className="block text-sm font-medium text-[#0F2A38]">
            {jenis === 'poliklinik' ? 'Nama Poliklinik' : 'Nama Klinik Binaan'}
          </label>
          <select
            key={jenis} /* reset pilihan saat jenis berganti */
            id="kode_klinik"
            name="kode_klinik"
            required
            defaultValue=""
            className={input}
          >
            <option value="" disabled>
              {daftarKlinik.length ? '— Pilih —' : 'Belum ada data terdaftar'}
            </option>
            {daftarKlinik.map((k) => (
              <option key={k.kode} value={k.kode}>{k.nama}</option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-[#0F2A38] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F4C5C]"
      >
        Daftar
      </button>
      <p className="text-xs text-[#0F2A38]/60 text-center">
        Akun Anda perlu disetujui Admin sebelum bisa digunakan.
      </p>
    </form>
  );
}