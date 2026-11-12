import 'server-only';
import { getDaftarWilker } from './server';
import { kunciNama, variasiTulisan } from './index';

/** Nilai wilayah apa pun (nama baru, nama lama, alias, kode) -> semua penulisan yang mungkin tersimpan di data. */
export async function variasiDariNilai(nilai: string): Promise<string[]> {
  const k = kunciNama(nilai);
  const w = (await getDaftarWilker()).find((x) => variasiTulisan(x).includes(k));
  return w ? variasiTulisan(w) : [k];
}