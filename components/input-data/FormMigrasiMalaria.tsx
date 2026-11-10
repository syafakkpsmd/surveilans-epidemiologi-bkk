'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BUANG_HAJAT, DAFTAR_GANDA, EKSKLUSIF, HASIL_RDT, JENIS_KELAMIN, PEKERJAAN, PENDIDIKAN, YA_TIDAK,
} from '@/lib/input-data/malaria-opsi';

type Wilayah = { kode: string; nama: string };

const WAJIB: Record<string, string> = {
  wilayah_kerja: 'Wilayah kerja', nama_kapal_pesawat: 'Nama kapal/pesawat', tanggal_kegiatan: 'Tanggal kegiatan',
  nama_lengkap: 'Nama lengkap', tanggal_lahir: 'Tanggal lahir', jenis_kelamin: 'Jenis kelamin', pekerjaan: 'Pekerjaan',
  pendidikan_terakhir: 'Pendidikan terakhir', alamat_asal: 'Alamat asal', alamat_tujuan: 'Alamat tujuan',
  pernah_sakit_malaria: 'Pernah sakit malaria', tahu_penyakit_malaria: 'Tahu tentang malaria', tahu_gejala_malaria: 'Tahu gejala malaria',
  sekitar_pernah_sakit_malaria: 'Ada yang pernah sakit malaria di sekitar', pernah_dapat_informasi_malaria: 'Pernah dapat informasi malaria',
  punya_ternak: 'Punya ternak', tempat_buang_hajat: 'Kebiasaan buang hajat', pakai_baju_panjang_repellent: 'Baju panjang/repellent malam hari',
  hasil_rdt: 'Hasil RDT',
};
const WAJIB_GANDA: Record<string, string> = {
  sekitar_dekat_dengan: 'Dekat dengan', pakai_saat_tidur: 'Perlindungan saat tidur', tempat_berobat: 'Tempat berobat',
};
/** Isian yang dipertahankan setelah simpan (satu kapal bisa punya banyak responden di hari yang sama). */
const KUNCI_KEGIATAN = ['wilayah_kerja', 'nama_kapal_pesawat', 'tanggal_kegiatan'];

const kotak =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2A38] outline-none transition focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20';

function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hitungUmur(lahir?: string, acuan?: string): string {
  if (!lahir) return '';
  const l = new Date(lahir);
  const a = acuan ? new Date(acuan) : new Date();
  if (isNaN(+l) || isNaN(+a)) return '';
  let u = a.getFullYear() - l.getFullYear();
  const b = a.getMonth() - l.getMonth();
  if (b < 0 || (b === 0 && a.getDate() < l.getDate())) u--;
  return u >= 0 ? String(u) : '';
}

