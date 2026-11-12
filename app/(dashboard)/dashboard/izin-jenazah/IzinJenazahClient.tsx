"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type Hitung = { label: string; jumlah: number };
export type BarisTerbaru = { noSurat: string; tanggal: string; wilayah: string; jenis: string; jk: string; kebangsaan: string; arah: string };
export type DataIzinJenazah = {
  tahun: number;
  total: number;
  bulanIni: number | null;
  bulanLalu: number | null;
  rataBulanan: number;
  bulanan: { name: string; jumlah: number }[];
  perWilayah: Hitung[];
  jenisIzin: Hitung[];
  jenisKelamin: Hitung[];
  arah: Hitung[];
  sebab: Hitung[];
  kebangsaan: Hitung[];
  provinsi: Hitung[];
  maskapai: Hitung[];
  umur: Hitung[];
  terbaru: BarisTerbaru[];
};

const WARNA = ["#0F4C5C", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51", "#6D597A", "#457B9D", "#8D99AE"];
const potong = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function FilterWilayah({ opsi }: { opsi: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const sekarang = sp.get("wilayah") ?? "semua";
  function ubah(v: string) {
    const p = new URLSearchParams(sp.toString());
    if (v === "semua") p.delete("wilayah");
    else p.set("wilayah", v);
    router.push(`${pathname}?${p.toString()}`);
  }
  return (
    <select
      value={sekarang}
      onChange={(e) => ubah(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
    >
      <option value="semua">Semua wilayah kerja</option>
      {opsi.map((w) => (
        <option key={w} value={w}>{w}</option>
      ))}
    </select>
  );
}

function Kartu({ judul, sub, children, kelas = "" }: { judul: string; sub?: string; children: React.ReactNode; kelas?: string }) {
  return (
    <section className={`rounded-xl border border-gray-100 bg-white p-4 shadow-xs ${kelas}`}>
      <h2 className="text-sm font-semibold text-[#0F2A38]">{judul}</h2>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Kosong = () => <p className="py-10 text-center text-xs text-gray-400">Belum ada data</p>;

function Statistik({ label, nilai, catatan, warna }: { label: string; nilai: string; catatan?: string; warna: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs" style={{ borderTop: `3px solid ${warna}` }}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#0F2A38]">{nilai}</p>
      {catatan && <p className="mt-1 text-xs text-gray-500">{catatan}</p>}
    </div>
  );
}

function BarHorizontal({ data, warna = "#0F4C5C" }: { data: Hitung[]; warna?: string }) {
  if (!data.length) return <Kosong />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(170, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} tickFormatter={(v: string) => potong(v, 22)} />
        <Tooltip />
        <Bar dataKey="jumlah" name="Jumlah" fill={warna} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donat({ data }: { data: Hitung[] }) {
  if (!data.length) return <Kosong />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="jumlah" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={WARNA[i % WARNA.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function IzinJenazahClient({ data }: { data: DataIzinJenazah }) {
  const selisih =
    data.bulanIni !== null && data.bulanLalu !== null && data.bulanLalu > 0
      ? Math.round(((data.bulanIni - data.bulanLalu) / data.bulanLalu) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Statistik label={`Total izin ${data.tahun}`} nilai={data.total.toLocaleString("id-ID")} warna="#0F4C5C" />
        <Statistik label="Bulan ini" nilai={data.bulanIni === null ? "–" : String(data.bulanIni)} catatan={data.bulanIni === null ? "Hanya untuk tahun berjalan" : undefined} warna="#2A9D8F" />
        <Statistik
          label="Dibanding bulan lalu"
          nilai={selisih === null ? "–" : `${selisih > 0 ? "+" : ""}${selisih}%`}
          catatan={data.bulanLalu === null ? undefined : `Bulan lalu: ${data.bulanLalu}`}
          warna="#E9C46A"
        />
        <Statistik label="Rata-rata per bulan" nilai={String(data.rataBulanan)} warna="#E76F51" />
      </div>

      <Kartu judul="Tren Bulanan" sub={`Jumlah izin diterbitkan per bulan, ${data.tahun}`}>
        {data.total === 0 ? (
          <Kosong />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bulanan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" name="Izin diterbitkan" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Kartu>

      <div className="grid gap-6 lg:grid-cols-3">
        <Kartu judul="Jenis Izin"><Donat data={data.jenisIzin} /></Kartu>
        <Kartu judul="Jenis Kelamin"><Donat data={data.jenisKelamin} /></Kartu>
        <Kartu judul="Diangkut / Tiba" sub="Arah pengangkutan"><Donat data={data.arah} /></Kartu>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Kartu judul="Per Wilayah Kerja"><BarHorizontal data={data.perWilayah} /></Kartu>
        <Kartu judul="Kelompok Umur" sub="Umur saat izin diterbitkan (hanya yang tanggal lahirnya terisi)">
          {data.umur.every((u) => u.jumlah === 0) ? <Kosong /> : <BarHorizontal data={data.umur} warna="#2A9D8F" />}
        </Kartu>
        <Kartu judul="Sebab Kematian" sub="10 terbanyak (teks bebas dari Sinkarkes)"><BarHorizontal data={data.sebab} warna="#E76F51" /></Kartu>
        <Kartu judul="Kebangsaan"><BarHorizontal data={data.kebangsaan} warna="#6D597A" /></Kartu>
        <Kartu judul="Provinsi Asal"><BarHorizontal data={data.provinsi} warna="#457B9D" /></Kartu>
        <Kartu judul="Maskapai / Pelayaran"><BarHorizontal data={data.maskapai} warna="#F4A261" /></Kartu>
      </div>

      <Kartu judul="Izin Terbaru" sub="10 surat terakhir pada filter yang dipilih">
        {data.terbaru.length === 0 ? (
          <Kosong />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">No. Surat</th>
                  <th className="py-2 pr-3">Wilayah</th>
                  <th className="py-2 pr-3">Jenis</th>
                  <th className="py-2 pr-3">JK</th>
                  <th className="py-2 pr-3">Kebangsaan</th>
                  <th className="py-2">Arah</th>
                </tr>
              </thead>
              <tbody>
                {data.terbaru.map((b) => (
                  <tr key={b.noSurat + b.tanggal} className="border-b border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap">{b.tanggal}</td>
                    <td className="py-2 pr-3">{b.noSurat}</td>
                    <td className="py-2 pr-3">{b.wilayah}</td>
                    <td className="py-2 pr-3">{b.jenis}</td>
                    <td className="py-2 pr-3">{b.jk}</td>
                    <td className="py-2 pr-3">{b.kebangsaan}</td>
                    <td className="py-2">{b.arah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>
    </div>
  );
}