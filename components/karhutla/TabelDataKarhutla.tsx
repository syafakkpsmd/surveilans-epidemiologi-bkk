'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { unduhCsv } from '@/lib/karhutla/csv';
import {
  DAFTAR_WILAYAH_KARHUTLA,
  NAMA_WILKER,
  hitungStatusEvaluasi,
  LABEL_STATUS,
} from '@/lib/karhutla/constants';
import { simpanIspaHarian, simpanKualitasUdaraHarian, hapusIspaHarian, hapusKualitasUdaraHarian } from '@/lib/supabase/queries-karhutla-client';
import type {
  BarisTabelIspa,
  BarisTabelKualitasUdara,
  WilayahIspaRow,
  LokasiUdaraRow,
} from '@/lib/supabase/queries-karhutla-server';

const STATUS_ISPU = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'] as const;

function labelWilayah(kodeWilker: string, zona: string | null): string {
  const entri = DAFTAR_WILAYAH_KARHUTLA.find((w) =>
    zona ? w.kode_wilker === kodeWilker && w.zona === zona : w.kode_wilker === kodeWilker && !w.zona
  );
  return entri?.label ?? `${kodeWilker}${zona ? ` (${zona})` : ''}`;
}

function formatTanggal(tanggal: string): string {
  return new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Unduh data yang sudah ada sebagai file .xlsx (bukan template kosong) */
function unduhExcel<T extends Record<string, unknown>>(
  namaFile: string,
  namaSheet: string,
  kolom: { key: keyof T; label: string }[],
  baris: T[]
) {
  const header = kolom.map((k) => k.label);
  const isi = baris.map((b) => kolom.map((k) => b[k.key] ?? ''));
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...isi]);
  worksheet['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 4, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet);
  XLSX.writeFile(workbook, namaFile);
}

