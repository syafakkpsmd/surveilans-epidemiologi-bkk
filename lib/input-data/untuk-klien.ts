import type { ModulInput } from '@/lib/input-data/modul';

// `turunan` adalah fungsi: tidak boleh dikirim ke komponen klien (server memakainya saat validasi).
export const untukKlien = (m: ModulInput): ModulInput => ({
  ...m,
  kolom: m.kolom.map((k) => ({ ...k, turunan: undefined })),
});