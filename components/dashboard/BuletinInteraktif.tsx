'use client';

// components/dashboard/BuletinInteraktif.tsx
import { useMemo, useState, useTransition } from 'react';
import { simpanRingkasanBuletin, tambahBuletin, ubahBuletin, hapusBuletin } from '@/app/(dashboard)/dashboard/buletin/actions';

export type BuletinInput = {
  tahun: number;
  minggu_ke: number | null;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
  ringkasan_eksekutif?: string;
};

export type BuletinItem = {
  id: string;
  tahun: number;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
  minggu_ke?: number;
  ringkasan_eksekutif?: string | null;
};

const MAKS_KARAKTER = 1200;

const NAMA_BULAN = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

// Skor "kebaruan": tahun, lalu minggu. Kalau minggu_ke kosong (mis. buletin bulanan),
// coba baca "minggu ke-N" atau nama bulan dari judul, supaya urutannya tetap benar.
function skorKebaruan(b: BuletinItem): number {
  let posisi = b.minggu_ke ?? 0;
  if (!b.minggu_ke) {
    const nama = (b.nama_kegiatan ?? '').toLowerCase();
    const m = nama.match(/minggu\s*(?:ke)?[-\s]*(\d{1,2})/);
    if (m) posisi = parseInt(m[1], 10);
    else {
      const idx = NAMA_BULAN.findIndex((x) => nama.includes(x));
      if (idx >= 0) posisi = (idx + 1) * 4.35; // perkiraan posisi minggu dalam tahun
    }
  }
  return b.tahun * 100 + posisi;
}

// Ubah tautan buletin menjadi URL yang bisa ditampilkan di iframe (viewer).
function urlViewer(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname;

    // Google Drive file
    const drive = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (host.includes('drive.google.com') && drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
    if (host.includes('drive.google.com') && u.searchParams.get('id'))
      return `https://drive.google.com/file/d/${u.searchParams.get('id')}/preview`;

    // Google Docs / Slides / Sheets
    if (host.includes('docs.google.com')) {
      if (u.pathname.includes('/presentation/')) return url.replace(/\/(edit|view|pub).*$/, '/embed');
      return url.replace(/\/(edit|view).*$/, '/preview');
    }

    // YouTube
    if (host.includes('youtube.com') && u.searchParams.get('v'))
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;

    // Canva
    if (host.includes('canva.com') && !u.searchParams.has('embed')) {
      u.searchParams.set('embed', '');
      return u.toString();
    }

    return url; // PDF langsung & lainnya
  } catch {
    return url;
  }
}

