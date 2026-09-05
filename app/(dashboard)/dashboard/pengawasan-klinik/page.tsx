// app/(dashboard)/dashboard/pengawasan-klinik/page.tsx
import { createClient } from '@/lib/supabase/server';
import { hitungBreakdownKategori } from '@/lib/pengawasan-klinik/hitungKepatuhan';
import PengawasanKlinikClient from './PengawasanKlinikClient';

export default async function PengawasanKlinikPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('pengawasan_klinik')
    .select('*, klinik_binaan(nama_klinik, jenis_fasilitas, alamat_klinik, kabupaten_kota, telepon, latitude, longitude)')
    .order('tanggal_kegiatan', { ascending: false });

  const semuaData = rows ?? [];

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

  const tabelKlinik = dataTerbaru.map((r) => ({
    id: r.id,
    klinikId: r.klinik_id,   // <-- pastikan baris ini ada
    namaKlinik: r.klinik_binaan?.nama_klinik ?? '-',
    jenisFasilitas: r.klinik_binaan?.jenis_fasilitas ?? '-',
    tanggalTerakhir: r.tanggal_kegiatan,
    status: r.status_kepatuhan as string,
    persentase: r.persentase_kepatuhan as number,
    itemBermasalah: (r.item_bermasalah as string[] | null) ?? [],
  }));

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
      dataLengkapUntukExport={dataLengkapUntukExport}
    />
  );
}