// lib/bandara-live/daftar.ts
// Daftar bandara yang bisa dipilih di dropdown jadwal live.
// Tambah bandara baru di sini dulu (tersedia: false), lalu tambahkan
// adapter datanya di lib/bandara-live/config.ts setelah endpoint ditemukan.

export type MetaBandara = {
  kode: string;   // kode internal, dipakai di query ?bandara=
  nama: string;   // nama tampilan
  iata: string;   // kode IATA bandara
  kota: string;
  tersedia: boolean; // false = belum ada sumber data live
};

export const DAFTAR_BANDARA: MetaBandara[] = [
  { kode: 'pranoto', nama: 'APT Pranoto', iata: 'AAP', kota: 'Samarinda', tersedia: true },
  { kode: 'sepinggan', nama: 'Sepinggan', iata: 'BPN', kota: 'Balikpapan', tersedia: true },
  // Contoh nambah bandara baru nanti:
  // { kode: 'juwata', nama: 'Juwata', iata: 'TRK', kota: 'Tarakan', tersedia: false },
];

export function getMetaBandara(kode: string): MetaBandara {
  return DAFTAR_BANDARA.find((b) => b.kode === kode) ?? DAFTAR_BANDARA[0];
}