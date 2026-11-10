"use client";

// app/(dashboard)/dashboard/udara-ruang/UdaraRuangClient.tsx  (FILE BARU)
// Dasbor kualitas udara dalam ruang. Data setahun dimuat sekali; filter wilayah, rentang tanggal, dan granularitas dikerjakan di klien.
import { useMemo, useState, type ReactNode } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { PARAMETER, adaBakuMutu, teksBakuMutu, type KunciParam } from "@/lib/udara-ruang/parameter";
import {
  LABEL_STATUS, URUTAN_STATUS, hitungRingkasan, kepatuhanParameter, lokasiLabel, nilaiBaris, perLokasi,
  trenPeriode, wilkerBaris, type BarisUdara, type Granularitas, type StatusUdara,
} from "@/lib/udara-ruang/hitung";

const WARNA = {
  ms: "#10B981", tms: "#F43F5E", belum: "#F59E0B", anomali: "#8B5CF6",
  pm25: "#F97316", pm10: "#6366F1", bm: "#9CA3AF", suhu: "#EF4444", lembap: "#0EA5E9", hcho: "#14B8A6", tvoc: "#A855F7",
  total: "#6366F1", lokasi: "#06B6D4",
};
const BADGE: Record<StatusUdara, string> = {
  MS: "bg-green-100 text-green-800", TMS: "bg-red-100 text-red-700", BELUM_LENGKAP: "bg-amber-100 text-amber-800", ANOMALI: "bg-violet-100 text-violet-800",
};

