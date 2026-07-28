"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DAFTAR_KATEGORI = ["UU", "PP", "Permenkes", "Kepmenkes", "SK", "SOP", "Juknis", "Lainnya"];

type Peraturan = {
  id: string;
  judul: string;
  deskripsi: string | null;
  kategori: string;
  nomor_peraturan: string | null;
  tahun: number | null;
  file_url: string;
  file_type: "pdf" | "docx" | "xlsx";
  nama_file_asli: string;
  created_at: string;
};

export default function PeraturanClient({ bolehKelola }: { bolehKelola: boolean }) {
  const [daftar, setDaftar] = useState<Peraturan[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [cari, setCari] = useState("");
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangEdit, setSedangEdit] = useState<Peraturan | null>(null);
  const [previewUrl, setPreviewUrl] = useState<{ url: string; type: string } | null>(null);

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (kategoriFilter) params.set("kategori", kategoriFilter);
    if (cari) params.set("cari", cari);
    const res = await fetch("/api/peraturan?" + params.toString());
    const json = await res.json();
    setDaftar(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void muatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategoriFilter]);

  function handleSubmitCari(e: React.FormEvent) {
    e.preventDefault();
    void muatData();
  }

  async function handleHapus(id: string) {
    if (!confirm("Yakin hapus peraturan ini?")) return;
    await fetch("/api/peraturan?id=" + id, { method: "DELETE" });
    void muatData();
  }

  function urlPreview(item: Peraturan) {
    if (item.file_type === "pdf") return item.file_url;
    return "https://docs.google.com/viewer?url=" + encodeURIComponent(item.file_url) + "&embedded=true";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
  <div>
    <h1 className="text-2xl font-semibold text-slate-800">Kumpulan Peraturan</h1>
    <p className="text-slate-500 text-sm">BKK Kelas I Samarinda -- dapat diakses dan diunduh siapa saja</p>
  </div>
        <div className="flex items-center gap-2">
            {bolehKelola && (
            <button
                onClick={() => { setSedangEdit(null); setFormTerbuka(true); }}
                className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:opacity-90"
            >
                + Tambah Peraturan
            </button>
            )}
            <Link
            href="/dashboard/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-400 px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm transition hover:bg-amber-500"
            >
            Kembali ke Dashboard
            </Link>
        </div>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSubmitCari} className="flex gap-2 flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Cari judul peraturan..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm">
            Cari
          </button>
        </form>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Semua kategori</option>
            {DAFTAR_KATEGORI.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Memuat data...</p>
      ) : daftar.length === 0 ? (
        <p className="text-sm text-slate-400">Belum ada peraturan.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daftar.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
              <span className="inline-block w-fit text-xs font-semibold px-2 py-0.5 rounded-full bg-teal/10 text-teal mb-2">
                {item.kategori}
              </span>
              <h3 className="text-sm font-semibold text-slate-800">{item.judul}</h3>
              {item.nomor_peraturan && (
                <p className="text-xs text-slate-500 mt-1">
                  {item.nomor_peraturan}
                  {item.tahun ? " (" + item.tahun + ")" : ""}
                </p>
              )}
              {item.deskripsi && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.deskripsi}</p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => setPreviewUrl({ url: urlPreview(item), type: item.file_type })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Lihat
                </button>
                <a
                  href={item.file_url}
                  download={item.nama_file_asli}
                  className="px-3 py-1.5 rounded-lg bg-teal text-white hover:opacity-90"
                >
                  Unduh
                </a>
                {bolehKelola && (
                  <>
                    <button
                      onClick={() => { setSedangEdit(item); setFormTerbuka(true); }}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleHapus(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 border-b">
              <span className="text-sm font-medium">Pratinjau dokumen</span>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-slate-600">
                x
              </button>
            </div>
            <iframe src={previewUrl.url} className="flex-1 w-full rounded-b-xl" />
          </div>
        </div>
      )}

      {formTerbuka && (
        <FormPeraturan
          data={sedangEdit}
          onClose={() => setFormTerbuka(false)}
          onSukses={() => { setFormTerbuka(false); void muatData(); }}
        />
      )}
    </div>
  );
}

function FormPeraturan({
  data,
  onClose,
  onSukses,
}: {
  data: Peraturan | null;
  onClose: () => void;
  onSukses: () => void;
}) {
  const [judul, setJudul] = useState(data?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(data?.deskripsi ?? "");
  const [kategori, setKategori] = useState(data?.kategori ?? DAFTAR_KATEGORI[0]);
  const [nomorPeraturan, setNomorPeraturan] = useState(data?.nomor_peraturan ?? "");
  const [tahun, setTahun] = useState(data?.tahun?.toString() ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setError(null);
    try {
      if (data) {
        const res = await fetch("/api/peraturan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.id,
            judul,
            deskripsi: deskripsi || null,
            kategori,
            nomor_peraturan: nomorPeraturan || null,
            tahun: tahun ? Number(tahun) : null,
          }),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? "Gagal menyimpan");
        }
      } else {
        if (!file) throw new Error("Pilih file terlebih dahulu");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("judul", judul);
        formData.append("deskripsi", deskripsi);
        formData.append("kategori", kategori);
        formData.append("nomor_peraturan", nomorPeraturan);
        formData.append("tahun", tahun);
        const res = await fetch("/api/peraturan", { method: "POST", body: formData });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? "Gagal mengunggah");
        }
      }
      onSukses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-lg p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-800">
          {data ? "Edit Peraturan" : "Tambah Peraturan Baru"}
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Judul *</label>
          <input
            required
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kategori *</label>
            <select
              required
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            >
              {DAFTAR_KATEGORI.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tahun</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nomor Peraturan</label>
          <input
            value={nomorPeraturan}
            onChange={(e) => setNomorPeraturan(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        {!data && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">File (PDF/DOCX/XLSX) *</label>
            <input
              required
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={menyimpan}
            className="px-4 py-1.5 rounded-lg bg-teal text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {menyimpan ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}