// ================================================================
// Modal Edit — Kasus ISPA
// ================================================================
function ModalEditIspa({
  baris,
  daftarWilayah,
  onClose,
  onSaved,
}: {
  baris: BarisTabelIspa;
  daftarWilayah: WilayahIspaRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const wilayahAwal = daftarWilayah.find((w) => w.kode_wilker === baris.kode_wilker && w.zona === baris.zona);

  const [tanggal, setTanggal] = useState(baris.tanggal);
  const [wilayahId, setWilayahId] = useState(wilayahAwal?.id ?? daftarWilayah[0]?.id ?? '');
  const [kasusAnak, setKasusAnak] = useState(String(baris.kasus_ispa_anak));
  const [kasusDewasa, setKasusDewasa] = useState(String(baris.kasus_ispa_dewasa));
  const [keterangan, setKeterangan] = useState(baris.keterangan ?? '');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);

  const wilayahTerkelompok = daftarWilayah.reduce<Record<string, WilayahIspaRow[]>>((acc, w) => {
    const namaInduk = NAMA_WILKER[w.kode_wilker] ?? w.kode_wilker;
    (acc[namaInduk] ??= []).push(w);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null);
    const wilayah = daftarWilayah.find((w) => w.id === wilayahId);
    if (!wilayah) { setPesanError('Wilayah tidak valid.'); return; }

    setMenyimpan(true);
    try {
      // simpanIspaHarian melakukan UPSERT (unique: tanggal+kode_wilker+zona),
      // jadi kalau tanggal/wilayah tidak diubah, ini otomatis meng-update
      // baris yang sama. Kalau tanggal/wilayah diubah ke kombinasi baru,
      // baris asli TIDAK terhapus -- akan tersisa baris lama + baris baru.
      await simpanIspaHarian({
        tanggal,
        kode_wilker: wilayah.kode_wilker,
        zona: wilayah.zona,
        kasus_ispa_anak: Number(kasusAnak) || 0,
        kasus_ispa_dewasa: Number(kasusDewasa) || 0,
        keterangan: keterangan || null,
      });
      onSaved();
    } catch (err) {
      setPesanError((err as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  const tanggalOrWilayahBerubah = tanggal !== baris.tanggal || wilayahId !== wilayahAwal?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Edit Data Kasus ISPA</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah</label>
              <select value={wilayahId} onChange={(e) => setWilayahId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {Object.entries(wilayahTerkelompok).map(([induk, items]) => (
                  <optgroup key={induk} label={induk}>
                    {items.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kasus ISPA Anak</label>
              <input type="number" min={0} value={kasusAnak} onChange={(e) => setKasusAnak(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kasus ISPA Dewasa</label>
              <input type="number" min={0} value={kasusDewasa} onChange={(e) => setKasusDewasa(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          {tanggalOrWilayahBerubah && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Tanggal/wilayah diubah -- ini akan membuat baris baru, baris lama (
              {formatTanggal(baris.tanggal)}, {labelWilayah(baris.kode_wilker, baris.zona)}) tetap ada dan perlu
              dihapus manual jika memang salah input.
            </p>
          )}

          {pesanError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{pesanError}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={menyimpan}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {menyimpan ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// Modal Edit — Kualitas Udara
// ================================================================
function ModalEditUdara({
  baris,
  daftarLokasi,
  onClose,
  onSaved,
}: {
  baris: BarisTabelKualitasUdara;
  daftarLokasi: LokasiUdaraRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tanggal, setTanggal] = useState(baris.tanggal);
  const [lokasi, setLokasi] = useState(baris.lokasi);
  const [pm25, setPm25] = useState(baris.pm25?.toString() ?? '');
  const [pm10, setPm10] = useState(baris.pm10?.toString() ?? '');
  const [suhu, setSuhu] = useState(baris.suhu?.toString() ?? '');
  const [hcho, setHcho] = useState(baris.hcho?.toString() ?? '');
  const [tvoc, setTvoc] = useState(baris.tvoc?.toString() ?? '');
  const [kelembapan, setKelembapan] = useState(baris.kelembapan?.toString() ?? '');
  const [ispuStatus, setIspuStatus] = useState(baris.ispu_status ?? '');
  const [catatanEvaluasi, setCatatanEvaluasi] = useState(baris.catatan_evaluasi ?? '');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);

  const toNum = (v: string) => (v === '' ? null : Number(v));
  const dataUntukStatus = {
    pm25: toNum(pm25), pm10: toNum(pm10), suhu: toNum(suhu),
    hcho: toNum(hcho), tvoc: toNum(tvoc), kelembapan: toNum(kelembapan),
  };
  const statusPreview = hitungStatusEvaluasi(dataUntukStatus);

  const lokasiTerkelompok = daftarLokasi.reduce<Record<string, LokasiUdaraRow[]>>((acc, l) => {
    const kunci = l.lokasi_induk ?? 'Lainnya'; // atau label lain sesuai konteks, misal 'Tanpa Induk'
    (acc[kunci] ??= []).push(l);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null);
    setMenyimpan(true);
    try {
      // simpanKualitasUdaraHarian melakukan UPSERT (unique: tanggal+lokasi).
      await simpanKualitasUdaraHarian({
        tanggal, lokasi, ...dataUntukStatus,
        ispu_status: ispuStatus || null,
        catatan_evaluasi: catatanEvaluasi || null,
        status_evaluasi: statusPreview,
      });
      onSaved();
    } catch (err) {
      setPesanError((err as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  const tanggalOrLokasiBerubah = tanggal !== baris.tanggal || lokasi !== baris.lokasi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Edit Data Kualitas Udara</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
              <select value={lokasi} onChange={(e) => setLokasi(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(lokasiTerkelompok).map(([induk, items]) => (
                  <optgroup key={induk} label={induk}>
                    {items.map((l) => <option key={l.id} value={l.nama}>{l.sub_lokasi ?? l.lokasi_induk}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PM2.5 (µg/m³)</label>
              <input type="number" min={0} step="0.1" value={pm25} onChange={(e) => setPm25(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PM10 (µg/m³)</label>
              <input type="number" min={0} step="0.1" value={pm10} onChange={(e) => setPm10(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suhu (°C)</label>
              <input type="number" step="0.1" value={suhu} onChange={(e) => setSuhu(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HCHO (mg/m³)</label>
              <input type="number" min={0} step="0.001" value={hcho} onChange={(e) => setHcho(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TVOC (mg/m³)</label>
              <input type="number" min={0} step="0.001" value={tvoc} onChange={(e) => setTvoc(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelembapan (%)</label>
              <input type="number" min={0} max={100} step="1" value={kelembapan} onChange={(e) => setKelembapan(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status ISPU</label>
            <select value={ispuStatus} onChange={(e) => setIspuStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Belum ditentukan</option>
              {STATUS_ISPU.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Evaluasi</label>
            <textarea value={catatanEvaluasi} onChange={(e) => setCatatanEvaluasi(e.target.value)} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="text-sm text-gray-600">
            Kesimpulan/Status Evaluasi (otomatis): <strong>{LABEL_STATUS[statusPreview]}</strong>
          </div>

          {tanggalOrLokasiBerubah && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Tanggal/lokasi diubah -- ini akan membuat baris baru, baris lama ({formatTanggal(baris.tanggal)}, {baris.lokasi})
              tetap ada dan perlu dihapus manual jika memang salah input.
            </p>
          )}

          {pesanError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{pesanError}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={menyimpan}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {menyimpan ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// Modal Konfirmasi Hapus (generic, dipakai ISPA maupun Kualitas Udara)
// ================================================================
function ModalKonfirmasiHapus({
  judul,
  keterangan,
  onClose,
  onKonfirmasi,
}: {
  judul: string;
  keterangan: string;
  onClose: () => void;
  onKonfirmasi: () => Promise<void>;
}) {
  const [menghapus, setMenghapus] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);

  async function handleHapus() {
    setPesanError(null);
    setMenghapus(true);
    try {
      await onKonfirmasi();
    } catch (err) {
      setPesanError((err as Error).message);
      setMenghapus(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900">{judul}</h3>
        <p className="text-sm text-gray-600">{keterangan}</p>
        <p className="text-sm font-medium text-red-600">Data yang sudah dihapus tidak bisa dikembalikan.</p>

        {pesanError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{pesanError}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={menghapus}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Batal
          </button>
          <button type="button" onClick={handleHapus} disabled={menghapus}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed">
            {menghapus ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Komponen utama
// ================================================================
export default function TabelDataKarhutla({
  dataIspa,
  dataUdara,
  bolehKelola = false,
  daftarWilayah = [],
  daftarLokasi = [],
}: {
  dataIspa: BarisTabelIspa[];
  dataUdara: BarisTabelKualitasUdara[];
  bolehKelola?: boolean;
  daftarWilayah?: WilayahIspaRow[];
  daftarLokasi?: LokasiUdaraRow[];
}) {
  const router = useRouter();
  const [editIspa, setEditIspa] = useState<BarisTabelIspa | null>(null);
  const [editUdara, setEditUdara] = useState<BarisTabelKualitasUdara | null>(null);
  const [hapusIspaAktif, setHapusIspaAktif] = useState<BarisTabelIspa | null>(null);
  const [hapusUdaraAktif, setHapusUdaraAktif] = useState<BarisTabelKualitasUdara | null>(null);

  function tutupModalDanRefresh() {
    setEditIspa(null);
    setEditUdara(null);
    router.refresh();
  }

  async function konfirmasiHapusIspa() {
    if (!hapusIspaAktif) return;
    await hapusIspaHarian(hapusIspaAktif.id);
    setHapusIspaAktif(null);
    router.refresh();
  }

  async function konfirmasiHapusUdara() {
    if (!hapusUdaraAktif) return;
    await hapusKualitasUdaraHarian(hapusUdaraAktif.id);
    setHapusUdaraAktif(null);
    router.refresh();
  }

  function unduhIspa() {
    unduhCsv(
      `ispa-harian-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'wilayah', label: 'Wilayah' },
        { key: 'kasus_ispa_anak', label: 'Kasus ISPA Anak' },
        { key: 'kasus_ispa_dewasa', label: 'Kasus ISPA Dewasa' },
        { key: 'keterangan', label: 'Keterangan' },
      ],
      dataIspa.map((d) => ({
        tanggal: d.tanggal,
        wilayah: labelWilayah(d.kode_wilker, d.zona),
        kasus_ispa_anak: d.kasus_ispa_anak,
        kasus_ispa_dewasa: d.kasus_ispa_dewasa,
        keterangan: d.keterangan ?? '',
      }))
    );
  }

  function unduhUdara() {
    unduhCsv(
      `kualitas-udara-harian-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'lokasi', label: 'Lokasi' },
        { key: 'pm25', label: 'PM2.5' },
        { key: 'pm10', label: 'PM10' },
        { key: 'suhu', label: 'Suhu' },
        { key: 'hcho', label: 'HCHO' },
        { key: 'tvoc', label: 'TVOC' },
        { key: 'kelembapan', label: 'Kelembapan' },
        { key: 'ispu_status', label: 'Status ISPU' },
        { key: 'status_evaluasi', label: 'Status Evaluasi' },
        { key: 'catatan_evaluasi', label: 'Catatan' },
      ],
      dataUdara.map((d) => ({
        tanggal: d.tanggal,
        lokasi: d.lokasi,
        pm25: d.pm25 ?? '',
        pm10: d.pm10 ?? '',
        suhu: d.suhu ?? '',
        hcho: d.hcho ?? '',
        tvoc: d.tvoc ?? '',
        kelembapan: d.kelembapan ?? '',
        ispu_status: d.ispu_status ?? '',
        status_evaluasi: d.status_evaluasi,
        catatan_evaluasi: d.catatan_evaluasi ?? '',
      }))
    );
  }

  function unduhIspaExcel() {
    unduhExcel(
      `ispa-harian-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'ISPA Harian',
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'wilayah', label: 'Wilayah' },
        { key: 'kasus_ispa_anak', label: 'Kasus ISPA Anak' },
        { key: 'kasus_ispa_dewasa', label: 'Kasus ISPA Dewasa' },
        { key: 'keterangan', label: 'Keterangan' },
      ],
      dataIspa.map((d) => ({
        tanggal: formatTanggal(d.tanggal),
        wilayah: labelWilayah(d.kode_wilker, d.zona),
        kasus_ispa_anak: d.kasus_ispa_anak,
        kasus_ispa_dewasa: d.kasus_ispa_dewasa,
        keterangan: d.keterangan ?? '',
      }))
    );
  }

  function unduhUdaraExcel() {
    unduhExcel(
      `kualitas-udara-harian-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Kualitas Udara',
      [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'lokasi', label: 'Lokasi' },
        { key: 'pm25', label: 'PM2.5' },
        { key: 'pm10', label: 'PM10' },
        { key: 'suhu', label: 'Suhu' },
        { key: 'hcho', label: 'HCHO' },
        { key: 'tvoc', label: 'TVOC' },
        { key: 'kelembapan', label: 'Kelembapan' },
        { key: 'ispu_status', label: 'Status ISPU' },
        { key: 'status_evaluasi', label: 'Status Evaluasi' },
        { key: 'catatan_evaluasi', label: 'Catatan' },
      ],
      dataUdara.map((d) => ({
        tanggal: formatTanggal(d.tanggal),
        lokasi: d.lokasi,
        pm25: d.pm25 ?? '',
        pm10: d.pm10 ?? '',
        suhu: d.suhu ?? '',
        hcho: d.hcho ?? '',
        tvoc: d.tvoc ?? '',
        kelembapan: d.kelembapan ?? '',
        ispu_status: d.ispu_status ?? '',
        status_evaluasi: d.status_evaluasi,
        catatan_evaluasi: d.catatan_evaluasi ?? '',
      }))
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= Tabel ISPA ================= */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data Kasus ISPA Harian</h2>
            <p className="text-xs text-gray-500">{dataIspa.length} baris</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={unduhIspaExcel}
              disabled={dataIspa.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Unduh Excel
            </button>
            <button
              onClick={unduhIspa}
              disabled={dataIspa.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Unduh CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-105">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Wilayah</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Anak</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Dewasa</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Keterangan</th>
                {bolehKelola && <th className="px-3 py-2 text-right font-medium text-gray-600">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataIspa.length === 0 ? (
                <tr><td colSpan={bolehKelola ? 6 : 5} className="px-3 py-6 text-center text-gray-400">Belum ada data.</td></tr>
              ) : (
                dataIspa.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                    <td className="px-3 py-2">{labelWilayah(d.kode_wilker, d.zona)}</td>
                    <td className="px-3 py-2 text-right">{d.kasus_ispa_anak}</td>
                    <td className="px-3 py-2 text-right">{d.kasus_ispa_dewasa}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{d.keterangan ?? '-'}</td>
                    {bolehKelola && (
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => setEditIspa(d)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setHapusIspaAktif(d)}
                          className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= Tabel Kualitas Udara ================= */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data Kualitas Udara Harian</h2>
            <p className="text-xs text-gray-500">{dataUdara.length} baris</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={unduhUdaraExcel}
              disabled={dataUdara.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Unduh Excel
            </button>
            <button
              onClick={unduhUdara}
              disabled={dataUdara.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Unduh CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-105">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Lokasi</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">PM2.5</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">PM10</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Suhu</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">HCHO</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">TVOC</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Lembap</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                {bolehKelola && <th className="px-3 py-2 text-right font-medium text-gray-600">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataUdara.length === 0 ? (
                <tr><td colSpan={bolehKelola ? 10 : 9} className="px-3 py-6 text-center text-gray-400">Belum ada data.</td></tr>
              ) : (
                dataUdara.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                    <td className="px-3 py-2">{d.lokasi}</td>
                    <td className="px-3 py-2 text-right">{d.pm25 ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.pm10 ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.suhu ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.hcho ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.tvoc ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{d.kelembapan ?? '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status_evaluasi === 'TMS'
                            ? 'bg-red-100 text-red-700'
                            : d.status_evaluasi === 'MS'
                            ? 'bg-green-100 text-green-700'
                            : d.status_evaluasi === 'TIDAK_LENGKAP'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                    const supabase = createServiceRoleClient();
                      </span>
                    </td>
                    {bolehKelola && (
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => setEditUdara(d)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setHapusUdaraAktif(d)}
                          className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editIspa && (
        <ModalEditIspa
          baris={editIspa}
          daftarWilayah={daftarWilayah}
          onClose={() => setEditIspa(null)}
          onSaved={tutupModalDanRefresh}
        />
      )}

      {editUdara && (
        <ModalEditUdara
          baris={editUdara}
          daftarLokasi={daftarLokasi}
          onClose={() => setEditUdara(null)}
          onSaved={tutupModalDanRefresh}
        />
      )}

      {hapusIspaAktif && (
        <ModalKonfirmasiHapus
          judul="Hapus Data Kasus ISPA?"
          keterangan={`${formatTanggal(hapusIspaAktif.tanggal)} · ${labelWilayah(hapusIspaAktif.kode_wilker, hapusIspaAktif.zona)} · Anak: ${hapusIspaAktif.kasus_ispa_anak}, Dewasa: ${hapusIspaAktif.kasus_ispa_dewasa}`}
          onClose={() => setHapusIspaAktif(null)}
          onKonfirmasi={konfirmasiHapusIspa}
        />
      )}

      {hapusUdaraAktif && (
        <ModalKonfirmasiHapus
          judul="Hapus Data Kualitas Udara?"
          keterangan={`${formatTanggal(hapusUdaraAktif.tanggal)} · ${hapusUdaraAktif.lokasi}`}
          onClose={() => setHapusUdaraAktif(null)}
          onKonfirmasi={konfirmasiHapusUdara}
        />
      )}
    </div>
  );
}