function Kartu({ no, judul, keterangan, innerRef, children }: { no: number; judul: string; keterangan?: string; innerRef?: React.Ref<HTMLElement>; children: ReactNode }) {
  return (
    <section ref={innerRef} className="scroll-mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F4C5C] text-sm font-bold text-white">{no}</span>
        <div>
          <h2 className="text-base font-semibold text-[#0F2A38]">{judul}</h2>
          {keterangan && <p className="text-xs text-gray-500">{keterangan}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Label({ children, wajib = true, untuk }: { children: ReactNode; wajib?: boolean; untuk?: string }) {
  return (
    <label htmlFor={untuk} className="block text-sm font-medium text-[#0F2A38]">
      {children}
      {wajib && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const kelasChip = (aktif: boolean, warna?: string) =>
  `rounded-xl border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
    aktif ? warna ?? 'border-[#0F4C5C] bg-[#0F4C5C] text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-[#0F4C5C] hover:bg-[#0F4C5C]/5'
  }`;

function Pilihan({ label, opsi, nilai, onPilih, salah, warna }: {
  label: string; opsi: string[]; nilai?: string; onPilih: (o: string) => void; salah?: boolean; warna?: Record<string, string>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {opsi.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={nilai === o} onClick={() => onPilih(o)} className={kelasChip(nilai === o, warna?.[o])}>
            {o}
          </button>
        ))}
      </div>
      {salah && <p className="mt-1 text-xs text-red-600">Wajib dipilih</p>}
    </div>
  );
}

function PilihanGanda({ label, opsi, terpilih, onUbah, salah }: {
  label: string; opsi: string[]; terpilih: string[]; onUbah: (o: string) => void; salah?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-xs text-gray-400">Boleh lebih dari satu</p>
      <div role="group" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {opsi.map((o) => {
          const aktif = terpilih.includes(o);
          return (
            <button key={o} type="button" aria-pressed={aktif} onClick={() => onUbah(o)} className={kelasChip(aktif)}>
              {aktif ? '✓ ' : ''}{o}
            </button>
          );
        })}
      </div>
      {salah && <p className="mt-1 text-xs text-red-600">Pilih minimal satu</p>}
    </div>
  );
}

export default function FormMigrasiMalaria({ wilayah }: { wilayah: Wilayah[] }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>({});
  const [m, setM] = useState<Record<string, string[]>>({});
  const [umurManual, setUmurManual] = useState(false);
  const [coba, setCoba] = useState(false);
  const [kirim, setKirim] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: 'ok' | 'err'; teks: string; daftar?: string[] } | null>(null);
  const [tersimpan, setTersimpan] = useState<{ nama: string; kapal: string }[]>([]);
  const [total, setTotal] = useState(0);
  const refResponden = useRef<HTMLElement>(null);

  // Tanggal bawaan diisi di klien (menghindari beda zona waktu server dan browser).
  useEffect(() => { setV((s) => (s.tanggal_kegiatan ? s : { ...s, tanggal_kegiatan: hariIni() })); }, []);

  const set = (k: string, x: string) => setV((s) => ({ ...s, [k]: x }));
  const umurOtomatis = hitungUmur(v.tanggal_lahir, v.tanggal_kegiatan);
  const umur = umurManual ? v.umur ?? '' : umurOtomatis;

  function ubahGanda(k: string, o: string) {
    setM((s) => {
      const kini = s[k] ?? [];
      const eks = EKSKLUSIF[k];
      let baru: string[];
      if (kini.includes(o)) baru = kini.filter((x) => x !== o);
      else if (eks && o === eks) baru = [o];
      else baru = [...kini.filter((x) => x !== eks), o];
      return { ...s, [k]: DAFTAR_GANDA[k].filter((x) => baru.includes(x)) };
    });
  }

  const kosong = useMemo(
    () => [
      ...Object.keys(WAJIB).filter((k) => !v[k]?.trim()),
      ...Object.keys(WAJIB_GANDA).filter((k) => !m[k]?.length),
    ],
    [v, m],
  );
  const totalWajib = Object.keys(WAJIB).length + Object.keys(WAJIB_GANDA).length;
  const persen = Math.round(((totalWajib - kosong.length) / totalWajib) * 100);
  const salah = (k: string) => coba && kosong.includes(k);

  function resetResponden() {
    setV((s) => Object.fromEntries(KUNCI_KEGIATAN.map((k) => [k, s[k] ?? ''])));
    setM({});
    setUmurManual(false);
    setCoba(false);
  }

  async function simpan() {
    setCoba(true);
    setPesan(null);
    if (kosong.length) {
      setPesan({ tipe: 'err', teks: 'Masih ada isian wajib yang kosong:', daftar: kosong.map((k) => WAJIB[k] ?? WAJIB_GANDA[k]) });
      return;
    }
    setKirim(true);
    try {
      const nilai: Record<string, string | number | null> = {
        ...v,
        nama_lengkap: v.nama_lengkap.trim(),
        umur: umur === '' ? null : Number(umur),
      };
      for (const k of Object.keys(DAFTAR_GANDA)) nilai[k] = (m[k] ?? []).join(', ');

      const res = await fetch('/api/input-data/migrasi_malaria/baris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nilai }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPesan({ tipe: 'err', teks: j.error ?? 'Gagal menyimpan data.', daftar: Array.isArray(j.galat) ? j.galat : undefined });
        return;
      }
      setTersimpan((t) => [{ nama: v.nama_lengkap.trim(), kapal: v.nama_kapal_pesawat }, ...t].slice(0, 8));
      setTotal((n) => n + 1);
      setPesan({ tipe: 'ok', teks: `Tersimpan: ${v.nama_lengkap.trim()}. Silakan isi responden berikutnya.` });
      resetResponden();
      refResponden.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setPesan({ tipe: 'err', teks: 'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.' });
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-4 sm:px-6">
      <button type="button" onClick={() => router.back()} className="text-sm text-[#0F4C5C] underline">&larr; Kembali</button>

      <div className="rounded-2xl bg-linear-to-br from-[#0F2A38] to-[#0F4C5C] p-6 text-white shadow-sm">
        <p className="text-xs uppercase tracking-wide text-white/70">Surveilans Migrasi Malaria</p>
        <h1 className="mt-1 text-xl font-bold">Input Data Survei Responden</h1>
        <p className="mt-1 text-sm text-white/80">Satu formulir untuk satu responden. Data kapal/pesawat dan tanggal tetap terisi setelah simpan.</p>
        {total > 0 && <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs">{total} responden tersimpan di sesi ini</p>}
      </div>

      {pesan && (
        <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${pesan.tipe === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <p className="font-medium">{pesan.teks}</p>
          {pesan.daftar && <ul className="mt-1 list-disc pl-5 text-xs">{pesan.daftar.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      <Kartu no={1} judul="Kegiatan" keterangan="Berlaku untuk semua responden pada kapal/pesawat ini">
        <div>
          <Label untuk="wilayah_kerja">Wilayah kerja</Label>
          <select id="wilayah_kerja" className={`${kotak} mt-2`} value={v.wilayah_kerja ?? ''} onChange={(e) => set('wilayah_kerja', e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {wilayah.map((w) => <option key={w.kode} value={w.nama}>{w.nama}</option>)}
          </select>
          {salah('wilayah_kerja') && <p className="mt-1 text-xs text-red-600">Wajib dipilih</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label untuk="nama_kapal_pesawat">Nama kapal/pesawat</Label>
            <input id="nama_kapal_pesawat" className={`${kotak} mt-2`} value={v.nama_kapal_pesawat ?? ''} onChange={(e) => set('nama_kapal_pesawat', e.target.value)} />
            {salah('nama_kapal_pesawat') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
          </div>
          <div>
            <Label untuk="tanggal_kegiatan">Tanggal kegiatan</Label>
            <input id="tanggal_kegiatan" type="date" max={hariIni()} className={`${kotak} mt-2`} value={v.tanggal_kegiatan ?? ''} onChange={(e) => set('tanggal_kegiatan', e.target.value)} />
            {salah('tanggal_kegiatan') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
          </div>
        </div>
      </Kartu>

      <Kartu no={2} judul="Identitas responden" innerRef={refResponden}>
        <div>
          <Label untuk="nama_lengkap">Nama lengkap</Label>
          <input id="nama_lengkap" className={`${kotak} mt-2`} value={v.nama_lengkap ?? ''} onChange={(e) => set('nama_lengkap', e.target.value)} />
          {salah('nama_lengkap') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label untuk="tanggal_lahir">Tanggal lahir</Label>
            <input id="tanggal_lahir" type="date" max={hariIni()} className={`${kotak} mt-2`} value={v.tanggal_lahir ?? ''} onChange={(e) => set('tanggal_lahir', e.target.value)} />
            {salah('tanggal_lahir') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
          </div>
          <div>
            <Label untuk="umur" wajib={false}>Umur (tahun)</Label>
            <input
              id="umur" type="number" min={0} max={120} inputMode="numeric" className={`${kotak} mt-2`} value={umur}
              onChange={(e) => { setUmurManual(true); set('umur', e.target.value); }}
            />
            <p className="mt-1 text-xs text-gray-400">{umurManual ? 'Diisi manual' : 'Dihitung otomatis dari tanggal lahir'}</p>
          </div>
        </div>
        <Pilihan label="Jenis kelamin" opsi={JENIS_KELAMIN} nilai={v.jenis_kelamin} onPilih={(o) => set('jenis_kelamin', o)} salah={salah('jenis_kelamin')} />
        <Pilihan label="Pekerjaan" opsi={PEKERJAAN} nilai={v.pekerjaan} onPilih={(o) => set('pekerjaan', o)} salah={salah('pekerjaan')} />
        <Pilihan label="Pendidikan terakhir" opsi={PENDIDIKAN} nilai={v.pendidikan_terakhir} onPilih={(o) => set('pendidikan_terakhir', o)} salah={salah('pendidikan_terakhir')} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label untuk="alamat_asal">Alamat asal</Label>
            <input id="alamat_asal" className={`${kotak} mt-2`} value={v.alamat_asal ?? ''} onChange={(e) => set('alamat_asal', e.target.value)} />
            {salah('alamat_asal') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
          </div>
          <div>
            <Label untuk="alamat_tujuan">Alamat tujuan</Label>
            <input id="alamat_tujuan" className={`${kotak} mt-2`} value={v.alamat_tujuan ?? ''} onChange={(e) => set('alamat_tujuan', e.target.value)} />
            {salah('alamat_tujuan') && <p className="mt-1 text-xs text-red-600">Wajib diisi</p>}
          </div>
        </div>
      </Kartu>

      <Kartu no={3} judul="Pengetahuan tentang malaria">
        <Pilihan label="Apakah Saudara pernah sakit malaria?" opsi={YA_TIDAK} nilai={v.pernah_sakit_malaria} onPilih={(o) => set('pernah_sakit_malaria', o)} salah={salah('pernah_sakit_malaria')} />
        <Pilihan label="Apakah Saudara tahu tentang penyakit malaria?" opsi={YA_TIDAK} nilai={v.tahu_penyakit_malaria} onPilih={(o) => set('tahu_penyakit_malaria', o)} salah={salah('tahu_penyakit_malaria')} />
        <Pilihan label="Apakah Saudara tahu gejala penyakit malaria?" opsi={YA_TIDAK} nilai={v.tahu_gejala_malaria} onPilih={(o) => set('tahu_gejala_malaria', o)} salah={salah('tahu_gejala_malaria')} />
        <Pilihan label="Apakah di sekitar tempat tinggal Saudara ada yang pernah sakit malaria?" opsi={YA_TIDAK} nilai={v.sekitar_pernah_sakit_malaria} onPilih={(o) => set('sekitar_pernah_sakit_malaria', o)} salah={salah('sekitar_pernah_sakit_malaria')} />
        <Pilihan label="Apakah Saudara pernah mendapatkan informasi tentang penyakit malaria?" opsi={YA_TIDAK} nilai={v.pernah_dapat_informasi_malaria} onPilih={(o) => set('pernah_dapat_informasi_malaria', o)} salah={salah('pernah_dapat_informasi_malaria')} />
      </Kartu>

      <Kartu no={4} judul="Lingkungan dan perilaku">
        <PilihanGanda label="Apakah di sekitar tempat tinggal Saudara dekat dengan..." opsi={DAFTAR_GANDA.sekitar_dekat_dengan} terpilih={m.sekitar_dekat_dengan ?? []} onUbah={(o) => ubahGanda('sekitar_dekat_dengan', o)} salah={salah('sekitar_dekat_dengan')} />
        <Pilihan label="Apakah Saudara mempunyai binatang ternak di rumah? (sapi, kerbau, babi)" opsi={YA_TIDAK} nilai={v.punya_ternak} onPilih={(o) => set('punya_ternak', o)} salah={salah('punya_ternak')} />
        <Pilihan label="Dimanakah kebiasaan Saudara buang hajat?" opsi={BUANG_HAJAT} nilai={v.tempat_buang_hajat} onPilih={(o) => set('tempat_buang_hajat', o)} salah={salah('tempat_buang_hajat')} />
        <Pilihan label="Apakah Saudara terbiasa menggunakan baju panjang/repellent ketika keluar malam hari?" opsi={YA_TIDAK} nilai={v.pakai_baju_panjang_repellent} onPilih={(o) => set('pakai_baju_panjang_repellent', o)} salah={salah('pakai_baju_panjang_repellent')} />
        <PilihanGanda label="Ketika tidur malam hari, apakah Saudara memakai..." opsi={DAFTAR_GANDA.pakai_saat_tidur} terpilih={m.pakai_saat_tidur ?? []} onUbah={(o) => ubahGanda('pakai_saat_tidur', o)} salah={salah('pakai_saat_tidur')} />
        <PilihanGanda label="Ketika Saudara mengalami keluhan kesehatan, kemana Saudara melakukan pengobatan?" opsi={DAFTAR_GANDA.tempat_berobat} terpilih={m.tempat_berobat ?? []} onUbah={(o) => ubahGanda('tempat_berobat', o)} salah={salah('tempat_berobat')} />
      </Kartu>

      <Kartu no={5} judul="Pemeriksaan">
        <Pilihan
          label="Hasil pemeriksaan RDT" opsi={HASIL_RDT} nilai={v.hasil_rdt} onPilih={(o) => set('hasil_rdt', o)} salah={salah('hasil_rdt')}
          warna={{ Reaktif: 'border-red-600 bg-red-600 text-white shadow-sm', 'Non Reaktif': 'border-emerald-600 bg-emerald-600 text-white shadow-sm', Invalid: 'border-gray-500 bg-gray-500 text-white shadow-sm' }}
        />
      </Kartu>

      {tersimpan.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-2 text-sm font-semibold text-[#0F2A38]">Tersimpan di sesi ini</h2>
          <ul className="divide-y divide-gray-100 text-sm text-gray-700">
            {tersimpan.map((t, i) => (
              <li key={i} className="flex justify-between py-1.5"><span>{t.nama}</span><span className="text-gray-400">{t.kapal}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Kelengkapan isian</span><span>{persen}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#0F4C5C] transition-all" style={{ width: `${persen}%` }} />
            </div>
          </div>
          <button type="button" onClick={resetResponden} disabled={kirim} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Kosongkan</button>
          <button type="button" onClick={simpan} disabled={kirim} className="rounded-xl bg-[#0F4C5C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B3A46] disabled:opacity-60">
            {kirim ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}