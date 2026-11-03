// lib/lalulintas/config.ts
//
// Label & metadata untuk dashboard Lalu Lintas Orang (publik, tanpa login
// untuk lihat; unduh Excel dikunci Petugas/Admin). Beda dari Tabel Klinik --
// ini tidak berisi data pribadi/sensitif (data kapal & jumlah ABK).

export type TabLaluLintas =
  | "penumpang-kapal"
  | "kedatangan-luar-negeri"
  | "kedatangan-dalam-negeri"
  | "keberangkatan-luar-negeri"
  | "keberangkatan-dalam-negeri";

export const DAFTAR_TAB_LALULINTAS: { key: TabLaluLintas; label: string; judulHalaman: string; judulLaporan: string }[] = [
  {
    key: "penumpang-kapal",
    label: "Penumpang Kapal",
    judulHalaman: "Data Penumpang Kapal",
    judulLaporan: "DATA PENUMPANG KAPAL",
  },
  {
    key: "kedatangan-luar-negeri",
    label: "ABK Kedatangan Luar Negeri",
    judulHalaman: "ABK Kapal Kedatangan Luar Negeri",
    judulLaporan: "DATA ABK KAPAL KEDATANGAN LUAR NEGERI",
  },
  {
    key: "kedatangan-dalam-negeri",
    label: "ABK Kedatangan Dalam Negeri",
    judulHalaman: "ABK Kapal Kedatangan Dalam Negeri",
    judulLaporan: "DATA ABK KAPAL KEDATANGAN DALAM NEGERI",
  },
  {
    key: "keberangkatan-luar-negeri",
    label: "ABK Keberangkatan Luar Negeri",
    judulHalaman: "ABK Kapal Keberangkatan Luar Negeri",
    judulLaporan: "DATA ABK KAPAL KEBERANGKATAN LUAR NEGERI",
  },
  {
    key: "keberangkatan-dalam-negeri",
    label: "ABK Keberangkatan Dalam Negeri",
    judulHalaman: "ABK Kapal Keberangkatan Dalam Negeri",
    judulLaporan: "DATA ABK KAPAL KEBERANGKATAN DALAM NEGERI",
  },
];

export function ambilTabLaluLintas(key: string | null) {
  return DAFTAR_TAB_LALULINTAS.find((t) => t.key === key) ?? null;
}