const angka = (n: number) => n.toLocaleString("id-ID");
const persen = (n: number | null) => (n === null ? "-" : `${n.toFixed(1).replace(".", ",")}%`);
const fmt = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { maximumFractionDigits: d }));
const tglIndo = (iso: string | null) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][Number(m) - 1]} ${y}`;
};

function Kartu({ label, nilai, keterangan, warna }: { label: string; nilai: string; keterangan: string; warna: string }) {
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

function Panel({ judul, sub, children, lebar = false }: { judul: string; sub?: string; children: ReactNode; lebar?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-xs ${lebar ? "lg:col-span-2" : ""}`}>
      <h3 className="text-center text-sm font-bold text-gray-800">{judul}</h3>
      {sub && <p className="mb-3 mt-0.5 text-center text-xs text-gray-500">{sub}</p>}
      <div className={sub ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

type Props = { daftarWilayah: string[]; rows: BarisUdara[]; tahun: number; wilayahParam?: string; aksiHeader?: ReactNode };

export default function UdaraRuangClient({ daftarWilayah, rows, tahun, wilayahParam, aksiHeader }: Props) {
  const [wilayah, setWilayah] = useState(wilayahParam || "semua");
  const [dari, setDari] = useState(`${tahun}-01-01`);
  const [sampai, setSampai] = useState(`${tahun}-12-31`);
  const [gran, setGran] = useState<Granularitas>("mingguan");

  const data = useMemo(
    () => rows.filter((r) => (wilayah === "semua" || wilkerBaris(r, daftarWilayah) === wilayah) && r.tanggal >= dari && r.tanggal <= sampai),
    [rows, wilayah, dari, sampai, daftarWilayah],
  );
  const ringkasan = useMemo(() => hitungRingkasan(data), [data]);
  const tren = useMemo(() => trenPeriode(data, gran), [data, gran]);
  const lokasi = useMemo(() => perLokasi(data, daftarWilayah), [data, daftarWilayah]);
  const kepatuhan = useMemo(() => kepatuhanParameter(data), [data]);
  const penilaian = useMemo(() => data.map((r) => ({ r, n: nilaiBaris(r) })), [data]);
  const tmsTerbaru = useMemo(() => penilaian.filter((x) => x.n.status === "TMS").slice(0, 12), [penilaian]);
  const perhatian = useMemo(() => penilaian.filter((x) => x.n.status === "ANOMALI" || x.n.status === "BELUM_LENGKAP").slice(0, 12), [penilaian]);

  const parameterMatriks = PARAMETER.filter((p) => p.wajibLengkap || adaBakuMutu(p));
  const tipe = gran === "bulanan" ? "bar" : "line";
  const labelWil = wilayah !== "semua" ? ` di ${wilayah}` : "";
  const sel = "rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700";
  const adaMs = ringkasan.jumlah.MS + ringkasan.jumlah.TMS;

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Kualitas Udara Dalam Ruang</h1>
          <p className="mt-1 text-xs text-gray-500">Pemantauan PM2.5, PM10, suhu, kelembapan, HCHO, TVOC, dan parameter pemeriksaan lain — {tahun}.</p>
        </div>
        
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {aksiHeader}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
            {(["mingguan", "bulanan"] as Granularitas[]).map((g) => (
              <button key={g} type="button" onClick={() => setGran(g)}
                className={`rounded-md px-3 py-1.5 transition-all ${gran === g ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
                {g === "mingguan" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
          <select value={wilayah} onChange={(e) => setWilayah(e.target.value)} className={sel}>
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilayah.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs text-gray-600">
            <input type="date" value={dari} min={`${tahun}-01-01`} max={sampai} onChange={(e) => e.target.value && setDari(e.target.value)} className={sel} />
            <span>s/d</span>
            <input type="date" value={sampai} min={dari} max={`${tahun}-12-31`} onChange={(e) => e.target.value && setSampai(e.target.value)} className={sel} />
          </div>
      </div>
    </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Belum ada data pengukuran untuk filter ini pada tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* KARTU RINGKAS */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-6">
            <Kartu label="Pengukuran" nilai={angka(ringkasan.total)} keterangan={`Terakhir ${tglIndo(ringkasan.tanggalTerakhir)}`} warna={WARNA.total} />
            <Kartu label="Lokasi Terpantau" nilai={angka(ringkasan.lokasi)} keterangan="Lokasi/ruangan berbeda" warna={WARNA.lokasi} />
            <Kartu label="Memenuhi Syarat" nilai={angka(ringkasan.jumlah.MS)} keterangan={`${persen(ringkasan.persenMs)} dari pengukuran lengkap`} warna={WARNA.ms} />
            <Kartu label="Tidak Memenuhi Syarat" nilai={angka(ringkasan.jumlah.TMS)} keterangan={adaMs ? `${persen(100 - (ringkasan.persenMs ?? 0))} dari pengukuran lengkap` : "Belum ada yang lengkap"} warna={WARNA.tms} />
            <Kartu label="Perlu Perhatian Data" nilai={angka(ringkasan.jumlah.BELUM_LENGKAP + ringkasan.jumlah.ANOMALI)}
              keterangan={`${ringkasan.jumlah.BELUM_LENGKAP} belum lengkap · ${ringkasan.jumlah.ANOMALI} nilai tidak wajar`} warna={WARNA.belum} />
            <Kartu label="Parameter Dominan TMS" nilai={ringkasan.parameterDominan?.nama.replace(/\s*\(.*\)$/, "") ?? "-"}
              keterangan={ringkasan.parameterDominan ? `${ringkasan.parameterDominan.jumlah} kali melampaui baku mutu` : "Tidak ada yang melampaui"} warna={WARNA.pm25} />
          </div>

          {/* STATUS PER PERIODE */}
          <Panel lebar judul={`Status Pengukuran ${gran === "bulanan" ? "per Bulan" : "per Minggu"}${labelWil} Tahun ${tahun}`}>
            <TrenChartLine data={tren} tipeChart="bar" seriesList={[
              { key: "ms", label: LABEL_STATUS.MS, warna: WARNA.ms },
              { key: "tms", label: LABEL_STATUS.TMS, warna: WARNA.tms },
              { key: "belum_lengkap", label: LABEL_STATUS.BELUM_LENGKAP, warna: WARNA.belum },
              { key: "anomali", label: LABEL_STATUS.ANOMALI, warna: WARNA.anomali },
            ]} />
          </Panel>

          {/* PARTIKULAT */}
          <Panel judul={`Rata-rata PM2.5 dan PM10${labelWil} (µg/m³)`} sub="Garis abu-abu = baku mutu (PM2.5 25, PM10 70)">
            <TrenChartLine data={tren} tipeChart="line" seriesList={[
              { key: "pm25", label: "PM2.5", warna: WARNA.pm25 },
              { key: "pm10", label: "PM10", warna: WARNA.pm10 },
              { key: "bm_pm25", label: "Baku mutu PM2.5", warna: WARNA.bm },
              { key: "bm_pm10", label: "Baku mutu PM10", warna: "#D1D5DB" },
            ]} />
          </Panel>

          {/* SUHU & KELEMBAPAN */}
          <Panel judul={`Rata-rata Suhu (°C) dan Kelembapan (%RH)${labelWil}`} sub="Baku mutu: suhu 18–30 °C, kelembapan 40–60 %RH">
            <TrenChartLine data={tren} tipeChart="line" seriesList={[
              { key: "suhu", label: "Suhu (°C)", warna: WARNA.suhu },
              { key: "kelembapan", label: "Kelembapan (%RH)", warna: WARNA.lembap },
            ]} />
          </Panel>

          {/* KIMIA */}
          <Panel judul={`Rata-rata HCHO (ppm) dan TVOC (mg/m³)${labelWil}`} sub="Garis abu-abu = baku mutu HCHO 0,1 ppm. TVOC belum punya acuan di formulir.">
            <TrenChartLine data={tren} tipeChart="line" seriesList={[
              { key: "hcho", label: "HCHO (ppm)", warna: WARNA.hcho },
              { key: "tvoc", label: "TVOC (mg/m³)", warna: WARNA.tvoc },
              { key: "bm_hcho", label: "Baku mutu HCHO", warna: WARNA.bm },
            ]} />
          </Panel>

          {/* KEPATUHAN PER PARAMETER */}
          <Panel judul={`Kepatuhan per Parameter${labelWil} (% memenuhi baku mutu)`} sub="Hanya parameter yang punya baku mutu tunggal; nilai kosong dan tidak wajar tidak dihitung">
            <TrenChartLine data={kepatuhan} tipeChart="bar" seriesList={[{ key: "persen_memenuhi", label: "% memenuhi baku mutu", warna: WARNA.ms }]} />
          </Panel>

          {/* PM2.5 PER LOKASI */}
          <Panel lebar judul={`Rata-rata PM2.5 per Lokasi${labelWil} (µg/m³)`} sub="Dibandingkan dengan baku mutu 25 µg/m³">
            <TrenChartLine data={lokasi.slice(0, 20)} tipeChart="bar" seriesList={[
              { key: "pm25", label: "PM2.5 rata-rata", warna: WARNA.pm25 },
              { key: "bm_pm25", label: "Baku mutu", warna: WARNA.bm },
            ]} />
          </Panel>

          {/* MATRIKS LOKASI x PARAMETER */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs lg:col-span-2">
            <div className="mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Matriks Lokasi × Parameter{labelWil}</h3>
              <p className="mt-0.5 text-xs text-gray-500">Rata-rata nilai ukur. Merah = melampaui baku mutu, abu-abu = tanpa data. Nilai tidak wajar dikeluarkan dari rata-rata.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                  <tr>
                    <th className="px-3 py-3">Lokasi</th><th className="px-3 py-3 text-center">n</th>
                    {parameterMatriks.map((p) => (
                      <th key={p.kunci} className="px-3 py-3 text-center" title={`Acuan: ${teksBakuMutu(p)}`}>
                        {p.nama.replace(/\s*\(.*\)$/, "")}<div className="font-normal text-gray-400">{p.satuan}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">MS / TMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lokasi.map((l) => (
                    <tr key={l.name} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-800">{l.name}</td>
                      <td className="px-3 py-2 text-center">{l.n}</td>
                      {parameterMatriks.map((p) => {
                        const v = l.rata[p.kunci as KunciParam] ?? null;
                        const lewat = v !== null && adaBakuMutu(p) && ((p.min !== undefined && v < p.min) || (p.max !== undefined && v > p.max));
                        return (
                          <td key={p.kunci} className={`px-3 py-2 text-center ${v === null ? "bg-gray-50 text-gray-300" : lewat ? "bg-red-50 font-semibold text-red-700" : ""}`}>
                            {fmt(v, p.kunci === "hcho" || p.kunci === "tvoc" ? 3 : 1)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center"><span className="text-green-700">{l.ms}</span> / <span className="text-red-600">{l.tms}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TMS TERBARU */}
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-red-900">Pengukuran TMS Terbaru</h3>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">{ringkasan.jumlah.TMS} TMS</span>
            </div>
            {tmsTerbaru.length === 0 ? (
              <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center text-xs font-medium text-green-700">Tidak ada pengukuran TMS pada filter ini.</div>
            ) : (
              <ul className="divide-y divide-gray-100 text-xs">
                {tmsTerbaru.map(({ r, n }) => (
                  <li key={r.id} className="py-2">
                    <div className="flex justify-between gap-2"><span className="font-semibold text-gray-800">{lokasiLabel(r)}{r.nama_ruangan ? ` · ${r.nama_ruangan}` : ""}</span><span className="whitespace-nowrap text-gray-500">{tglIndo(r.tanggal)}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.melampaui.map((k) => {
                        const p = PARAMETER.find((x) => x.kunci === k)!;
                        return <span key={k} className="rounded-md bg-red-100 px-2 py-0.5 font-semibold text-red-700">{p.nama.replace(/\s*\(.*\)$/, "")} {fmt(r[k], 3)} {p.satuan} (acuan {teksBakuMutu(p)})</span>;
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* PERLU PERHATIAN DATA */}
          <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-amber-900">Data Perlu Dilengkapi / Diperiksa</h3>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{ringkasan.jumlah.BELUM_LENGKAP + ringkasan.jumlah.ANOMALI}</span>
            </div>
            {perhatian.length === 0 ? (
              <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center text-xs font-medium text-green-700">Semua data lengkap dan wajar.</div>
            ) : (
              <ul className="divide-y divide-gray-100 text-xs">
                {perhatian.map(({ r, n }) => (
                  <li key={r.id} className="py-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-gray-800">{lokasiLabel(r)}{r.nama_ruangan ? ` · ${r.nama_ruangan}` : ""}</span>
                      <span className={`rounded-md px-2 py-0.5 font-semibold ${BADGE[n.status]}`}>{LABEL_STATUS[n.status]}</span>
                    </div>
                    <div className="mt-1 text-gray-500">
                      {tglIndo(r.tanggal)}
                      {n.kosong.length > 0 && ` · kosong: ${n.kosong.map((k) => PARAMETER.find((p) => p.kunci === k)!.nama.replace(/\s*\(.*\)$/, "")).join(", ")}`}
                      {n.anomali.length > 0 && ` · tidak wajar: ${n.anomali.map((k) => `${PARAMETER.find((p) => p.kunci === k)!.nama.replace(/\s*\(.*\)$/, "")} ${fmt(r[k], 3)}`).join(", ")} (periksa satuan)`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-500 lg:col-span-2">
            Status: {URUTAN_STATUS.map((s) => LABEL_STATUS[s]).join(" · ")}. Pengukuran dinilai &quot;Belum Lengkap&quot; bila PM2.5, PM10, suhu, kelembapan, HCHO, atau TVOC kosong (angka 0 dianggap terisi).
            TVOC, SO₂, NO₂, dan O₃ ditampilkan tetapi tidak menentukan MS/TMS (tanpa baku mutu tunggal pada formulir). Wilayah kerja data lama dibaca dari awalan teks Lokasi.
          </p>
        </div>
      )}
    </div>
  );
}
