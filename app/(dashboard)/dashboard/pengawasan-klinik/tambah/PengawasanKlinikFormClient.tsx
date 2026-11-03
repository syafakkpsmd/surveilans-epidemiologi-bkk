// app/(dashboard)/dashboard/pengawasan-klinik/tambah/PengawasanKlinikFormClient.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { simpanPengawasanKlinik } from '../actions';
import { unggahFotoAman } from '@/lib/pengawasan-klinik/unggahAman';
import {
  adalahGalatJaringan,
  berkasKeMedia,
  EVENT_ANTRIAN,
  idBaru,
  kompresGambar,
  simpanRekam,
} from '@/lib/pengawasan-klinik/antrianOffline';
import { ITEM_CHECKLIST } from '@/lib/pengawasan-klinik/itemChecklist';
import PadTandaTangan, { type PadTandaTanganHandle } from './PadTandaTangan';

type Klinik = { id: string; nama_klinik: string };



type FotoInfo = { url: string; publicId: string };

export default function PengawasanKlinikFormClient({ daftarKlinik }: { daftarKlinik: Klinik[] }) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fotoUploaded, setFotoUploaded] = useState<Record<string, FotoInfo>>({});
  const [sedangUpload, setSedangUpload] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [namaKlinikTerpilih, setNamaKlinikTerpilih] = useState('klinik');
  const [fotoLokal, setFotoLokal] = useState<Record<string, File>>({}); // foto belum terunggah (offline)
  const [online, setOnline] = useState(true);
  const [pesanAntrian, setPesanAntrian] = useState<string | null>(null);
  const refTtdBkk = useRef<PadTandaTanganHandle>(null);
  const refTtdKlinik = useRef<PadTandaTanganHandle>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const hidup = () => setOnline(true);
    const mati = () => setOnline(false);
    window.addEventListener('online', hidup);
    window.addEventListener('offline', mati);
    return () => {
      window.removeEventListener('online', hidup);
      window.removeEventListener('offline', mati);
    };
  }, []);

  const tanpaKunci = <T,>(obj: Record<string, T>, key: string): Record<string, T> =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

  function simpanFotoLokal(jenisDokumen: string, file: File) {
    setFotoLokal((prev) => ({ ...prev, [jenisDokumen]: file }));
    setFotoUploaded((prev) => tanpaKunci(prev, jenisDokumen));
  }

  async function handleUploadFoto(jenisDokumen: string, fileAsli: File) {
    setSedangUpload((prev) => ({ ...prev, [jenisDokumen]: true }));
    try {
      const file = await kompresGambar(fileAsli);
      if (!navigator.onLine) {
        simpanFotoLokal(jenisDokumen, file);
        return;
      }
      try {
        const hasil = await unggahFotoAman(file, jenisDokumen, namaKlinikTerpilih);
        setFotoUploaded((prev) => ({ ...prev, [jenisDokumen]: { url: hasil.url, publicId: hasil.publicId } }));
        setFotoLokal((prev) => tanpaKunci(prev, jenisDokumen));
      } catch (err) {
        if (adalahGalatJaringan(err)) simpanFotoLokal(jenisDokumen, file);
        else alert(`Gagal upload foto: ${(err as Error).message}`);
      }
    } finally {
      setSedangUpload((prev) => ({ ...prev, [jenisDokumen]: false }));
    }
  }

  function toggleChecklist(key: string, checked: boolean) {
    setChecklist((prev) => ({ ...prev, [key]: checked }));
    // kalau item di-uncheck lagi, foto yang sudah terupload untuk item itu
    // tidak perlu ikut dikirim -- tapi tetap dibiarkan di state (tidak dihapus),
    // supaya kalau user re-check tidak perlu upload ulang.
  }

  function kosongkanForm() {
    setChecklist({});
    setFotoUploaded({});
    setFotoLokal({});
    setStatus(null);
    setNamaKlinikTerpilih('klinik');
    refTtdBkk.current?.kosongkan();
    refTtdKlinik.current?.kosongkan();
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setPesanAntrian(null);
    Object.entries(checklist).forEach(([key, val]) => formData.set(key, String(val)));

    // media yang BELUM terunggah: foto yang diambil saat offline + tanda tangan
    const sisaMedia: { key: string; file: File }[] = Object.entries(fotoLokal)
      .filter(([key]) => key === 'cold_chain' || checklist[key] === true)
      .map(([key, file]) => ({ key, file }));
    for (const { key, ref } of [
      { key: 'ttd_petugas_bkk', ref: refTtdBkk },
      { key: 'ttd_petugas_klinik', ref: refTtdKlinik },
    ]) {
      const berkas = await ref.current?.ambilBerkas(key);
      if (berkas) sisaMedia.push({ key, file: berkas });
    }

    // url foto yang sudah terunggah
    Object.entries(fotoUploaded).forEach(([key, info]) => {
      formData.set(`foto_url_${key}`, info.url);
      formData.set(`foto_public_id_${key}`, info.publicId);
    });

    // ---- JALUR ONLINE ----
    if (navigator.onLine) {
      try {
        while (sisaMedia.length > 0) {
          const { key, file } = sisaMedia[0];
          const hasilUp = await unggahFotoAman(file, key, namaKlinikTerpilih);
          formData.set(`foto_url_${key}`, hasilUp.url);
          formData.set(`foto_public_id_${key}`, hasilUp.publicId);
          sisaMedia.shift();
        }
        const hasil = await simpanPengawasanKlinik(formData);
        setLoading(false);
        if (hasil.error) {
          alert(hasil.error);
          return;
        }
        if (hasil.peringatan) alert(hasil.peringatan);
        setStatus(hasil.status ?? null);
        return;
      } catch (err) {
        if (!adalahGalatJaringan(err)) {
          setLoading(false);
          alert(`Gagal menyimpan: ${err instanceof Error ? err.message : 'kesalahan tidak diketahui'}`);
          return;
        }
        // sinyal putus di tengah jalan -> simpan di perangkat (di bawah)
      }
    }

    // ---- OFFLINE / SINYAL PUTUS: simpan di perangkat, kirim otomatis nanti ----
    try {
      const fields: Record<string, string> = {};
      formData.forEach((nilai, kunci) => {
        if (typeof nilai === 'string') fields[kunci] = nilai;
      });
      const media = await Promise.all(sisaMedia.map((m) => berkasKeMedia(m.key, m.file)));
      await simpanRekam({
        id: idBaru(),
        dibuat: new Date().toISOString(),
        namaKlinik: namaKlinikTerpilih,
        fields,
        media,
        status: 'menunggu',
      });
      window.dispatchEvent(new Event(EVENT_ANTRIAN));
      setPesanAntrian(
        'Tersimpan di perangkat. Data akan dikirim otomatis saat ada sinyal (buka halaman ini lagi bila perlu).'
      );
      kosongkanForm();
    } catch (err) {
      alert(
        `Gagal menyimpan di perangkat: ${err instanceof Error ? err.message : 'penyimpanan tidak tersedia'}. ` +
          'Data belum tersimpan — jangan tutup halaman ini.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6">
      {!online && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Mode offline: isian, foto, dan tanda tangan disimpan di perangkat ini dan dikirim otomatis saat ada sinyal.
        </p>
      )}
      <div>
        <label className="block font-medium">Klinik/RS</label>
        <select
          name="klinik_id"
          required
          className="border rounded px-3 py-2 w-full"
          onChange={(e) => {
            const nama = daftarKlinik.find((k) => k.id === e.target.value)?.nama_klinik;
            setNamaKlinikTerpilih(nama ?? 'klinik');
          }}
        >
          <option value="">-- Pilih Klinik --</option>
          {daftarKlinik.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_klinik}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium">Tanggal Kegiatan Pengawasan</label>
        <input type="date" name="tanggal_kegiatan" required className="border rounded px-3 py-2 w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Waktu Mulai Layanan</label>
          <input type="time" name="waktu_mulai_layanan" className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block font-medium">Waktu Tutup Layanan</label>
          <input type="time" name="waktu_tutup_layanan" className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      <div>
        <label className="block font-medium">Nomor SIP Dokter</label>
        <input name="nomor_sip_dokter" className="border rounded px-3 py-2 w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Nomor SIO</label>
          <input name="nomor_sio" className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block font-medium">SIO Berlaku Sampai</label>
          <input type="date" name="sio_berlaku_sampai" className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      {(['Administrasi', 'Sarana', 'Peralatan'] as const).map((kategori) => (
        <fieldset key={kategori} className="border rounded p-3">
          <legend className="font-semibold px-2">{kategori}</legend>
          {ITEM_CHECKLIST.filter((i) => i.kategori === kategori).map((item) => {
            const sudahDicek = checklist[item.key] ?? false;
            const foto = fotoUploaded[item.key];
            const uploadBerjalan = sedangUpload[item.key] ?? false;

            return (
              <div key={item.key} className="py-1 border-b border-gray-100 last:border-b-0">
                <label className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={sudahDicek}
                    onChange={(e) => toggleChecklist(item.key, e.target.checked)}
                  />
                  {item.label}
                </label>

                {sudahDicek && (
                <div className="ml-6 mb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                    📷 {foto ? 'Ganti Foto' : 'Ambil/Pilih Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFoto(item.key, file);
                      }}
                    />
                  </label>

                  {uploadBerjalan && (
                    <p className="text-xs text-gray-500 mt-1">Mengupload…</p>
                  )}
                  {fotoLokal[item.key] && !uploadBerjalan && (
                    <p className="text-xs text-amber-700 mt-1">Foto tersimpan di perangkat (diunggah saat ada sinyal) ✓</p>
                  )}
                  {foto && !uploadBerjalan && (
                    <p className="text-xs text-green-600 mt-1">Foto terupload ✓</p>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="space-y-2">
        <label className="block font-medium">Nama Petugas</label>
        <input
          name="nama_petugas_1"
          placeholder="Nama Petugas BKK Kelas I Samarinda"
          className="border rounded px-3 py-2 w-full"
        />
        <input
          name="nama_petugas_2"
          placeholder="Nama Petugas BKK Kelas I Samarinda"
          className="border rounded px-3 py-2 w-full"
        />
        <input
          name="nama_petugas_3"
          placeholder="Nama Petugas BKK Kelas I Samarinda"
          className="border rounded px-3 py-2 w-full"
        />
        <input
          name="nama_petugas_klinik"
          placeholder="Nama Petugas Klinik yang di wawancarai"
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block font-medium">Catatan</label>
        <textarea name="catatan" rows={3} className="border rounded px-3 py-2 w-full" />
      </div>

      <div>
        <label className="block font-medium">Foto Cold Chain</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadFoto('cold_chain', file);
          }}
        />
        {fotoUploaded.cold_chain && <p className="text-sm text-green-600">Terupload ✓</p>}
        {fotoLokal.cold_chain && (
          <p className="text-sm text-amber-700">Tersimpan di perangkat (diunggah saat ada sinyal) ✓</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PadTandaTangan ref={refTtdBkk} label="Tanda Tangan Petugas BKK" />
        <PadTandaTangan ref={refTtdKlinik} label="Tanda Tangan Petugas Klinik" />
      </div>

      {pesanAntrian && (
        <p className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">{pesanAntrian}</p>
      )}

      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
        {loading ? 'Menyimpan...' : 'Simpan Pengawasan'}
      </button>

      {status && (
        <p className={
          status === 'memenuhi_syarat' ? 'text-green-600' :
          status === 'perlu_perbaikan' ? 'text-yellow-600' : 'text-red-600'
        }>
          Status kepatuhan: {status.replace(/_/g, ' ')}
        </p>
      )}
    </form>
  );
}