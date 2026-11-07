"use client";

// app/(dashboard)/dashboard/limbah-b3/LimbahB3Client.tsx  (FILE BARU)
// Dasbor pemeriksaan pengelolaan limbah B3 klinik. Filter wilayah dan rentang bulan dikerjakan di klien dari data setahun.
import { useMemo, useState, type ReactNode } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BUTIR, SEKSI, AMBANG_SKOR } from "@/lib/limbah-b3/butir";
import {
  NAMA_BULAN_PENDEK, bulanDari, skorBaris, butirTidak, tindakLanjutTerbuka, terlambat,
  hitungRingkasan, trenBulanan, kepatuhanPerSeksi, butirPalingSeringTidak, type BarisB3,
} from "@/lib/limbah-b3/hitung";

const WARNA = { skor: "#10B981", jumlah: "#6366F1", klinik: "#06B6D4", tidak: "#F43F5E", terbuka: "#F59E0B", seksi: "#0EA5E9" };

type Props = {
  daftarWilayah: string[];
  rows: BarisB3[];
  tahun: number;
  hariIni: string; // 'YYYY-MM-DD' WITA
  wilayahParam?: string;
  aksiHeader?: ReactNode;
};

const persen = (n: number | null) => (n === null ? "-" : `${n.toFixed(1).replace(".", ",")}%`);
const angka = (n: number) => n.toLocaleString("id-ID");
const warnaSkor = (s: number | null) =>
  s === null ? "bg-gray-100 text-gray-500"
  : s >= AMBANG_SKOR.baik ? "bg-green-100 text-green-800"
  : s >= AMBANG_SKOR.cukup ? "bg-amber-100 text-amber-800"
  : "bg-red-100 text-red-800";

function KartuRingkas({ label, nilai, keterangan, warna }: { label: string; nilai: string; keterangan: string; warna: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: warna }} />
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: warna }} />
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{nilai}</div>
      <p className="mt-1 text-xs text-gray-500">{keterangan}</p>
    </div>
  );
}

