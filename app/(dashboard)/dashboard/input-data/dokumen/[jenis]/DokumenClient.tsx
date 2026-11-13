'use client';
// app/(dashboard)/dashboard/input-data/dokumen/[jenis]/DokumenClient.tsx
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BATAS_UKURAN_BYTE,
  KONFIG,
  TIPE_BOLEH,
  type AlasanPhqc,
  type Berkas,
  type DokumenBaris,
  type JenisDokumen,
} from '@/lib/dokumen-pemeriksaan/konfigurasi';
import { cariKunciAction, hapusDokumenAction, simpanDokumenAction, sinkronkanAction } from '../actions';

const hariIni = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); // YYYY-MM-DD (WITA)

async function unggahKeCloudinary(jenis: JenisDokumen, file: File): Promise<Berkas> {
  const sig = await fetch('/api/dokumen-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jenis }),
  });
  const s = await sig.json();
  if (!sig.ok) throw new Error(s.error ?? 'Gagal meminta izin unggah.');

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', s.apiKey);
  fd.append('timestamp', String(s.timestamp));
  fd.append('signature', s.signature);
  fd.append('folder', s.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`, { method: 'POST', body: fd });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message ?? 'Unggah ke Cloudinary gagal.');
  return {
    url: j.secure_url as string,
    publicId: j.public_id as string,
    tipe: file.type === 'application/pdf' ? 'pdf' : 'image',
    ukuran: Number(j.bytes ?? file.size),
  };
}

export default function DokumenClient({
  jenis,
  daftar,
  wilayah,
  role,
}: {
  jenis: JenisDokumen;
  daftar: DokumenBaris[];
  wilayah: string[];
  role: string;
}) {
  const router = useRouter();
  const konfig = KONFIG[jenis];
  const inputBerkas = useRef<HTMLInputElement>(null);
  const [pending, mulai] = useTransition();

  const [kunci, setKunci] = useState('');
  const [namaKapal, setNamaKapal] = useState('');
  const [wilayahKerja, setWilayahKerja] = useState('');
  const [tanggal, setTanggal] = useState(hariIni());
  const [keterangan, setKeterangan] = useState('');
  const [tglKedatangan, setTglKedatangan] = useState('');
  const [alasan, setAlasan] = useState<AlasanPhqc | ''>('');
  const [berkas, setBerkas] = useState<File[]>([]);
  const [infoKunci, setInfoKunci] = useState('');
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [hanyaBelum, setHanyaBelum] = useState(false);

  async function cekKunci() {
    if (!kunci.trim()) return setInfoKunci('');
    const h = await cariKunciAction(jenis, kunci);
    if (h.ditemukan) {
      setInfoKunci('Sudah ada di data besar; nama kapal dan wilayah diisi otomatis.');
      if (!namaKapal) setNamaKapal(h.namaKapal ?? '');
      if (!wilayahKerja && h.wilayahKerja) setWilayahKerja(h.wilayahKerja);
    } else {
      setInfoKunci('Belum ada di data besar. Dokumen tetap disimpan dan akan tersinkron setelah data SINKARKES diunggah.');
    }
  }

  function pilihBerkas(files: FileList | null) {
    const baru = Array.from(files ?? []);
    for (const f of baru) {
      if (!TIPE_BOLEH.includes(f.type)) return setPesan({ ok: false, teks: `${f.name}: hanya PDF, JPG, PNG, atau WEBP.` });
      if (f.size > BATAS_UKURAN_BYTE) return setPesan({ ok: false, teks: `${f.name}: maksimal 10 MB.` });
    }
    setPesan(null);
    setBerkas(baru.slice(0, 10));
  }

  async function simpan() {
    setPesan(null);
    if (berkas.length === 0) return setPesan({ ok: false, teks: 'Pilih minimal satu berkas (PDF atau foto).' });
    setSibuk(true);
    try {
      const hasilUnggah: Berkas[] = [];
      for (const f of berkas) hasilUnggah.push(await unggahKeCloudinary(jenis, f));

      const h = await simpanDokumenAction({
        jenis,
        kunci,
        namaKapal,
        wilayahKerja,
        tanggalPemeriksaan: tanggal,
        keterangan,
        tanggalKedatangan: jenis === 'phqc' ? tglKedatangan : undefined,
        alasanPhqc: jenis === 'phqc' && alasan ? alasan : undefined,
        berkas: hasilUnggah,
      });
      if (h.ok) {
        setPesan({ ok: true, teks: h.pesan });
        setKunci('');
        setNamaKapal('');
        setKeterangan('');
        setTglKedatangan('');
        setAlasan('');
        setBerkas([]);
        setInfoKunci('');
        if (inputBerkas.current) inputBerkas.current.value = '';
        router.refresh();
      } else {
        setPesan({ ok: false, teks: h.galat });
      }
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : 'Terjadi kesalahan saat mengunggah.' });
    } finally {
      setSibuk(false);
    }
  }

  const tampil = hanyaBelum ? daftar.filter((d) => !d.adaDiData) : daftar;
  const jmlBelum = daftar.filter((d) => !d.adaDiData).length;
  const kelasInput = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
        <h1 className="text-xl font-bold text-[#0F2A38]">{konfig.judul}</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Unggah hasil pemeriksaan (PDF atau foto) pada hari pemeriksaan. Dokumen otomatis terhubung ke data besar
          setelah data SINKARKES diunggah.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-[#0F2A38]">{konfig.labelKunci} *</span>
            <input
              className={kelasInput}
              value={kunci}
              onChange={(e) => setKunci(e.target.value)}
              onBlur={cekKunci}
              placeholder={`Isi / scan ${konfig.labelKunci}`}
            />
            {infoKunci && <span className="mt-1 block text-xs text-gray-500">{infoKunci}</span>}
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[#0F2A38]">Nama kapal</span>
            <input className={kelasInput} value={namaKapal} onChange={(e) => setNamaKapal(e.target.value)} />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[#0F2A38]">Wilayah kerja *</span>
            <select className={kelasInput} value={wilayahKerja} onChange={(e) => setWilayahKerja(e.target.value)}>
              <option value="">Pilih wilayah kerja</option>
              {wilayah.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
              {wilayahKerja && !wilayah.includes(wilayahKerja) && <option value={wilayahKerja}>{wilayahKerja}</option>}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[#0F2A38]">Tanggal pemeriksaan *</span>
            <input type="date" className={kelasInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </label>

          {jenis === 'phqc' && (
            <>
              <label className="block text-sm">
                <span className="font-medium text-[#0F2A38]">Alasan pemeriksaan PHQC *</span>
                <select className={kelasInput} value={alasan} onChange={(e) => setAlasan(e.target.value as AlasanPhqc | '')}>
                  <option value="">Pilih alasan</option>
                  <option value="lebih_14_hari">Lebih dari 14 hari sejak kedatangan</option>
                  <option value="daerah_terjangkit">Dari daerah terjangkit</option>
                </select>
              </label>
              {alasan === 'lebih_14_hari' && (
                <label className="block text-sm">
                  <span className="font-medium text-[#0F2A38]">Tanggal kedatangan *</span>
                  <input type="date" className={kelasInput} value={tglKedatangan} onChange={(e) => setTglKedatangan(e.target.value)} />
                </label>
              )}
            </>
          )}

          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-[#0F2A38]">Keterangan</span>
            <input className={kelasInput} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-[#0F2A38]">Berkas hasil pemeriksaan * (PDF/JPG/PNG, maks. 10 MB, hingga 10 berkas)</span>
            <input
              ref={inputBerkas}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              capture={undefined}
              onChange={(e) => pilihBerkas(e.target.files)}
              className="mt-1 block w-full text-sm"
            />
            {berkas.length > 0 && <span className="mt-1 block text-xs text-gray-500">{berkas.length} berkas dipilih</span>}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={simpan}
            disabled={sibuk}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
          >
            {sibuk ? 'Mengunggah…' : 'Simpan dokumen'}
          </button>
          {pesan && <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</span>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0F2A38]">Dokumen {konfig.label} yang sudah diunggah</h2>
            <p className="text-xs text-gray-500">
              {daftar.length} dokumen, {jmlBelum} belum ada di data besar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={hanyaBelum} onChange={(e) => setHanyaBelum(e.target.checked)} />
              Hanya yang belum sinkron
            </label>
            <button
              disabled={pending}
              onClick={() =>
                mulai(async () => {
                  const h = await sinkronkanAction(jenis);
                  setPesan({ ok: h.ok, teks: h.ok ? h.pesan : h.galat });
                  router.refresh();
                })
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F2A38] hover:bg-gray-50 disabled:opacity-60"
            >
              Sinkronkan sekarang
            </button>
          </div>
        </div>

        {tampil.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-400">Belum ada dokumen</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">{konfig.labelKunci}</th>
                  <th className="py-2 pr-3">Kapal</th>
                  <th className="py-2 pr-3">Wilayah</th>
                  {jenis === 'phqc' && <th className="py-2 pr-3">Alasan</th>}
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Berkas</th>
                  <th className="py-2 pr-3">Diunggah oleh</th>
                  {role === 'admin' && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {tampil.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="whitespace-nowrap py-2 pr-3">{d.tanggal}</td>
                    <td className="py-2 pr-3 font-mono">{d.kunci}</td>
                    <td className="py-2 pr-3">{d.namaKapal}</td>
                    <td className="py-2 pr-3">{d.wilayahKerja}</td>
                    {jenis === 'phqc' && (
                      <td className="py-2 pr-3">{d.alasanPhqc === 'lebih_14_hari' ? '> 14 hari' : d.alasanPhqc === 'daerah_terjangkit' ? 'Daerah terjangkit' : ''}</td>
                    )}
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 ${d.adaDiData ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {d.adaDiData ? 'Sinkron' : 'Belum ada di data besar'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0F4C5C] underline">
                        {d.tipe === 'pdf' ? 'PDF' : 'Gambar'}
                      </a>
                    </td>
                    <td className="py-2 pr-3">{d.diunggahOleh}</td>
                    {role === 'admin' && (
                      <td className="py-2">
                        <button
                          disabled={pending}
                          onClick={() => {
                            if (!confirm('Hapus dokumen ini?')) return;
                            mulai(async () => {
                              const h = await hapusDokumenAction(jenis, d.id);
                              setPesan({ ok: h.ok, teks: h.ok ? h.pesan : h.galat });
                              router.refresh();
                            });
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}