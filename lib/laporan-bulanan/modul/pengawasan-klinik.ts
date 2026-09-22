import "server-only";
import { hitungBreakdownKategori, hitungStatusKepatuhan } from "@/lib/pengawasan-klinik/hitungKepatuhan";
import { createClient } from "@/lib/supabase/server";
import { fmtAngka, fmtPersen, labelBulanan, labelRentang } from "../periode";
import type { DataModul, KonteksLaporan, ModulLaporan } from "../types";
import { ambilSemuaHalaman, desimal, jumlah } from "./_bantu";

const JUDUL = "Pengawasan Klinik";
const STATUS_LABEL: Record<string, string> = { memenuhi_syarat: "Memenuhi syarat", perlu_perbaikan: "Perlu perbaikan", tidak_memenuhi_syarat: "Tidak memenuhi syarat" };

const akhirBulan = (tahun: number, bulan: number): string => new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);
const tanggalId = (iso: string): string => {
  const [t, b, h] = iso.slice(0, 10).split("-").map(Number);
  return `${h}/${b}/${t}`;
};

interface Baris {
  id: string;
  klinik_id: string;
  tanggal_kegiatan: string;
  persentase_kepatuhan: number | null;
  status_kepatuhan: string | null;
  klinik_binaan: { nama_klinik: string | null } | null;
  [checklist: string]: unknown;
}

export const modulPengawasanKlinik: ModulLaporan = {
  kunci: "pengawasan-klinik",
  judul: JUDUL,
  kelompok: "Klinik Binaan BKK",
  async ambil({ tahun, bulanAkhir }: KonteksLaporan): Promise<DataModul | null> {
    const supabase = await createClient();
    const semua = (await ambilSemuaHalaman((dari, sampai) =>
      supabase
        .from("pengawasan_klinik")
        .select("*, klinik_binaan(nama_klinik)")
        .gte("tanggal_kegiatan", `${tahun}-01-01`)
        .lte("tanggal_kegiatan", akhirBulan(tahun, bulanAkhir))
        .order("tanggal_kegiatan", { ascending: false })
        .order("id")
        .range(dari, sampai),
    )) as Baris[];
    if (semua.length === 0) return null;

    const { count } = await supabase.from("klinik_binaan").select("id", { count: "exact", head: true });
    const totalKlinik = count ?? 0;

    const kunjungan = new Array<number>(bulanAkhir).fill(0);
    for (const r of semua) {
      const bulan = Number(String(r.tanggal_kegiatan).slice(5, 7));
      if (bulan >= 1 && bulan <= bulanAkhir) kunjungan[bulan - 1] += 1;
    }

    // Pengawasan terbaru tiap klinik dalam periode (data sudah terurut tanggal menurun).
    const jumlahPerKlinik = new Map<string, number>();
    const terbaru = new Map<string, Baris>();
    for (const r of semua) {
      jumlahPerKlinik.set(r.klinik_id, (jumlahPerKlinik.get(r.klinik_id) ?? 0) + 1);
      if (!terbaru.has(r.klinik_id)) terbaru.set(r.klinik_id, r);
    }
    const daftar = Array.from(terbaru.values());
    const hitung = (status: string) => daftar.filter((r) => r.status_kepatuhan === status).length;
    const perluTindak = hitung("perlu_perbaikan") + hitung("tidak_memenuhi_syarat");

    // Rata-rata kepatuhan per kategori dan item bermasalah dihitung ulang dari checklist, seperti halaman Pengawasan Klinik.
    const ceklis = (r: Baris) => r as unknown as Record<string, boolean | null>;
    const kategori = ["Administrasi", "Sarana", "Peralatan"].map((k) => {
      const nilai = daftar.map((r) => hitungBreakdownKategori(ceklis(r)).find((b) => b.kategori === k)?.persentase ?? 0);
      return { k, rata: nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : 0 };
    });
    const itemTeratas = new Map<string, number>();
    for (const r of daftar) for (const item of hitungStatusKepatuhan(ceklis(r)).itemBermasalah) itemTeratas.set(item, (itemTeratas.get(item) ?? 0) + 1);
    const masalah = Array.from(itemTeratas, ([item, n]) => ({ item, n })).sort((a, b) => b.n - a.n).slice(0, 3);

    const temuan: string[] = [`Rata-rata kepatuhan per kategori: ${kategori.map((x) => `${x.k} ${desimal(x.rata, 1)}%`).join(", ")}.`];
    if (masalah.length > 0) temuan.push(`Item bermasalah tersering: ${masalah.map((m) => `${m.item} (${fmtAngka(m.n)} klinik)`).join("; ")}.`);
    const tms = daftar.filter((r) => r.status_kepatuhan === "tidak_memenuhi_syarat").map((r) => r.klinik_binaan?.nama_klinik ?? "-");
    if (tms.length > 0) temuan.push(`Tidak memenuhi syarat: ${tms.slice(0, 4).join(", ")}${tms.length > 4 ? `, dan ${tms.length - 4} lainnya` : ""}.`);

    return {
      kunci: "pengawasan-klinik",
      judul: JUDUL,
      kelompok: "Klinik Binaan BKK",
      kartu: [
        { label: "Kunjungan pengawasan", nilai: fmtAngka(semua.length), catatan: labelRentang(tahun, bulanAkhir) },
        { label: "Klinik diawasi", nilai: fmtAngka(daftar.length), catatan: totalKlinik > 0 ? `dari ${fmtAngka(totalKlinik)} klinik binaan` : undefined },
        { label: "Memenuhi syarat", nilai: fmtAngka(hitung("memenuhi_syarat")), nada: "ok", catatan: "pengawasan terbaru tiap klinik" },
        { label: "Perlu tindak lanjut", nilai: fmtAngka(perluTindak), nada: perluTindak > 0 ? "warn" : undefined, catatan: "perlu perbaikan atau tidak memenuhi syarat" },
      ],
      tren: { jenis: "batang", label: labelBulanan(bulanAkhir), seri: [{ nama: "Kunjungan pengawasan", nilai: kunjungan, warna: "0A7A78" }], satuan: "Jumlah kunjungan" },
      tabel: {
        kepala: ["Klinik", "Pengawasan terakhir", "Kepatuhan", "Status", "Kunjungan"],
        kanan: [2, 4],
        lebar: [3.5, 1.8, 1.2, 2.2, 1.2],
        baris: daftar.map((r) => [r.klinik_binaan?.nama_klinik ?? "-", tanggalId(String(r.tanggal_kegiatan)), fmtPersen(r.persentase_kepatuhan), STATUS_LABEL[r.status_kepatuhan ?? ""] ?? "-", fmtAngka(jumlahPerKlinik.get(r.klinik_id) ?? 0)]),
      },
      temuan,
      narasi: [`Status kepatuhan mengikuti checklist pengawasan: tidak memenuhi syarat bila ada item kritikal yang gagal, perlu perbaikan bila hanya item pendukung yang gagal. Jumlah kunjungan ${fmtAngka(jumlah(kunjungan))} pada periode laporan.`],
    };
  },
};