export default function LimbahB3Client({ daftarWilayah, rows, tahun, hariIni, wilayahParam, aksiHeader }: Props) {
  const [wilayah, setWilayah] = useState<string>(wilayahParam || "semua");
  const [bulanAwal, setBulanAwal] = useState(1);
  const [bulanAkhir, setBulanAkhir] = useState(12);

  const data = useMemo(() => {
    const awal = Math.min(bulanAwal, bulanAkhir);
    const akhir = Math.max(bulanAwal, bulanAkhir);
    return rows.filter((r) => {
      const b = bulanDari(r.tanggal_pemeriksaan);
      return (wilayah === "semua" || r.wilayah_kerja === wilayah) && b >= awal && b <= akhir;
    });
  }, [rows, wilayah, bulanAwal, bulanAkhir]);

  const ringkasan = useMemo(() => hitungRingkasan(data, hariIni), [data, hariIni]);
  const tren = useMemo(() => trenBulanan(data), [data]);
  const perSeksi = useMemo(() => kepatuhanPerSeksi(data), [data]);
  const bermasalah = useMemo(() => butirPalingSeringTidak(data, 10), [data]);
  const daftar = useMemo(
    () =>
      data
        .map((r) => ({ r, s: skorBaris(r), tidak: butirTidak(r) }))
        .sort((a, b) => (a.s.skor ?? 101) - (b.s.skor ?? 101) || b.r.tanggal_pemeriksaan.localeCompare(a.r.tanggal_pemeriksaan)),
    [data],
  );

  const labelWilayah = wilayah !== "semua" ? ` di ${wilayah}` : "";
  const sel = "rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700";

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Pengelolaan Limbah B3 Klinik</h1>
          <p className="mt-1 text-xs text-gray-500">Hasil pemeriksaan pengelolaan limbah B3 pada klinik di wilayah kerja — {tahun}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {aksiHeader}
          <select value={wilayah} onChange={(e) => setWilayah(e.target.value)} className={sel}>
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilayah.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs text-gray-600">
            <select value={bulanAwal} onChange={(e) => setBulanAwal(Number(e.target.value))} className={sel}>
              {NAMA_BULAN_PENDEK.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </select>
            <span>s/d</span>
            <select value={bulanAkhir} onChange={(e) => setBulanAkhir(Number(e.target.value))} className={sel}>
              {NAMA_BULAN_PENDEK.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Belum ada data pemeriksaan limbah B3 untuk filter ini pada tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* KARTU RINGKAS */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-5">
            <KartuRingkas label="Pemeriksaan" nilai={angka(ringkasan.jumlahPemeriksaan)} keterangan="Jumlah formulir pemeriksaan" warna={WARNA.jumlah} />
            <KartuRingkas label="Klinik Diperiksa" nilai={angka(ringkasan.klinikDiperiksa)} keterangan="Klinik berbeda (per wilayah)" warna={WARNA.klinik} />
            <KartuRingkas label="Skor Kepatuhan Rata-rata" nilai={persen(ringkasan.skorRata)} keterangan='Butir "Ya" dari butir yang dinilai' warna={WARNA.skor} />
            <KartuRingkas label='Butir "Tidak"' nilai={angka(ringkasan.totalTidak)} keterangan="Total temuan ketidaksesuaian" warna={WARNA.tidak} />
            <KartuRingkas
              label="Tindak Lanjut Terbuka"
              nilai={angka(ringkasan.tindakLanjutTerbuka)}
              keterangan={ringkasan.terlambat > 0 ? `${ringkasan.terlambat} melewati batas waktu` : "Belum ada yang melewati batas waktu"}
              warna={WARNA.terbuka}
            />
          </div>

          {/* TREN */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Skor Kepatuhan Rata-rata per Bulan{labelWilayah} Tahun {tahun} (%)</h3>
            <TrenChartLine data={tren} tipeChart="line" seriesList={[{ key: "skor_rata", label: "Skor kepatuhan (%)", warna: WARNA.skor }]} />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-center text-sm font-bold text-gray-800">Jumlah Pemeriksaan per Bulan{labelWilayah} Tahun {tahun}</h3>
            <TrenChartLine data={tren} tipeChart="bar" seriesList={[{ key: "jumlah_pemeriksaan", label: "Pemeriksaan", warna: WARNA.jumlah }]} />
          </div>

          {/* PER SEKSI */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs lg:col-span-2">
            <h3 className="mb-1 text-center text-sm font-bold text-gray-800">Kepatuhan per Seksi Pemeriksaan{labelWilayah} Tahun {tahun} (%)</h3>
            <p className="mb-4 text-center text-xs text-gray-500">{SEKSI.map((s) => `${s.huruf}. ${s.nama}`).join(" · ")}</p>
            <TrenChartLine
              data={perSeksi.map((s) => ({ ...s, name: `Seksi ${s.huruf}`, label: `Seksi ${s.huruf}` }))}
              tipeChart="bar"
              seriesList={[{ key: "kepatuhan", label: "Kepatuhan (%)", warna: WARNA.seksi }]}
            />
          </div>

          {/* BUTIR PALING SERING TIDAK */}
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-xs lg:col-span-2">
            <div className="mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-red-900">Butir yang Paling Sering Tidak Sesuai{labelWilayah}</h3>
              <p className="mt-0.5 text-xs text-gray-500">Sepuluh butir dengan jawaban &quot;Tidak&quot; terbanyak pada filter terpilih.</p>
            </div>
            {bermasalah.length === 0 ? (
              <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center text-xs font-medium text-green-700">
                Tidak ada butir yang dijawab &quot;Tidak&quot; pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="border-b border-red-100 bg-red-50/50 font-semibold uppercase text-red-900">
                    <tr><th className="px-4 py-3">Butir</th><th className="px-4 py-3">Seksi</th><th className="px-4 py-3">Pertanyaan</th><th className="px-4 py-3 text-center">Tidak</th><th className="px-4 py-3 text-center">Dari dinilai</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bermasalah.map((b) => (
                      <tr key={b.no} className="hover:bg-red-50/40">
                        <td className="px-4 py-3 font-semibold text-gray-800">{b.no}</td>
                        <td className="px-4 py-3">{b.seksi}</td>
                        <td className="px-4 py-3">{b.teks}</td>
                        <td className="px-4 py-3 text-center font-bold text-red-600">{b.tidak}</td>
                        <td className="px-4 py-3 text-center">{b.dinilai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DAFTAR PEMERIKSAAN */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Daftar Pemeriksaan{labelWilayah} Tahun {tahun}</h3>
                <p className="mt-0.5 text-xs text-gray-500">Diurutkan dari skor terendah. Status tindak lanjut diisi petugas di halaman Input Data.</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{daftar.length} pemeriksaan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 font-semibold uppercase text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Klinik</th><th className="px-4 py-3">Wilayah Kerja</th>
                    <th className="px-4 py-3 text-center">Skor</th><th className="px-4 py-3 text-center">Ya / Tidak / N/A</th>
                    <th className="px-4 py-3">Butir &quot;Tidak&quot;</th><th className="px-4 py-3">Temuan utama</th><th className="px-4 py-3">Tindak lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {daftar.map(({ r, s, tidak }) => (
                    <tr key={r.id} className="align-top hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">{r.tanggal_pemeriksaan}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.nama_klinik}</td>
                      <td className="px-4 py-3">{r.wilayah_kerja}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-md px-2 py-0.5 font-semibold ${warnaSkor(s.skor)}`}>{persen(s.skor)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">{s.ya} / {s.tidak} / {s.na}{s.kosong > 0 ? ` (${s.kosong} kosong)` : ""}</td>
                      <td className="px-4 py-3">{tidak.length ? tidak.join(", ") : "-"}</td>
                      <td className="max-w-xs px-4 py-3">{r.temuan_utama || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {tindakLanjutTerbuka(r) ? (
                          <span className={`inline-block rounded-md px-2 py-0.5 font-semibold ${terlambat(r, hariIni) ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                            {r.status_tindak_lanjut || "Belum"}{r.batas_waktu_tindak_lanjut ? ` · batas ${r.batas_waktu_tindak_lanjut}` : ""}
                          </span>
                        ) : tidak.length ? (
                          <span className="inline-block rounded-md bg-green-100 px-2 py-0.5 font-semibold text-green-800">Selesai</span>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Skor = butir &quot;Ya&quot; ÷ (butir &quot;Ya&quot; + &quot;Tidak&quot;); &quot;N/A&quot; dan butir kosong tidak dihitung. Warna hijau ≥ {AMBANG_SKOR.baik}%, kuning ≥ {AMBANG_SKOR.cukup}%, merah di bawahnya
              (ambang tampilan, bukan ketentuan resmi). Total {BUTIR.length} butir dalam {SEKSI.length} seksi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
