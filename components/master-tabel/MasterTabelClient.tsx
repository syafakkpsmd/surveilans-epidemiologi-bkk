"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RekapTabelWilkerBulan, {
  type BarisRekap,
  type MetrikDef,
} from "./RekapTabelWilkerBulan";

type WilkerRef = { kode: string; nama: string };

type Props = {
  tahun: number;
  daftarWilker: WilkerRef[];
  ttu: any[];
  pab: any[];
  tpp: any[];
  ratGuard: any[];
  tikus: any[];
  dbdAktivitas: any[]; // BarisAktivitasDbd[]
  diareLalat: any[]; // BarisDiareWilker[]
  diareKecoa: any[]; // BarisDiareWilker[]
};

type Kategori = "sanitasi" | "vektor";

type DatasetId =
  | "ttu"
  | "pab"
  | "tpp"
  | "ratguard"
  | "tikus"
  | "dbd_perimeter"
  | "dbd_buffer"
  | "larvasida"
  | "pengasapan"
  | "diare_lalat"
  | "diare_kecoa";

const TAB_SANITASI: { id: DatasetId; label: string; ikon: string }[] = [
  { id: "ttu", label: "TTU (Tempat-Tempat Umum)", ikon: "🏢" },
  { id: "pab", label: "PAB (Penyedia Air Bersih)", ikon: "💧" },
  { id: "tpp", label: "TPP (Tempat Pengelolaan Pangan)", ikon: "🍽️" },
  { id: "ratguard", label: "Rat Guard Kapal", ikon: "🐀" },
];

const TAB_VEKTOR: { id: DatasetId; label: string; ikon: string }[] = [
  { id: "tikus", label: "Vektor Tikus & Pes", ikon: "🐭" },
  { id: "dbd_perimeter", label: "DBD — Perimeter", ikon: "🦟" },
  { id: "dbd_buffer", label: "DBD — Buffer", ikon: "🦟" },
  { id: "larvasida", label: "Larvasida", ikon: "🧪" },
  { id: "pengasapan", label: "Pengasapan (Fogging)", ikon: "🌫️" },
  { id: "diare_lalat", label: "Vektor Diare — Lalat", ikon: "🪰" },
  { id: "diare_kecoa", label: "Vektor Diare — Kecoa", ikon: "🪳" },
];

