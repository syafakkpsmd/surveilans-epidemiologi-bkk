import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getDaftarPenyakit, getDaftarPropinsi, getDataMinggu } from '@/lib/db/modul/nasionalEmerging';
import { hitungMingguEpidemiologi } from '@/lib/epi-week';
import FormEditEmerging from './FormEditEmerging';

export const dynamic = 'force-dynamic';

const kotak = 'rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default async function EditNasionalEmergingPage({
  searchParams,
}: {
  searchParams: Promise<{ penyakit?: string; tahun?: string; minggu?: string }>;
}) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard/nasional-emerging');

  const sp = await searchParams;
  const [daftarPenyakit, daftarPropinsi] = await Promise.all([getDaftarPenyakit(), getDaftarPropinsi()]);
  const { tahunEpid, mingguEpid } = hitungMingguEpidemiologi(new Date());

  const penyakit = sp.penyakit && daftarPenyakit.includes(sp.penyakit) ? sp.penyakit : daftarPenyakit[0];
  const tahunMentah = Number(sp.tahun);
  const tahun = Number.isInteger(tahunMentah) && tahunMentah >= 2020 && tahunMentah <= 2100 ? tahunMentah : tahunEpid;
  const mingguMentah = Number(sp.minggu);
  const minggu = Number.isInteger(mingguMentah) && mingguMentah >= 1 && mingguMentah <= 53
    ? mingguMentah : Math.max(1, mingguEpid - 1);

  const data = await getDataMinggu(penyakit, tahun, minggu);
  const tersimpan = Object.fromEntries(
    data.map((d) => [d.propinsi, { kasus: d.jumlah_kasus, kematian: d.jumlah_kematian }])
  );

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/dashboard/nasional-emerging" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke Penyakit Infeksi Emerging Nasional
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Edit Data Emerging Nasional</h1>
        </div>

        {/* Pilih data yang akan diedit */}
        <form method="get" className="flex flex-wrap items-end gap-3 rounded-[10px] bg-white p-4 shadow-sm">
          <div>
            <label className={label} htmlFor="penyakit">Penyakit</label>
            <select id="penyakit" name="penyakit" defaultValue={penyakit} className={kotak}>
              {daftarPenyakit.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="tahun">Tahun</label>
            <input id="tahun" name="tahun" type="number" min={2020} max={2100} defaultValue={tahun} className={`${kotak} w-28`} />
          </div>
          <div>
            <label className={label} htmlFor="minggu">Minggu (1-53)</label>
            <input id="minggu" name="minggu" type="number" min={1} max={53} defaultValue={minggu} className={`${kotak} w-28`} />
          </div>
          <button className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Tampilkan
          </button>
        </form>

        <FormEditEmerging
          key={`${penyakit}|${tahun}|${minggu}`}
          penyakit={penyakit}
          tahun={tahun}
          minggu={minggu}
          daftarPropinsi={daftarPropinsi}
          tersimpan={tersimpan}
        />
      </div>
    </div>
  );
}