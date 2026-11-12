// app/(dashboard)/dashboard/izin-jenazah/page.tsx
import Link from "next/link";
import { getDbClient } from "@/lib/db/client";
import type { DbValue } from "@/lib/db/client";
import { getUserRole } from "@/lib/auth/get-user-role";
import { getDaftarWilker } from "@/lib/wilayah-kerja/server";
import FilterTahun from "@/components/FilterTahun";
import { bacaTahun } from "@/lib/tahun";
import IzinJenazahClient, { FilterWilayah, type DataIzinJenazah, type Hitung } from "./IzinJenazahClient";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tahun?: string | string[]; wilayah?: string | string[] }> };
const satu = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

async function ambil(sql: string, args: DbValue[]) {
  const r = await getDbClient().execute({ sql, args });
  return r.rows as Record<string, unknown>[];
}

export default async function IzinJenazahPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tahun = bacaTahun(satu(sp.tahun));
  const wilayah = satu(sp.wilayah);

  // Syarat umum: tahun terbit + (opsional) wilayah kerja. Nama kolom ditulis tetap di kode, nilai lewat parameter.
  const syarat = ["tanggal_diterbitkan::text >= ?", "tanggal_diterbitkan::text < ?"];
  const args: DbValue[] = [`${tahun}-01-01`, `${tahun + 1}-01-01`];
  if (wilayah && wilayah !== "semua") {
    syarat.push("lower(replace(wilayah_kerja, ' ', '')) = ?");
    args.push(wilayah.toLowerCase().replace(/\s+/g, ""));
  }
  const where = syarat.join(" AND ");

  const top = async (kolom: string, n = 8): Promise<Hitung[]> => {
    const rows = await ambil(
      `SELECT coalesce(nullif(initcap(trim(${kolom}::text)), ''), 'Tidak diisi') AS label, count(*)::int AS jumlah
         FROM izin_jenazah WHERE ${where} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${n}`,
      args,
    );
    return rows.map((r) => ({ label: String(r.label), jumlah: Number(r.jumlah) }));
  };

  const [role, daftarWilker, bulananRows, umurRows, terbaruRows, perWilayah, jenisIzin, jenisKelamin, arah, sebab, kebangsaan, provinsi, maskapai] =
    await Promise.all([
      getUserRole(),
      getDaftarWilker(),
      ambil(`SELECT extract(month FROM tanggal_diterbitkan)::int AS bulan, count(*)::int AS jumlah FROM izin_jenazah WHERE ${where} GROUP BY 1`, args),
      ambil(`SELECT date_part('year', age(tanggal_diterbitkan, tanggal_lahir))::int AS umur FROM izin_jenazah WHERE ${where} AND tanggal_lahir IS NOT NULL`, args),
      ambil(
        `SELECT no_surat, tanggal_diterbitkan::text AS tanggal, wilayah_kerja, izin_angkut, jenis_kelamin, kebangsaan, diangkut_tiba
           FROM izin_jenazah WHERE ${where} ORDER BY tanggal_diterbitkan DESC, no_surat LIMIT 10`,
        args,
      ),
      top("wilayah_kerja", 10),
      top("izin_angkut"),
      top("jenis_kelamin"),
      top("diangkut_tiba"),
      top("sebab_kematian", 10),
      top("kebangsaan"),
      top("provinsi"),
      top("maskapai_pelayaran"),
    ]);

  const perBulan = new Array(12).fill(0) as number[];
  for (const r of bulananRows) perBulan[Number(r.bulan) - 1] = Number(r.jumlah);
  const total = perBulan.reduce((a, b) => a + b, 0);

  const sekarang = new Date();
  const tahunIni = tahun === sekarang.getFullYear();
  const bln = sekarang.getMonth(); // 0-based
  const bulanIni = tahunIni ? perBulan[bln] : null;
  const bulanLalu = tahunIni && bln > 0 ? perBulan[bln - 1] : null;
  const bulanTerhitung = tahunIni ? bln + 1 : 12;

  const kelompokUmur: [string, number, number][] = [["0–4", 0, 4], ["5–17", 5, 17], ["18–39", 18, 39], ["40–59", 40, 59], ["60+", 60, 200]];
  const umur: Hitung[] = kelompokUmur.map(([label, a, b]) => ({
    label,
    jumlah: umurRows.filter((r) => Number(r.umur) >= a && Number(r.umur) <= b).length,
  }));

  const data: DataIzinJenazah = {
    tahun,
    total,
    bulanIni,
    bulanLalu,
    rataBulanan: Math.round((total / bulanTerhitung) * 10) / 10,
    bulanan: perBulan.map((jumlah, i) => ({ name: NAMA_BULAN[i], jumlah })),
    perWilayah, jenisIzin, jenisKelamin, arah, sebab, kebangsaan, provinsi, maskapai, umur,
    terbaru: terbaruRows.map((r) => ({
      noSurat: String(r.no_surat ?? ""),
      tanggal: String(r.tanggal ?? ""),
      wilayah: String(r.wilayah_kerja ?? ""),
      jenis: String(r.izin_angkut ?? ""),
      jk: String(r.jenis_kelamin ?? ""),
      kebangsaan: String(r.kebangsaan ?? ""),
      arah: String(r.diangkut_tiba ?? ""),
    })),
  };

  const bolehInput = role === "admin" || role === "petugas";
  const opsiWilayah = daftarWilker.filter((w) => w.aktif).map((w) => w.namaPendek);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Izin Angkut Jenazah</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Rekap surat izin angkut jenazah, abu, dan kerangka jenazah Tahun {tahun}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterWilayah opsi={opsiWilayah} />
          <FilterTahun />
          {bolehInput && (
            <Link
              href="/dashboard/input-data/izin-jenazah"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            >
              [+] Input Data
            </Link>
          )}
        </div>
      </div>

      <IzinJenazahClient data={data} />
    </div>
  );
}