function susunBaris(opts: {
  raw: any[];
  bulanKey: string;
  labelResolver: (row: any) => string;
  metricKeys: string[];
  filterLabel?: string;
}): BarisRekap[] {
  const { raw, bulanKey, labelResolver, metricKeys, filterLabel } = opts;
  const peta = new Map<string, BarisRekap>();

  for (const row of raw) {
    const label = labelResolver(row) || "—";
    if (filterLabel && filterLabel !== "Semua" && label !== filterLabel) continue;

    const bln = Number(row[bulanKey]);
    if (!bln || bln < 1 || bln > 12) continue;

    if (!peta.has(label)) {
      peta.set(label, {
        label,
        monthly: Array.from({ length: 12 }, () => ({}) as Record<string, number>),
      });
    }
    const baris = peta.get(label)!;
    const sel = baris.monthly[bln - 1];
    for (const k of metricKeys) {
      sel[k] = (sel[k] || 0) + (Number(row[k]) || 0);
    }
  }

  return Array.from(peta.values()).sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export default function MasterTabelClient({
  tahun,
  daftarWilker,
  ttu,
  pab,
  tpp,
  ratGuard,
  tikus,
  dbdAktivitas,
  diareLalat,
  diareKecoa,
}: Props) {
  const router = useRouter();
  const [kategori, setKategori] = useState<Kategori>("sanitasi");
  const [dataset, setDataset] = useState<DatasetId>("ttu");
  const [wilayah, setWilayah] = useState<string>("Semua");

  const petaKodeKeNama = useMemo(() => {
    const m = new Map<string, string>();
    daftarWilker.forEach((w) => m.set(w.kode, w.nama));
    return m;
  }, [daftarWilker]);

  const namaDariKode = (kode: string) => petaKodeKeNama.get(kode) || kode;

  const daftarWilayahGabungan = useMemo(() => {
    const set = new Set<string>();
    [...ttu, ...pab, ...tpp, ...ratGuard].forEach((r) => {
      if (r.wilayah_kerja) set.add(r.wilayah_kerja);
    });
    daftarWilker.forEach((w) => set.add(w.nama));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [ttu, pab, tpp, ratGuard, daftarWilker]);

  function pilihKategori(k: Kategori) {
    setKategori(k);
    setDataset(k === "sanitasi" ? "ttu" : "tikus");
  }

  // -------- Metrik per dataset --------
  const METRIK_MS_TMS: MetrikDef[] = [
    { key: "jumlah_diperiksa", label: "Jumlah Diperiksa", singkat: "Periksa" },
    { key: "jumlah_ms", label: "Memenuhi Syarat", singkat: "MS", nada: "baik" },
    { key: "jumlah_tms", label: "Tidak Memenuhi Syarat", singkat: "TMS", nada: "buruk" },
  ];

  const METRIK_RATGUARD: MetrikDef[] = [
    { key: "pasang", label: "Rat Guard Terpasang", singkat: "Pasang", nada: "baik" },
    { key: "tidak_pasang", label: "Tidak Terpasang", singkat: "T.Pasang", nada: "buruk" },
    { key: "jumlah_kapal", label: "Jumlah Kapal Diawasi", singkat: "Kapal" },
  ];

  const METRIK_TIKUS: MetrikDef[] = [
    { key: "jml_trap_dipasang", label: "Perangkap Dipasang", singkat: "Trap" },
    { key: "jml_trap_tertangkap", label: "Tikus Tertangkap", singkat: "Tangkap", nada: "buruk" },
    { key: "index_pinjal", label: "Indeks Pinjal", singkat: "Idx.Pinjal", desimal: 2, agregasi: "avg" },
    { key: "tsi", label: "Succes Trap (%)", singkat: "STI", desimal: 2, agregasi: "avg" },
  ];
  const METRIK_TIKUS_DETAIL: MetrikDef[] = [
    { key: "rt", label: "Rumah Tinggal (RT)", singkat: "RT" },
    { key: "rn", label: "Rumah Niaga (RN)", singkat: "RN" },
    { key: "mm", label: "Multi Manfaat (MM)", singkat: "MM" },
    { key: "jenis_lainnya", label: "Lainnya", singkat: "Lain" },
  ];

  const METRIK_DBD: MetrikDef[] = [
    { key: "rumah_diperiksa", label: "Rumah Diperiksa", singkat: "Rumah" },
    { key: "rumah_positif", label: "Rumah Positif Jentik", singkat: "R.(+)", nada: "buruk" },
    { key: "container_diperiksa", label: "Container Diperiksa", singkat: "Cont." },
    { key: "container_positif", label: "Container Positif", singkat: "C.(+)", nada: "buruk" },
  ];

  const METRIK_LARVASIDA: MetrikDef[] = [
    { key: "larvasida_gram", label: "Pemakaian Bubuk Abate", singkat: "Abate", satuan: "gram" },
  ];

  const METRIK_PENGASAPAN: MetrikDef[] = [
    { key: "luas_fogging_ha", label: "Luas Wilayah Fogging", singkat: "Luas", desimal: 1, satuan: "Ha" },
    { key: "insektisida_fogging_ml", label: "Insektisida Terpakai", singkat: "Insek.", satuan: "ml" },
  ];

  const METRIK_DIARE: MetrikDef[] = [
    { key: "jml_pengamatan", label: "Jumlah Pengamatan", singkat: "Amatan" },
    { key: "jml_memenuhi_syarat", label: "Memenuhi Syarat", singkat: "MS", nada: "baik" },
    { key: "jml_tidak_memenuhi_syarat", label: "Tidak Memenuhi Syarat", singkat: "TMS", nada: "buruk" },
    { key: "indeks_rerata", label: "Rata-rata Indeks", singkat: "Idx.", desimal: 2, agregasi: "avg" },
  ];

  // -------- Rakit baris sesuai dataset aktif --------
  const konfigDataset: Record<
    DatasetId,
    { judul: string; subjudul: string; metrik: MetrikDef[]; metrikDetail?: MetrikDef[]; baris: BarisRekap[] }
  > = {
    ttu: {
      judul: "Sanitasi Tempat-Tempat Umum (TTU)",
      subjudul: `Rekap bulanan per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_MS_TMS,
      baris: susunBaris({
        raw: ttu,
        bulanKey: "bulan",
        labelResolver: (r) => r.wilayah_kerja,
        metricKeys: ["jumlah_diperiksa", "jumlah_ms", "jumlah_tms"],
        filterLabel: wilayah,
      }),
    },
    pab: {
      judul: "Pengawasan Penyedia Air Bersih (PAB)",
      subjudul: `Rekap bulanan per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_MS_TMS,
      baris: susunBaris({
        raw: pab,
        bulanKey: "bulan",
        labelResolver: (r) => r.wilayah_kerja,
        metricKeys: ["jumlah_diperiksa", "jumlah_ms", "jumlah_tms"],
        filterLabel: wilayah,
      }),
    },
    tpp: {
      judul: "Tempat Pengelolaan Pangan (TPP)",
      subjudul: `Rekap bulanan per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_MS_TMS,
      baris: susunBaris({
        raw: tpp,
        bulanKey: "bulan",
        labelResolver: (r) => r.wilayah_kerja,
        metricKeys: ["jumlah_diperiksa", "jumlah_ms", "jumlah_tms"],
        filterLabel: wilayah,
      }),
    },
    ratguard: {
      judul: "Rat Guard Kapal",
      subjudul: `Kepatuhan pemasangan rat guard per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_RATGUARD,
      baris: susunBaris({
        raw: ratGuard,
        bulanKey: "bulan",
        labelResolver: (r) => r.wilayah_kerja,
        metricKeys: ["jumlah_kapal", "pasang", "tidak_pasang"],
        filterLabel: wilayah,
      }),
    },
    tikus: {
      judul: "Vektor Tikus & Pes",
      subjudul: `Perangkap, hasil tangkap & indeks pinjal per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_TIKUS,
      metrikDetail: METRIK_TIKUS_DETAIL,
      baris: susunBaris({
        raw: tikus,
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: [
          "jml_trap_dipasang",
          "jml_trap_tertangkap",
          "index_pinjal",
          "tsi",
          "rt",
          "rn",
          "mm",
          "jenis_lainnya",
        ],
        filterLabel: wilayah,
      }),
    },
    dbd_perimeter: {
      judul: "Vektor DBD — Zona Perimeter",
      subjudul: `Pemeriksaan jentik rumah & kontainer — Tahun ${tahun}`,
      metrik: METRIK_DBD,
      baris: susunBaris({
        raw: dbdAktivitas.filter((r) => String(r.zona).toLowerCase().includes("perimeter")),
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["rumah_diperiksa", "rumah_positif", "container_diperiksa", "container_positif"],
        filterLabel: wilayah,
      }),
    },
    dbd_buffer: {
      judul: "Vektor DBD — Zona Buffer",
      subjudul: `Pemeriksaan jentik rumah & kontainer — Tahun ${tahun}`,
      metrik: METRIK_DBD,
      baris: susunBaris({
        raw: dbdAktivitas.filter((r) => String(r.zona).toLowerCase().includes("buffer")),
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["rumah_diperiksa", "rumah_positif", "container_diperiksa", "container_positif"],
        filterLabel: wilayah,
      }),
    },
    larvasida: {
      judul: "Larvasida",
      subjudul: `Pemakaian bubuk abate per wilayah kerja — Tahun ${tahun}`,
      metrik: METRIK_LARVASIDA,
      baris: susunBaris({
        raw: dbdAktivitas,
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["larvasida_gram"],
        filterLabel: wilayah,
      }),
    },
    pengasapan: {
      judul: "Pengasapan (Fogging)",
      subjudul: `Luas wilayah & insektisida terpakai — Tahun ${tahun}`,
      metrik: METRIK_PENGASAPAN,
      baris: susunBaris({
        raw: dbdAktivitas,
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["luas_fogging_ha", "insektisida_fogging_ml"],
        filterLabel: wilayah,
      }),
    },
    diare_lalat: {
      judul: "Vektor Diare — Lalat",
      subjudul: `Fly index & kepatuhan lokasi pengamatan — Tahun ${tahun}`,
      metrik: METRIK_DIARE,
      baris: susunBaris({
        raw: diareLalat,
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["jml_pengamatan", "jml_memenuhi_syarat", "jml_tidak_memenuhi_syarat", "indeks_rerata"],
        filterLabel: wilayah,
      }),
    },
    diare_kecoa: {
      judul: "Vektor Diare — Kecoa",
      subjudul: `Kepadatan kecoa & kepatuhan lokasi pengamatan — Tahun ${tahun}`,
      metrik: METRIK_DIARE,
      baris: susunBaris({
        raw: diareKecoa,
        bulanKey: "bulan",
        labelResolver: (r) => namaDariKode(r.kode_wilker),
        metricKeys: ["jml_pengamatan", "jml_memenuhi_syarat", "jml_tidak_memenuhi_syarat", "indeks_rerata"],
        filterLabel: wilayah,
      }),
    },
  };

  const aktif = konfigDataset[dataset];
  const tabAktif = kategori === "sanitasi" ? TAB_SANITASI : TAB_VEKTOR;

  return (
    <div className="space-y-5">
      {/* Toolbar: tahun + wilayah */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">Tahun</span>
          <select
            value={tahun}
            onChange={(e) => router.push(`/dashboard/master-tabel?tahun=${e.target.value}`)}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/40"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">Wilayah Kerja</span>
          <select
            value={wilayah}
            onChange={(e) => setWilayah(e.target.value)}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/40"
          >
            <option value="Semua">Semua Wilayah</option>
            {daftarWilayahGabungan.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-[var(--radius-pill)] bg-[#f0f2f4] p-1">
          {(["sanitasi", "vektor"] as Kategori[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pilihKategori(k)}
              className={`rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-semibold capitalize transition ${
                kategori === k
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab dataset */}
      <div className="flex flex-wrap gap-2">
        {tabAktif.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDataset(t.id)}
            className={`flex items-center gap-1.5 rounded-[var(--radius-control)] border px-3 py-1.5 text-xs font-medium transition ${
              dataset === t.id
                ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-teal)]/40 hover:text-[var(--color-ink)]"
            }`}
          >
            <span>{t.ikon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabel rekap aktif */}
      <RekapTabelWilkerBulan
        judul={aktif.judul}
        subjudul={aktif.subjudul}
        metrik={aktif.metrik}
        metrikDetail={aktif.metrikDetail}
        baris={aktif.baris}
      />
    </div>
  );
}
