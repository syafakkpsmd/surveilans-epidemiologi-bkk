// app/(dashboard)/dashboard/pengawasan-klinik/page.tsx
import { createClient } from '@/lib/supabase/server';
import { hitungBreakdownKategori, hitungStatusKepatuhan } from '@/lib/pengawasan-klinik/hitungKepatuhan';
import PengawasanKlinikClient from './PengawasanKlinikClient';

export default async function PengawasanKlinikPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('pengawasan_klinik')
    .select('*, klinik_binaan(nama_klinik, jenis_fasilitas, alamat_klinik, kabupaten_kota, telepon, latitude, longitude)')
    .order('tanggal_kegiatan', { ascending: false });

  // seluruh klinik binaan — supaya klinik yang BELUM pernah diperiksa tetap muncul di tabel dengan angka 0
  const { data: klinikRows } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik, jenis_fasilitas, alamat_klinik, kabupaten_kota, telepon, latitude, longitude')
    // .eq('kategori', 'klinik')   // aktifkan kalau baris kategori 'bkk' tidak boleh ikut tampil
    .order('nama_klinik');

  const semuaDataMentah = rows ?? [];

  // Keterangan "item bermasalah" DIHITUNG ULANG dari kolom checklist mentah tiap baris
  // (bukan dipercaya dari kolom item_bermasalah yang tersimpan), supaya perbaikan
  // wording di hitungKepatuhan.ts (mis. label positif -> negatif) otomatis berlaku
  // untuk data yang sudah lama tersimpan juga, tanpa perlu migrasi database.
  const semuaData = semuaDataMentah.map((r) => ({
    ...r,
    item_bermasalah: hitungStatusKepatuhan(r as unknown as Record<string, boolean | null>).itemBermasalah,
  }));
  const semuaKlinik = klinikRows ?? [];

  // ambil pengawasan TERBARU per klinik (data sudah diurutkan tanggal desc)
  const terlihat = new Set<string>();
  const dataTerbaru = semuaData.filter((row) => {
    if (terlihat.has(row.klinik_id)) return false;
    terlihat.add(row.klinik_id);
    return true;
  });

  const ringkasanStatus = {
    memenuhi_syarat: dataTerbaru.filter((r) => r.status_kepatuhan === 'memenuhi_syarat').length,
    perlu_perbaikan: dataTerbaru.filter((r) => r.status_kepatuhan === 'perlu_perbaikan').length,
    tidak_memenuhi_syarat: dataTerbaru.filter((r) => r.status_kepatuhan === 'tidak_memenuhi_syarat').length,
  };

  const breakdownPerKlinik = dataTerbaru.map((r) =>
    hitungBreakdownKategori(r as unknown as Record<string, boolean | null>)
  );
  const kategoriList = ['Administrasi', 'Sarana', 'Peralatan'] as const;
  const rataRataKategori = kategoriList.map((kategori) => {
    const nilaiSemua = breakdownPerKlinik.map(
      (b) => b.find((k) => k.kategori === kategori)?.persentase ?? 0
    );
    const rata = nilaiSemua.length
      ? nilaiSemua.reduce((a, b) => a + b, 0) / nilaiSemua.length
      : 0;
    return { kategori, persentase: Math.round(rata * 10) / 10 };
  });

  const titikPeta = dataTerbaru.map((r) => ({
    id: r.klinik_id,
    nama_klinik: r.klinik_binaan?.nama_klinik ?? '-',
    alamat_klinik: r.klinik_binaan?.alamat_klinik ?? null,
    kabupaten_kota: r.klinik_binaan?.kabupaten_kota ?? null,
    telepon: r.klinik_binaan?.telepon ?? null,
    latitude: r.klinik_binaan?.latitude ?? null,
    longitude: r.klinik_binaan?.longitude ?? null,
    statusTerbaru: r.status_kepatuhan as string | null,
  }));

  // riwayat lengkap: satu baris per kunjungan — dipakai grafik tren & detail kolom "Jumlah Pengawasan"
  const riwayatPengawasan = semuaData.map((r) => {
    const daftarItemBermasalah = (r.item_bermasalah as string[] | null) ?? [];
    return {
      id: r.id as string,
      klinikId: r.klinik_id as string,
      namaKlinik: r.klinik_binaan?.nama_klinik ?? '-',
      tanggal: r.tanggal_kegiatan as string,
      persentase: (r.persentase_kepatuhan as number) ?? 0,
      status: (r.status_kepatuhan as string) ?? '',
      jumlahItemBermasalah: daftarItemBermasalah.length,
      itemBermasalah: daftarItemBermasalah,
    };
  });

  // jumlah pengawasan per klinik
  const jumlahPerKlinik = new Map<string, number>();
  semuaData.forEach((r) => {
    jumlahPerKlinik.set(r.klinik_id, (jumlahPerKlinik.get(r.klinik_id) ?? 0) + 1);
  });

  // tabel dibangun dari SELURUH klinik binaan, lalu digabung dengan pengawasan terbarunya
  const terbaruPerKlinik = new Map(dataTerbaru.map((r) => [r.klinik_id as string, r]));
  const tabelKlinik = semuaKlinik.map((klinik) => {
    const terakhir = terbaruPerKlinik.get(klinik.id);
    return {
      id: klinik.id,
      klinikId: klinik.id,
      namaKlinik: klinik.nama_klinik ?? '-',
      jenisFasilitas: klinik.jenis_fasilitas ?? '-',
      tanggalTerakhir: (terakhir?.tanggal_kegiatan as string | undefined) ?? null,
      status: (terakhir?.status_kepatuhan as string | undefined) ?? null,
      persentase: (terakhir?.persentase_kepatuhan as number | undefined) ?? null,
      itemBermasalah: (terakhir?.item_bermasalah as string[] | null) ?? [],
      jumlahPengawasan: jumlahPerKlinik.get(klinik.id) ?? 0,
    };
  });

  // urutkan: yang sudah diperiksa dulu (terbaru di atas), klinik belum diperiksa di bawah
  tabelKlinik.sort((a, b) => {
    if (!a.tanggalTerakhir && !b.tanggalTerakhir) return a.namaKlinik.localeCompare(b.namaKlinik);
    if (!a.tanggalTerakhir) return 1;
    if (!b.tanggalTerakhir) return -1;
    return new Date(b.tanggalTerakhir).getTime() - new Date(a.tanggalTerakhir).getTime();
  });

  // data mentah LENGKAP (semua submission, semua kolom) untuk keperluan download Excel
  const dataLengkapUntukExport = semuaData.map((r) => ({
    ...r,
    nama_klinik: r.klinik_binaan?.nama_klinik ?? '-',
    jenis_fasilitas: r.klinik_binaan?.jenis_fasilitas ?? '-',
    kabupaten_kota: r.klinik_binaan?.kabupaten_kota ?? '-',
  }));

  return (
    <PengawasanKlinikClient
      ringkasanStatus={ringkasanStatus}
      rataRataKategori={rataRataKategori}
      tabelKlinik={tabelKlinik}
      totalKlinikDiawasi={dataTerbaru.length}
      titikPeta={titikPeta}
      riwayatPengawasan={riwayatPengawasan}
      dataLengkapUntukExport={dataLengkapUntukExport}
    />
  );
}