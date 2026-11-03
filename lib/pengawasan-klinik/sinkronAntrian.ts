// lib/pengawasan-klinik/sinkronAntrian.ts
// Kirim antrian offline: unggah foto/tanda tangan dulu, lalu simpan data lewat server action.
import {
  adalahGalatJaringan,
  daftarRekam,
  hapusRekam,
  mediaKeBerkas,
  simpanRekam,
} from './antrianOffline';
import { unggahFotoAman } from './unggahAman';

type FungsiSimpan = (formData: FormData) => Promise<{ error?: string; peringatan?: string }>;

export type HasilSinkron = {
  terkirim: number;
  gagal: number;
  terputus: boolean; // berhenti karena sinyal putus
  peringatan: string[];
};

let sedangSinkron = false;

export async function sinkronkanAntrian(
  simpan: FungsiSimpan,
  opsi: { termasukGagal?: boolean } = {}
): Promise<HasilSinkron> {
  const hasilAkhir: HasilSinkron = { terkirim: 0, gagal: 0, terputus: false, peringatan: [] };
  if (sedangSinkron) return hasilAkhir;
  sedangSinkron = true;

  try {
    const semua = await daftarRekam();
    const dikirim = semua.filter((r) => opsi.termasukGagal || r.status !== 'gagal');

    for (const rekam of dikirim) {
      const fields = { ...rekam.fields };
      let media = [...rekam.media];
      await simpanRekam({ ...rekam, status: 'mengirim', pesan: undefined });

      try {
        // 1) unggah media satu per satu; kemajuan disimpan supaya tidak unggah ulang kalau terputus
        while (media.length > 0) {
          const m = media[0];
          const hasil = await unggahFotoAman(mediaKeBerkas(m), m.key, rekam.namaKlinik);
          fields[`foto_url_${m.key}`] = hasil.url;
          fields[`foto_public_id_${m.key}`] = hasil.publicId;
          media = media.slice(1);
          await simpanRekam({ ...rekam, fields, media, status: 'mengirim', pesan: undefined });
        }

        // 2) simpan data pengawasan
        const formData = new FormData();
        Object.entries(fields).forEach(([k, v]) => formData.set(k, v));
        const hasil = await simpan(formData);

        if (hasil.error) {
          await simpanRekam({ ...rekam, fields, media, status: 'gagal', pesan: hasil.error });
          hasilAkhir.gagal += 1;
          continue;
        }
        await hapusRekam(rekam.id);
        hasilAkhir.terkirim += 1;
        if (hasil.peringatan) hasilAkhir.peringatan.push(hasil.peringatan);
      } catch (err) {
        const pesan = err instanceof Error ? err.message : 'Gagal mengirim';
        if (adalahGalatJaringan(err)) {
          await simpanRekam({ ...rekam, fields, media, status: 'menunggu', pesan });
          hasilAkhir.terputus = true;
          break; // sinyal putus: jangan lanjut ke data berikutnya
        }
        await simpanRekam({ ...rekam, fields, media, status: 'gagal', pesan });
        hasilAkhir.gagal += 1;
      }
    }
    return hasilAkhir;
  } finally {
    sedangSinkron = false;
  }
}