export default function BuletinInteraktif({
  data: dataAwal,
  isPetugasAtauAdmin,
}: {
  data: BuletinItem[];
  isPetugasAtauAdmin: boolean;
}) {
  // Daftar buletin disimpan di state agar tambah/ubah/hapus langsung terlihat tanpa muat ulang
  const [data, setData] = useState<BuletinItem[]>(dataAwal);
  const [q, setQ] = useState('');
  const [tahun, setTahun] = useState<string>('semua');
  const [tipe, setTipe] = useState<string>('semua');
  const [urut, setUrut] = useState<'terbaru' | 'terlama'>('terbaru');
  const [hanyaBerRingkasan, setHanyaBerRingkasan] = useState(false);

  // ringkasan lokal (optimistic) -- menimpa data dari server setelah disimpan
  const [ringkasanLokal, setRingkasanLokal] = useState<Record<string, string>>({});
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  // Buletin terbaru (dari seluruh data, bukan hasil filter)
  const idTerbaru = useMemo(
    () => (data.length ? [...data].sort((a, b) => skorKebaruan(b) - skorKebaruan(a))[0].id : null),
    [data],
  );
  // Hanya satu pratinjau aktif; awalnya otomatis buletin terbaru
  const [aktifId, setAktifId] = useState<string | null>(idTerbaru);

  const pilihPratinjau = (id: string) => {
    const tutup = aktifId === id;
    setAktifId(tutup ? null : id);
    if (!tutup) {
      setTimeout(() => document.getElementById(`buletin-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pesan, setPesan] = useState<{ id: string; teks: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const ambilRingkasan = (b: BuletinItem) => (ringkasanLokal[b.id] ?? b.ringkasan_eksekutif ?? '').trim();

  const daftarTahun = useMemo(() => Array.from(new Set(data.map((d) => d.tahun))).sort((a, b) => b - a), [data]);
  const daftarTipe = useMemo(() => Array.from(new Set(data.map((d) => d.tipe_link).filter(Boolean))), [data]);

  const tersaring = useMemo(() => {
    const kata = q.trim().toLowerCase();
    const hasil = data.filter((b) => {
      if (tahun !== 'semua' && String(b.tahun) !== tahun) return false;
      if (tipe !== 'semua' && b.tipe_link !== tipe) return false;
      if (hanyaBerRingkasan && !ambilRingkasan(b)) return false;
      if (kata) {
        const gudang = `${b.nama_kegiatan} ${ambilRingkasan(b)} ${b.tahun} ${b.minggu_ke ?? ''}`.toLowerCase();
        if (!gudang.includes(kata)) return false;
      }
      return true;
    });
    hasil.sort((a, b) => {
      const sel = skorKebaruan(a) - skorKebaruan(b);
      return urut === 'terbaru' ? -sel : sel; // terbaru di atas, terlama di bawah
    });
    return hasil;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, tahun, tipe, urut, hanyaBerRingkasan, ringkasanLokal]);

  const totalBerRingkasan = data.filter((b) => ambilRingkasan(b)).length;

  const toggle = (id: string) =>
    setTerbuka((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const mulaiEdit = (b: BuletinItem) => {
    setEditId(b.id);
    setDraft(ambilRingkasan(b));
    setPesan(null);
    setTerbuka((s) => new Set(s).add(b.id));
  };

  const simpan = (b: BuletinItem) => {
    const teks = draft.trim();
    startTransition(async () => {
      const res = await simpanRingkasanBuletin(b.id, teks);
      if (res.ok) {
        setRingkasanLokal((m) => ({ ...m, [b.id]: teks }));
        setEditId(null);
        setPesan({ id: b.id, teks: 'Ringkasan tersimpan.', ok: true });
      } else {
        setPesan({ id: b.id, teks: res.error ?? 'Gagal menyimpan.', ok: false });
      }
    });
  };

  // ===== Input data buletin (tambah / ubah / hapus) =====
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [buletinDiedit, setBuletinDiedit] = useState<BuletinItem | null>(null);
  const [errForm, setErrForm] = useState<string | null>(null);

  const bukaForm = (b: BuletinItem | null) => {
    setBuletinDiedit(b);
    setErrForm(null);
    setFormTerbuka(true);
  };

  const kirimForm = (nilai: BuletinInput) => {
    startTransition(async () => {
      const res = buletinDiedit ? await ubahBuletin(buletinDiedit.id, nilai) : await tambahBuletin(nilai);
      if (res.ok && res.data) {
        const row = res.data as BuletinItem;
        setData((d) => (buletinDiedit ? d.map((x) => (x.id === row.id ? { ...x, ...row } : x)) : [row, ...d]));
        if (!buletinDiedit) setAktifId(row.id);
        setFormTerbuka(false);
        setPesan({ id: row.id, teks: buletinDiedit ? 'Buletin diperbarui.' : 'Buletin ditambahkan.', ok: true });
      } else {
        setErrForm(res.error ?? 'Gagal menyimpan.');
      }
    });
  };

  const hapus = (b: BuletinItem) => {
    if (!window.confirm(`Hapus buletin "${b.nama_kegiatan}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    startTransition(async () => {
      const res = await hapusBuletin(b.id);
      if (res.ok) {
        setData((d) => d.filter((x) => x.id !== b.id));
        if (aktifId === b.id) setAktifId(null);
      } else {
        setPesan({ id: b.id, teks: res.error ?? 'Gagal menghapus.', ok: false });
      }
    });
  };

  const salin = async (teks: string, id: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      setPesan({ id, teks: 'Ringkasan disalin.', ok: true });
    } catch {
      setPesan({ id, teks: 'Gagal menyalin.', ok: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Aksi petugas/admin ===== */}
      {isPetugasAtauAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => bukaForm(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#005C2E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004a25]"
          >
            + Tambah Buletin
          </button>
        </div>
      )}

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-3 gap-3">
        <Statistik label="Total Buletin" nilai={data.length} ikon="📚" />
        <Statistik label="Ada Ringkasan" nilai={totalBerRingkasan} ikon="📝" />
        <Statistik label="Tahun Terbaru" nilai={daftarTahun[0] ?? '–'} ikon="📅" />
      </div>

      {/* ===== Toolbar ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul atau isi ringkasan…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#005C2E] focus:ring-2 focus:ring-[#005C2E]/20"
            />
          </div>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#005C2E]"
          >
            <option value="semua">Semua Tahun</option>
            {daftarTahun.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={urut}
            onChange={(e) => setUrut(e.target.value as 'terbaru' | 'terlama')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#005C2E]"
          >
            <option value="terbaru">Terbaru dulu</option>
            <option value="terlama">Terlama dulu</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip aktif={tipe === 'semua'} onClick={() => setTipe('semua')}>
            Semua tipe
          </Chip>
          {daftarTipe.map((t) => (
            <Chip key={t} aktif={tipe === t} onClick={() => setTipe(t)}>
              {t}
            </Chip>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={hanyaBerRingkasan}
              onChange={(e) => setHanyaBerRingkasan(e.target.checked)}
              className="accent-[#005C2E]"
            />
            Hanya yang ada ringkasan
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Menampilkan <b className="text-slate-700">{tersaring.length}</b> dari {data.length} buletin
        </span>
        {tersaring.length > 0 && (
          <button
            onClick={() =>
              setTerbuka((s) => (s.size >= tersaring.length ? new Set() : new Set(tersaring.map((b) => b.id))))
            }
            className="font-medium text-[#005C2E] hover:underline"
          >
            {terbuka.size >= tersaring.length ? 'Tutup semua ringkasan' : 'Buka semua ringkasan'}
          </button>
        )}
      </div>

      {/* ===== Daftar ===== */}
      {tersaring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Tidak ada buletin yang cocok dengan filter.
          <div>
            <button
              onClick={() => {
                setQ('');
                setTahun('semua');
                setTipe('semua');
                setHanyaBerRingkasan(false);
              }}
              className="mt-3 font-medium text-[#005C2E] hover:underline"
            >
              Reset filter
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {tersaring.map((b) => {
            const ringkasan = ambilRingkasan(b);
            const buka = terbuka.has(b.id);
            const sedangEdit = editId === b.id;
            return (
              <li
                key={b.id}
                id={`buletin-${b.id}`}
                className={`scroll-mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                  aktifId === b.id ? 'border-[#005C2E] ring-1 ring-[#005C2E]/30' : 'border-slate-200'
                }`}
              >
                {/* Header kartu */}
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#005C2E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#005C2E]">
                        {b.tahun}
                      </span>
                      {b.minggu_ke != null && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          Minggu ke-{b.minggu_ke}
                        </span>
                      )}
                      {b.tipe_link && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {b.tipe_link}
                        </span>
                      )}
                      {b.id === idTerbaru && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          ★ Terbaru
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{b.nama_kegiatan}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isPetugasAtauAdmin && (
                      <>
                        <button
                          onClick={() => bukaForm(b)}
                          title="Ubah data buletin"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          onClick={() => hapus(b)}
                          disabled={pending}
                          title="Hapus buletin"
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    {b.link_url && (
                      <button
                        onClick={() => pilihPratinjau(b.id)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          aktifId === b.id
                            ? 'border-[#005C2E] bg-[#005C2E]/10 text-[#005C2E]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {aktifId === b.id ? 'Tutup Pratinjau' : 'Lihat Pratinjau'}
                      </button>
                    )}
                    <a
                      href={b.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#005C2E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004a25]"
                    >
                      Buka ↗
                    </a>
                  </div>
                </div>

                {/* Viewer buletin (di atas kartu ringkasan) */}
                {b.link_url && aktifId === b.id && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <iframe
                        src={urlViewer(b.link_url)}
                        title={`Pratinjau ${b.nama_kegiatan}`}
                        allow="fullscreen"
                        className="h-[420px] w-full md:h-[560px]"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Pratinjau tidak tampil? Klik “Buka” untuk membuka di tab baru.
                    </p>
                  </div>
                )}

                {/* Kotak Ringkasan Eksekutif */}
                <div className="border-t border-slate-100 bg-gradient-to-br from-emerald-50/70 to-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggle(b.id)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#005C2E]"
                      aria-expanded={buka}
                    >
                      <span className={`inline-block transition-transform ${buka ? 'rotate-90' : ''}`}>▸</span>
                      Ringkasan Eksekutif
                    </button>
                    <div className="flex items-center gap-3 text-xs">
                      {ringkasan && !sedangEdit && (
                        <button onClick={() => salin(ringkasan, b.id)} className="text-slate-500 hover:text-slate-800">
                          Salin
                        </button>
                      )}
                      {isPetugasAtauAdmin && !sedangEdit && (
                        <button onClick={() => mulaiEdit(b)} className="font-medium text-[#005C2E] hover:underline">
                          {ringkasan ? 'Edit' : '+ Tambah ringkasan'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pratinjau saat tertutup */}
                  {!buka && ringkasan && (
                    <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{ringkasan}</p>
                  )}
                  {!buka && !ringkasan && (
                    <p className="mt-2 text-xs italic text-slate-400">Ringkasan belum tersedia.</p>
                  )}

                  {/* Isi saat terbuka */}
                  {buka && (
                    <div className="mt-3">
                      {sedangEdit ? (
                        <div className="space-y-2">
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, MAKS_KARAKTER))}
                            rows={7}
                            autoFocus
                            placeholder="Tulis ringkasan eksekutif: situasi utama, temuan penting, angka kunci, rekomendasi/tindak lanjut…"
                            className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#005C2E] focus:ring-2 focus:ring-[#005C2E]/20"
                          />
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${draft.length > MAKS_KARAKTER * 0.9 ? 'text-orange-600' : 'text-slate-400'}`}>
                              {draft.length}/{MAKS_KARAKTER}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditId(null)}
                                disabled={pending}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => simpan(b)}
                                disabled={pending}
                                className="rounded-lg bg-[#005C2E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#004a25] disabled:opacity-60"
                              >
                                {pending ? 'Menyimpan…' : 'Simpan'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : ringkasan ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{ringkasan}</p>
                      ) : (
                        <p className="text-sm italic text-slate-400">
                          Ringkasan belum tersedia{isPetugasAtauAdmin ? ' — klik “Tambah ringkasan”.' : '.'}
                        </p>
                      )}
                    </div>
                  )}

                  {pesan?.id === b.id && (
                    <p className={`mt-2 text-xs ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formTerbuka && (
        <FormBuletin
          awal={buletinDiedit}
          daftarTipe={daftarTipe}
          pending={pending}
          error={errForm}
          onSubmit={kirimForm}
          onClose={() => setFormTerbuka(false)}
        />
      )}
    </div>
  );
}

function FormBuletin({
  awal,
  daftarTipe,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  awal: BuletinItem | null;
  daftarTipe: string[];
  pending: boolean;
  error: string | null;
  onSubmit: (v: BuletinInput) => void;
  onClose: () => void;
}) {
  const [tahun, setTahun] = useState(String(awal?.tahun ?? new Date().getFullYear()));
  const [minggu, setMinggu] = useState(awal?.minggu_ke != null ? String(awal.minggu_ke) : '');
  const [nama, setNama] = useState(awal?.nama_kegiatan ?? '');
  const [tipe, setTipe] = useState(awal?.tipe_link ?? daftarTipe[0] ?? 'Google Drive');
  const [link, setLink] = useState(awal?.link_url ?? '');
  const [ringkasan, setRingkasan] = useState('');
  const [errLokal, setErrLokal] = useState<string | null>(null);

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const th = parseInt(tahun, 10);
    const mg = minggu.trim() === '' ? null : parseInt(minggu, 10);
    if (!Number.isInteger(th)) return setErrLokal('Tahun wajib diisi dengan angka.');
    if (mg != null && (!Number.isInteger(mg) || mg < 1 || mg > 53)) return setErrLokal('Minggu ke harus 1–53.');
    if (!nama.trim()) return setErrLokal('Nama kegiatan wajib diisi.');
    if (!/^https?:\/\//i.test(link.trim())) return setErrLokal('Link harus diawali http:// atau https://');
    setErrLokal(null);
    onSubmit({
      tahun: th,
      minggu_ke: mg,
      nama_kegiatan: nama.trim(),
      tipe_link: tipe.trim(),
      link_url: link.trim(),
      ...(awal ? {} : { ringkasan_eksekutif: ringkasan }),
    });
  };

  const kelasInput =
    'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#005C2E] focus:ring-2 focus:ring-[#005C2E]/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <form
        onSubmit={kirim}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{awal ? 'Ubah Buletin' : 'Tambah Buletin'}</h2>
          <button type="button" onClick={onClose} disabled={pending} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Tahun
            <input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} className={`${kelasInput} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Minggu ke- <span className="font-normal text-slate-400">(opsional)</span>
            <input
              type="number"
              min={1}
              max={53}
              value={minggu}
              onChange={(e) => setMinggu(e.target.value)}
              className={`${kelasInput} mt-1`}
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Nama kegiatan / judul buletin
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Buletin Surveilans Minggu ke-44"
            className={`${kelasInput} mt-1`}
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Tipe link
          <input value={tipe} onChange={(e) => setTipe(e.target.value)} list="daftar-tipe-buletin" className={`${kelasInput} mt-1`} />
          <datalist id="daftar-tipe-buletin">
            {daftarTipe.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Link buletin
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/…"
            className={`${kelasInput} mt-1`}
          />
        </label>

        {!awal && (
          <label className="block text-xs font-medium text-slate-600">
            Ringkasan eksekutif <span className="font-normal text-slate-400">(opsional, bisa diisi nanti)</span>
            <textarea
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value.slice(0, MAKS_KARAKTER))}
              rows={4}
              className={`${kelasInput} mt-1 resize-y`}
            />
          </label>
        )}

        {(errLokal || error) && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errLokal ?? error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#005C2E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#004a25] disabled:opacity-60"
          >
            {pending ? 'Menyimpan…' : awal ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Statistik({ label, nilai, ikon }: { label: string; nilai: number | string; ikon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005C2E]/10 text-lg">{ikon}</span>
      <div>
        <p className="text-xl font-bold text-slate-900">{nilai}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Chip({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        aktif ? 'bg-[#005C2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}