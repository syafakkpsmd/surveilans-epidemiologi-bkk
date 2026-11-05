import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusAkses } from '@/lib/auth/getStatusAkses';
import { getBarisGlobal } from '@/lib/db/modul/globalEmergingEdit';
import { DAFTAR_PENYAKIT, DAFTAR_NEGARA } from '@/types/global-emerging.types';
import EditGlobalClient from './EditGlobalClient';

export const dynamic = 'force-dynamic';

const kotak = 'rounded-lg border border-gray-200 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-semibold text-gray-600';

export default async function EditGlobalEmergingPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; penyakit?: string; negara?: string; jenis?: string; id?: string }>;
}) {
  const { sudahLogin, role } = await getStatusAkses();
  if (!sudahLogin || (role !== 'petugas' && role !== 'admin')) redirect('/dashboard/global-emerging');

  const sp = await searchParams;
  const tahunIni = new Date().getFullYear();
  const tahunMentah = Number(sp.tahun);
  const tahun = Number.isInteger(tahunMentah) && tahunMentah >= 2000 && tahunMentah <= 2100 ? tahunMentah : tahunIni;
  const penyakit = sp.penyakit && (DAFTAR_PENYAKIT as readonly string[]).includes(sp.penyakit) ? sp.penyakit : undefined;
  const negara = sp.negara && (DAFTAR_NEGARA as readonly string[]).includes(sp.negara) ? sp.negara : undefined;
  const jenis = sp.jenis === 'mingguan' || sp.jenis === 'bulanan' ? sp.jenis : undefined;
  const idAwal = sp.id && /^\d+$/.test(sp.id) ? sp.id : undefined;

  const baris = await getBarisGlobal({ tahun, penyakit, negara, jenis });

  return (
    <div className="min-h-screen bg-[#EEF1F4] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href="/dashboard/global-emerging" className="text-sm text-[#0F4C5C] underline">
            &larr; Kembali ke Dashboard Global Emerging
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0F2A38]">Edit Data Penyakit Infeksi Emerging</h1>
          <p className="text-sm text-gray-500">Pilih data lewat filter, lalu klik Edit atau Hapus pada barisnya.</p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-[10px] bg-white p-4 shadow-sm">
          <div>
            <label className={label} htmlFor="tahun">Tahun</label>
            <input id="tahun" name="tahun" type="number" min={2000} max={2100} defaultValue={tahun} className={`${kotak} w-24`} />
          </div>
          <div>
            <label className={label} htmlFor="penyakit">Penyakit</label>
            <select id="penyakit" name="penyakit" defaultValue={penyakit ?? ''} className={kotak}>
              <option value="">Semua</option>
              {DAFTAR_PENYAKIT.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="negara">Negara</label>
            <select id="negara" name="negara" defaultValue={negara ?? ''} className={kotak}>
              <option value="">Semua</option>
              {DAFTAR_NEGARA.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="jenis">Periode</label>
            <select id="jenis" name="jenis" defaultValue={jenis ?? ''} className={kotak}>
              <option value="">Semua</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>
          <button className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Tampilkan
          </button>
        </form>

        <EditGlobalClient
          key={idAwal ?? 'daftar'}
          idAwal={idAwal}
          baris={baris}
          daftarPenyakit={[...DAFTAR_PENYAKIT]}
          daftarNegara={[...DAFTAR_NEGARA]}
        />
      </div>
    </div>
  );
}