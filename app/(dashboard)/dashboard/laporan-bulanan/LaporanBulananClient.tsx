"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Maximize2, Play } from "lucide-react";
import SlideView from "@/components/laporan-bulanan/SlideView";
import { BULAN, labelRentang } from "@/lib/laporan-bulanan/periode";
import { buildSlides } from "@/lib/laporan-bulanan/slides";
import { unduhBerkas } from "@/lib/laporan-bulanan/unduh";
import type { HasilModul } from "@/lib/laporan-bulanan/types";

interface Props {
  tahunAwal: number;
  bulanAwal: number;
  tahunSekarang: number;
  bulanSekarang: number;
}

const MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const nomorBulan = (b: number) => String(b).padStart(2, "0");

const kelasInput = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

export default function LaporanBulananClient({ tahunAwal, bulanAwal, tahunSekarang, bulanSekarang }: Props) {
  const [tahun, setTahun] = useState(tahunAwal);
  const [bulanAkhir, setBulanAkhir] = useState(bulanAwal);
  const [percobaan, setPercobaan] = useState(0);
  const kunci = `${tahun}-${bulanAkhir}-${percobaan}`;

  const [data, setData] = useState<{ kunci: string; hasil: HasilModul[] } | null>(null);
  const [galat, setGalat] = useState<{ kunci: string; pesan: string } | null>(null);
  const hasil = data && data.kunci === kunci ? data.hasil : null;
  const memuat = !hasil && galat?.kunci !== kunci;

  const [dikecualikan, setDikecualikan] = useState<Set<string>>(new Set());
  const [judulRapat, setJudulRapat] = useState("Rapat Bulanan Kinerja Surveilans");
  const [catatan, setCatatan] = useState("");
  const [indeks, setIndeks] = useState(0);

  const [namaTtd, setNamaTtd] = useState("");
  const [nipTtd, setNipTtd] = useState("");
  const [jabatanTtd, setJabatanTtd] = useState("Ketua Tim Kerja Surveilans dan Penindakan");
  const [tanggalTtd, setTanggalTtd] = useState("");
  const [catatanTim, setCatatanTim] = useState("");

  const [sibuk, setSibuk] = useState<"pptx" | "docx" | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [layarPenuh, setLayarPenuh] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const bulanMaks = tahun === tahunSekarang ? bulanSekarang : 12;
  const daftarTahun = [tahunSekarang, tahunSekarang - 1, tahunSekarang - 2];

  /* ---------- Ambil data semua modul ---------- */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/laporan-bulanan?tahun=${tahun}&bulanAkhir=${bulanAkhir}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `Permintaan gagal (${res.status}).`);
        setData({ kunci, hasil: json.hasil as HasilModul[] });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setGalat({ kunci, pesan: e instanceof Error ? e.message : "Gagal memuat data laporan." });
      }
    })();
    return () => ctrl.abort();
  }, [tahun, bulanAkhir, kunci]);

  /* ---------- Slide ---------- */
  const slides = useMemo(
    () => (hasil ? buildSlides({ tahun, bulanAkhir, hasil }, { modulDikecualikan: [...dikecualikan], catatan, penutup: true }, [], judulRapat.trim() || undefined) : []),
    [hasil, tahun, bulanAkhir, dikecualikan, catatan, judulRapat],
  );
  const aktif = Math.min(indeks, Math.max(0, slides.length - 1));
  const periodeLabel = labelRentang(tahun, bulanAkhir);
  const pindah = (i: number) => setIndeks(Math.max(0, Math.min(slides.length - 1, i)));

  /* ---------- Layar penuh dan papan tombol ---------- */
  useEffect(() => {
    const f = () => setLayarPenuh(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && layarPenuh)) setIndeks((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setIndeks((i) => Math.max(0, i - 1));
      else if (e.key === "Home") setIndeks(0);
      else if (e.key === "End") setIndeks(Math.max(0, slides.length - 1));
      else return;
      if (layarPenuh) e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [layarPenuh, slides.length]);

  const mulaiPresentasi = () => {
    setIndeks(0);
    stageRef.current?.requestFullscreen?.().catch(() => setPesan("Browser tidak mengizinkan layar penuh."));
  };

  /* ---------- Ringkasan status modul ---------- */
  const ringkas = useMemo(() => {
    const h = hasil ?? [];
    return { ok: h.filter((x) => x.status === "ok").length, kosong: h.filter((x) => x.status === "kosong").length, gagal: h.filter((x) => x.status === "gagal").length };
  }, [hasil]);

  const kelompok = useMemo(() => {
    const peta = new Map<string, HasilModul[]>();
    (hasil ?? []).forEach((h) => peta.set(h.kelompok, [...(peta.get(h.kelompok) ?? []), h]));
    return Array.from(peta, ([nama, item]) => ({ nama, item }));
  }, [hasil]);

  const ubahModul = (k: string, dipilih: boolean) =>
    setDikecualikan((prev) => {
      const baru = new Set(prev);
      if (dipilih) baru.delete(k);
      else baru.add(k);
      return baru;
    });

  /* ---------- Unduh ---------- */
  async function unduhPptx() {
    if (!hasil) return;
    setSibuk("pptx");
    setPesan(null);
    try {
      const res = await fetch("/api/laporan-bulanan/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahun, bulanAkhir, hasil, opsi: { modulDikecualikan: [...dikecualikan], catatan, penutup: true, judulRapat } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `Permintaan gagal (${res.status}).`);
      }
      unduhBerkas(await res.blob(), `Rapat-Bulanan-Surveilans-${tahun}-${nomorBulan(bulanAkhir)}.pptx`, MIME_PPTX);
    } catch (e) {
      setPesan(`Gagal membuat PowerPoint: ${e instanceof Error ? e.message : "kesalahan tidak dikenal"}`);
    } finally {
      setSibuk(null);
    }
  }

  async function unduhDocx() {
    if (!hasil) return;
    setSibuk("docx");
    setPesan(null);
    try {
      const [{ rakitDocx }, { pabrikKanvasBrowser }] = await Promise.all([import("@/lib/laporan-bulanan/docx"), import("@/lib/laporan-bulanan/chart")]);
      const bytes = await rakitDocx(
        { tahun, bulanAkhir, hasil },
        {
          modulDikecualikan: [...dikecualikan],
          catatan: catatanTim.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
          tanggal: tanggalTtd.trim() || undefined,
          penandatangan: { jabatan: jabatanTtd.trim() || "Ketua Tim Kerja Surveilans dan Penindakan", nama: namaTtd.trim() || undefined, nip: nipTtd.trim() || undefined },
        },
        pabrikKanvasBrowser,
      );
      unduhBerkas(bytes, `Laporan-Bulanan-Surveilans-${tahun}-${nomorBulan(bulanAkhir)}.docx`, MIME_DOCX);
    } catch (e) {
      setPesan(`Gagal membuat laporan Word: ${e instanceof Error ? e.message : "kesalahan tidak dikenal"}`);
    } finally {
      setSibuk(null);
    }
  }

  const siap = !!hasil && slides.length > 0;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Laporan Bulanan</h1>
        <p className="text-sm text-slate-600">Rangkuman data langsung dari sistem, Januari sampai bulan yang dipilih. Presentasikan di layar penuh, unduh sebagai PowerPoint, atau unduh sebagai laporan Word.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Sampai bulan"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={bulanAkhir}
          onChange={(e) => setBulanAkhir(Number(e.target.value))}
        >
          {BULAN.slice(0, bulanMaks).map((nama, i) => (
            <option key={nama} value={i + 1}>{nama}</option>
          ))}
        </select>
        <select
          aria-label="Tahun"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={tahun}
          onChange={(e) => {
            const t = Number(e.target.value);
            setTahun(t);
            setBulanAkhir((b) => Math.min(b, t === tahunSekarang ? bulanSekarang : 12));
          }}
        >
          {daftarTahun.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" onClick={mulaiPresentasi} disabled={!siap} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Play className="h-4 w-4" /> Mulai presentasi
        </button>
        <button type="button" onClick={unduhPptx} disabled={!siap || sibuk !== null} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {sibuk === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh .pptx
        </button>
        <button type="button" onClick={unduhDocx} disabled={!siap || sibuk !== null} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {sibuk === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Unduh laporan .docx
        </button>
      </div>

      {pesan ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{pesan}</p> : null}

      <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        {[
          { label: "Periode", nilai: `Jan - ${BULAN[bulanAkhir - 1].slice(0, 3)} ${tahun}` },
          { label: "Modul ada data", nilai: memuat ? "..." : String(ringkas.ok) },
          { label: "Modul tanpa data", nilai: memuat ? "..." : String(ringkas.kosong) },
          { label: "Gagal dimuat", nilai: memuat ? "..." : String(ringkas.gagal) },
        ].map((k) => (
          <div key={k.label}>
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.label === "Gagal dimuat" && ringkas.gagal > 0 ? "text-red-700" : "text-slate-900"}`}>{k.nilai}</div>
          </div>
        ))}
      </section>

      {galat?.kunci === kunci ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {galat.pesan}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setPercobaan((p) => p + 1)}>Coba lagi</button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Isi presentasi</h2>
            <div className="flex gap-3 text-xs">
              <button type="button" className="font-semibold text-teal-700 underline" onClick={() => setDikecualikan(new Set())}>Pilih semua</button>
              <button type="button" className="font-semibold text-teal-700 underline" onClick={() => setDikecualikan(new Set((hasil ?? []).map((h) => h.kunci)))}>Kosongkan</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Sampul dan penutup selalu disertakan. Pilihan berlaku untuk presentasi dan laporan Word.</p>

          {memuat ? (
            <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Membaca data semua modul...</div>
          ) : (
            kelompok.map((g) => (
              <fieldset key={g.nama} className="space-y-1.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.nama}</legend>
                {g.item.map((h) => (
                  <label key={h.kunci} className="flex items-start gap-2 text-sm text-slate-800">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={!dikecualikan.has(h.kunci)} onChange={(e) => ubahModul(h.kunci, e.target.checked)} />
                    <span>
                      {h.judul}
                      {h.status === "kosong" ? <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">tanpa data</span> : null}
                      {h.status === "gagal" ? <span title={h.galat} className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">gagal dimuat</span> : null}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))
          )}

          <div className="space-y-1.5 border-t border-slate-200 pt-3">
            <label htmlFor="judul-rapat" className="text-sm font-semibold text-slate-900">Judul rapat</label>
            <input id="judul-rapat" className={kelasInput} value={judulRapat} onChange={(e) => setJudulRapat(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="isu" className="text-sm font-semibold text-slate-900">Isu untuk diputuskan pimpinan</label>
            <textarea id="isu" rows={4} className={kelasInput} placeholder={"Satu isu per baris, contoh:\nPerkuat pengawasan dokumen kapal\nTambah petugas di Sangatta"} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            <p className="text-xs text-slate-500">Diisi akan menambah satu slide di akhir.</p>
          </div>

          <details className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">Opsi laporan Word</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label htmlFor="ctim" className="text-sm text-slate-800">Catatan dan rekomendasi tim (satu poin per baris)</label>
                <textarea id="ctim" rows={4} className={kelasInput} value={catatanTim} onChange={(e) => setCatatanTim(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="jab" className="text-sm text-slate-800">Jabatan penandatangan</label>
                <input id="jab" className={kelasInput} value={jabatanTtd} onChange={(e) => setJabatanTtd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="nama" className="text-sm text-slate-800">Nama penandatangan</label>
                <input id="nama" className={kelasInput} value={namaTtd} onChange={(e) => setNamaTtd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="nip" className="text-sm text-slate-800">NIP (opsional)</label>
                <input id="nip" className={kelasInput} value={nipTtd} onChange={(e) => setNipTtd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="tgl" className="text-sm text-slate-800">Tanggal (mis. 1 Oktober 2026)</label>
                <input id="tgl" className={kelasInput} value={tanggalTtd} onChange={(e) => setTanggalTtd(e.target.value)} />
              </div>
              <p className="text-xs text-slate-500">Setelah diunduh, buka di Word dan pilih Ya bila diminta memperbarui bidang agar daftar isi terisi.</p>
            </div>
          </details>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Pratinjau {slides.length > 0 ? `(${slides.length} slide)` : ""}</h2>
            <button type="button" onClick={mulaiPresentasi} disabled={!siap} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              <Maximize2 className="h-3.5 w-3.5" /> Layar penuh
            </button>
          </div>

          <div
            ref={stageRef}
            onClick={() => layarPenuh && pindah(aktif + 1)}
            className={layarPenuh ? "flex h-screen w-screen items-center justify-center bg-black" : "overflow-hidden rounded-lg border border-slate-200 bg-white"}
          >
            {siap ? (
              <SlideView slide={slides[aktif]} nomor={aktif + 1} periodeLabel={periodeLabel} style={layarPenuh ? { width: "min(100vw, calc(100vh * 16 / 9))" } : undefined} />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-slate-500">
                {memuat ? "Menyiapkan slide..." : "Belum ada slide untuk ditampilkan."}
              </div>
            )}
          </div>

          {siap ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => pindah(aktif - 1)} disabled={aktif === 0} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </button>
                <span className="truncate text-sm text-slate-600">{aktif + 1} dari {slides.length}: {slides[aktif].judul}</span>
                <button type="button" onClick={() => pindah(aktif + 1)} disabled={aktif === slides.length - 1} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slides.map((s, i) => (
                  <button key={s.kunci} type="button" title={s.judul} onClick={() => pindah(i)} className={`h-8 min-w-8 rounded-md border px-2 text-xs ${i === aktif ? "border-teal-700 bg-teal-700 font-semibold text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
