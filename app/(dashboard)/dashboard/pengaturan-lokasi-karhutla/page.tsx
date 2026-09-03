import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { BarisWilayahIspa } from './BarisWilayahIspa';
import { BarisLokasiUdara } from './BarisLokasiUdara';
import {
  tambahWilayahIspa, hapusWilayahIspa, perbaruiWilayahIspa,
  tambahLokasiUdara, hapusLokasiUdara, perbaruiLokasiUdara,
} from './actions';

export default async function PengaturanLokasiKarhutlaPage() {
  const role = await getUserRole();
  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = createServiceRoleClient();
  const [{ data: wilayahIspa }, { data: lokasiUdara }] = await Promise.all([
    supabase.from('wilayah_ispa').select('*').order('urutan', { ascending: true }),
    supabase.from('lokasi_kualitas_udara').select('*').order('urutan', { ascending: true }),
  ]);

  const lokasiTerkelompok = (lokasiUdara ?? []).reduce<Record<string, typeof lokasiUdara>>((acc, l) => {
    const key = l.lokasi_induk ?? '_tanpa_induk';
    (acc[key] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <Link href="/dashboard/karhutla" className="mb-2 inline-block text-sm font-medium text-teal hover:underline">
          ← Kembali ke Dashboard Karhutla
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Khusus Admin</p>
        <h1 className="text-2xl font-bold text-ink">Kelola Lokasi Karhutla</h1>
        <p className="mt-1 text-sm text-muted">
          Lokasi yang ditambahkan di sini otomatis muncul di dropdown form ISPA dan Kualitas Udara,
          baik di dashboard maupun form publik.
        </p>
      </div>

      <section id="wilayah-ispa" className="rounded-card border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-bold text-ink">Wilayah ISPA</h2>

        <div className="space-y-2">
            {(wilayahIspa ?? []).map((w) => (
                <BarisWilayahIspa
                key={w.id}
                wilayah={w}
                perbaruiWilayahIspa={perbaruiWilayahIspa}
                hapusWilayahIspa={hapusWilayahIspa}
                />
            ))}
        </div>

        <form action={tambahWilayahIspa} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
          <input name="label" required placeholder="Label (mis. Klinik Baru)"
            className="rounded-control border border-border px-3 py-2 text-sm" />
          <input name="kode_wilker" required placeholder="Kode Wilker (mis. WK08)"
            className="rounded-control border border-border px-3 py-2 text-sm" />
          <input name="zona" placeholder="Zona (opsional)"
            className="rounded-control border border-border px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-3 rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal">
            Tambah Wilayah ISPA
          </button>
        </form>
      </section>

      <section id="lokasi-udara" className="rounded-card border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-bold text-ink">Lokasi Kualitas Udara</h2>

        {Object.entries(lokasiTerkelompok).map(([induk, items]) => (
          <div key={induk} className="space-y-1">
            <p className="text-sm font-semibold text-ink">{induk}</p>
              {(items ?? []).map((l) => (
                <BarisLokasiUdara
                    key={l.id}
                    lokasi={l}
                    perbaruiLokasiUdara={perbaruiLokasiUdara}
                    hapusLokasiUdara={hapusLokasiUdara}
                />
              ))}
          </div>
        ))}

        <form action={tambahLokasiUdara} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
          <input name="lokasi_induk" required placeholder="Lokasi induk (mis. APT Pranoto)"
            className="rounded-control border border-border px-3 py-2 text-sm" />
          <input name="sub_lokasi" placeholder="Sub-lokasi (opsional, mis. Kedatangan)"
            className="rounded-control border border-border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal">
            Tambah Lokasi
          </button>
        </form>
      </section>
    </div>
  );
}