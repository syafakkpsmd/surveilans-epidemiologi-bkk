"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export type AgregasiMetrik = "sum" | "avg";

export type MetrikDef = {
  key: string;
  label: string;
  singkat: string; // header kolom (ringkas, muat di kolom sempit)
  agregasi?: AgregasiMetrik; // default 'sum'
  desimal?: number; // default 0
  nada?: "netral" | "baik" | "buruk"; // pewarnaan angka
  satuan?: string;
};

export type BarisRekap = {
  label: string;
  monthly: Record<string, number>[]; // index 0..11
};

type Props = {
  judul: string;
  subjudul?: string;
  metrik: MetrikDef[];
  metrikDetail?: MetrikDef[]; // metrik tambahan, disembunyikan di balik toggle "Detail"
  baris: BarisRekap[];
  satuanBaris?: string; // mis. "wilayah kerja"
  aksenDari?: string; // warna gradient header (hex)
  aksenKe?: string;
};

function formatAngka(v: number, desimal = 0) {
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

function totalBaris(baris: BarisRekap, m: MetrikDef): number {
  const nilai = baris.monthly.map((bln) => Number(bln[m.key]) || 0);
  if ((m.agregasi ?? "sum") === "avg") {
    const isi = nilai.filter((v) => v > 0);
    if (!isi.length) return 0;
    return isi.reduce((a, b) => a + b, 0) / isi.length;
  }
  return nilai.reduce((a, b) => a + b, 0);
}

function totalGrandKolom(baris: BarisRekap[], bulanIdx: number, m: MetrikDef): number {
  const nilai = baris.map((b) => Number(b.monthly[bulanIdx]?.[m.key]) || 0);
  if ((m.agregasi ?? "sum") === "avg") {
    const isi = nilai.filter((v) => v > 0);
    if (!isi.length) return 0;
    return isi.reduce((a, b) => a + b, 0) / isi.length;
  }
  return nilai.reduce((a, b) => a + b, 0);
}

function totalGrandTotal(baris: BarisRekap[], m: MetrikDef): number {
  const nilai = baris.map((b) => totalBaris(b, m));
  if ((m.agregasi ?? "sum") === "avg") {
    const isi = nilai.filter((v) => v > 0);
    if (!isi.length) return 0;
    return isi.reduce((a, b) => a + b, 0) / isi.length;
  }
  return nilai.reduce((a, b) => a + b, 0);
}

function warnaNada(nada: MetrikDef["nada"]) {
  if (nada === "baik") return "text-[#1B5E20]";
  if (nada === "buruk") return "text-[#B71C1C]";
  return "text-[#1b2733]";
}

export default function RekapTabelWilkerBulan({
  judul,
  subjudul,
  metrik,
  metrikDetail,
  baris,
  aksenDari = "#0f2a38",
  aksenKe = "#0f4c5c",
}: Props) {
  const [tampilkanDetail, setTampilkanDetail] = useState(false);

  const metrikAktif = useMemo(
    () => (tampilkanDetail && metrikDetail?.length ? [...metrik, ...metrikDetail] : metrik),
    [tampilkanDetail, metrik, metrikDetail]
  );

  const adaData = baris.length > 0;

  function unduhExcel() {
    const n = metrikAktif.length;

    // Baris 1: judul wilayah + nama bulan (akan di-merge selebar jumlah metrik)
    const baris1: (string | number)[] = ["Wilayah Kerja", ...NAMA_BULAN.flatMap((b) => [b, ...Array(n - 1).fill("")]), "Total", ...Array(n - 1).fill("")];
    // Baris 2: kosong di kolom wilayah, lalu label singkat metrik per bulan + total
    const baris2: (string | number)[] = ["", ...NAMA_BULAN.flatMap(() => metrikAktif.map((m) => m.singkat)), ...metrikAktif.map((m) => m.singkat)];

    const dataRows: (string | number)[][] = baris.map((b) => [
      b.label,
      ...b.monthly.flatMap((bln) => metrikAktif.map((m) => Number(bln[m.key]) || 0)),
      ...metrikAktif.map((m) => Number(totalBaris(b, m).toFixed(m.desimal ?? 0))),
    ]);

    const barisJumlah: (string | number)[] = [
      "JUMLAH",
      ...Array.from({ length: 12 }, (_, idxBulan) =>
        metrikAktif.map((m) => Number(totalGrandKolom(baris, idxBulan, m).toFixed(m.desimal ?? 0)))
      ).flat(),
      ...metrikAktif.map((m) => Number(totalGrandTotal(baris, m).toFixed(m.desimal ?? 0))),
    ];

    const aoa = [[judul], subjudul ? [subjudul] : [], [], baris1, baris2, ...dataRows, barisJumlah];
    const offset = subjudul ? 4 : 3; // baris index (0-based) tempat baris1 berada

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge judul & subjudul selebar tabel
    const lebarTotal = 1 + 12 * n + n;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lebarTotal - 1 } },
      ...(subjudul ? [{ s: { r: 1, c: 0 }, e: { r: 1, c: lebarTotal - 1 } }] : []),
      // Merge tiap grup bulan & grup "Total" di baris header
      ...NAMA_BULAN.map((_, i) => ({
        s: { r: offset, c: 1 + i * n },
        e: { r: offset, c: 1 + i * n + (n - 1) },
      })),
      { s: { r: offset, c: 1 + 12 * n }, e: { r: offset, c: 1 + 12 * n + (n - 1) } },
      { s: { r: offset, c: 0 }, e: { r: offset + 1, c: 0 } }, // "Wilayah Kerja" span 2 baris
    ];

    ws["!cols"] = [{ wch: 20 }, ...Array(12 * n + n).fill({ wch: 9 })];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, judul.slice(0, 31) || "Rekap");

    const namaFile = `${judul.replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
    XLSX.writeFile(wb, namaFile);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      {/* Header kartu */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ background: `linear-gradient(120deg, ${aksenDari}, ${aksenKe})` }}
      >
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">{judul}</h3>
          {subjudul ? <p className="mt-0.5 text-xs text-white/70">{subjudul}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {metrikDetail?.length ? (
            <button
              type="button"
              onClick={() => setTampilkanDetail((v) => !v)}
              className="rounded-[var(--radius-pill)] border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
            >
              {tampilkanDetail ? "Sembunyikan detail" : "Tampilkan detail"}
            </button>
          ) : null}
          {adaData ? (
            <button
              type="button"
              onClick={unduhExcel}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
            >
              📥 Unduh Excel
            </button>
          ) : null}
        </div>
      </div>

      {!adaData ? (
        <div className="px-5 py-10 text-center text-sm text-[var(--color-muted)]">
          Belum ada data untuk periode &amp; filter yang dipilih.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[11.5px]">
            <thead>
              {/* Baris grup bulan */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 min-w-[168px] border-b border-r border-[var(--color-border)] bg-[#f4f6f8] px-3 py-2 text-left align-bottom text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
                >
                  Wilayah Kerja
                </th>
                {NAMA_BULAN.map((bln) => (
                  <th
                    key={bln}
                    colSpan={metrikAktif.length}
                    className="border-b border-l border-[var(--color-border)] bg-[#f4f6f8] px-2 py-1.5 text-center text-[11px] font-semibold text-[var(--color-ink)]"
                  >
                    {bln}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  colSpan={metrikAktif.length}
                  className="border-b border-l border-[var(--color-border)] bg-[#e7ecef] px-2 py-2 text-center align-bottom text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink)]"
                >
                  Total
                </th>
              </tr>
              <tr>
                {NAMA_BULAN.map((bln) =>
                  metrikAktif.map((m) => (
                    <th
                      key={`${bln}-${m.key}`}
                      className="border-b border-l border-[var(--color-border)] bg-white px-1.5 py-1 text-center text-[10px] font-medium text-[var(--color-muted)]"
                      title={m.label}
                    >
                      {m.singkat}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {baris.map((b, idxBaris) => (
                <tr
                  key={b.label}
                  className={idxBaris % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}
                >
                  <td className="sticky left-0 z-10 border-b border-r border-[var(--color-border)] bg-inherit px-3 py-1.5 font-medium text-[var(--color-ink)]">
                    {b.label}
                  </td>
                  {b.monthly.map((bulanData, idxBulan) =>
                    metrikAktif.map((m) => {
                      const v = Number(bulanData[m.key]) || 0;
                      return (
                        <td
                          key={`${idxBulan}-${m.key}`}
                          className={`border-b border-l border-[var(--color-border)] px-1.5 py-1.5 text-center tabular-nums ${
                            v === 0 ? "text-[var(--color-muted)]/50" : warnaNada(m.nada)
                          }`}
                        >
                          {formatAngka(v, m.desimal)}
                        </td>
                      );
                    })
                  )}
                  {metrikAktif.map((m) => (
                    <td
                      key={`total-${m.key}`}
                      className={`border-b border-l border-[var(--color-border)] bg-[#f4f6f8] px-1.5 py-1.5 text-center font-semibold tabular-nums ${warnaNada(
                        m.nada
                      )}`}
                    >
                      {formatAngka(totalBaris(b, m), m.desimal)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Baris JUMLAH keseluruhan */}
              <tr className="bg-[#0f4c5c]/10 font-semibold">
                <td className="sticky left-0 z-10 border-t-2 border-r border-[var(--color-border)] bg-[#e6f0f2] px-3 py-2 text-[var(--color-navy)]">
                  JUMLAH
                </td>
                {NAMA_BULAN.map((_, idxBulan) =>
                  metrikAktif.map((m) => (
                    <td
                      key={`grand-${idxBulan}-${m.key}`}
                      className="border-t-2 border-l border-[var(--color-border)] bg-[#e6f0f2] px-1.5 py-2 text-center tabular-nums text-[var(--color-navy)]"
                    >
                      {formatAngka(totalGrandKolom(baris, idxBulan, m), m.desimal)}
                    </td>
                  ))
                )}
                {metrikAktif.map((m) => (
                  <td
                    key={`grand-total-${m.key}`}
                    className="border-t-2 border-l border-[var(--color-border)] bg-[#d7e6ea] px-1.5 py-2 text-center tabular-nums text-[var(--color-navy)]"
                  >
                    {formatAngka(totalGrandTotal(baris, m), m.desimal)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda metrik */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-border)] bg-[#fafbfc] px-5 py-2.5 text-[11px] text-[var(--color-muted)]">
        {metrikAktif.map((m) => (
          <span key={m.key}>
            <span className="font-semibold text-[var(--color-ink)]">{m.singkat}</span> = {m.label}
            {m.satuan ? ` (${m.satuan})` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
