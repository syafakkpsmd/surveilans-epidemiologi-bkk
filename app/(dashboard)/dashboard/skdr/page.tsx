import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import { getDaftarWilayahKerjaSkdr, getRingkasanSkdrMingguan } from '@/lib/supabase/queries';
import SkdrClient from './SkdrClient';

export default async function SkdrPage() {
  const tanggalTampilan = new Date();
  tanggalTampilan.setDate(tanggalTampilan.getDate() - 7);
  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(tanggalTampilan);
  const [{ role }, daftarWilayah, data] = await Promise.all([
    getStatusAkses(),
    getDaftarWilayahKerjaSkdr(),
    getRingkasanSkdrMingguan(tahunEpid, mingguEpid),
  ]);

  return (
    <SkdrClient
      daftarWilayah={daftarWilayah}
      dataAwal={data}
      role={role}
      tahunEpidBerjalan={tahunEpid}
      mingguEpidBerjalan={mingguEpid}
    />
  );
}