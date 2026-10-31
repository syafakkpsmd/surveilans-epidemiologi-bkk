// Input data vaksinasi ICV / e-ICV per klinik: form, unggah Excel, dan daftar. Admin/petugas: semua klinik;
// petugas_klinik: hanya klinik yang ditautkan admin ke akunnya (lib/klinik/akses.ts).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPengguna } from '@/lib/auth/session';
import { daftarKlinikDiizinkan } from '@/lib/klinik/akses';
import InputKlinikShell from './InputKlinikShell';

export const dynamic = 'force-dynamic';

export default async function InputIcvPage({ searchParams }: { searchParams: Promise<{ bagian?: string | string[] }> }) {
  const sp = await searchParams;
  const bagian = (Array.isArray(sp.bagian) ? sp.bagian[0] : sp.bagian) === 'stok' ? 'stok' : 'vaksinasi';
  const pengguna = await getPengguna();
  if (!pengguna) redirect('/login');
  const klinik = await daftarKlinikDiizinkan(pengguna);

  if (klinik.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Input Data Klinik</h1>
        <p className="text-sm text-gray-600">
          Akun Anda belum ditautkan ke klinik mana pun, jadi belum ada data yang dapat diisi. Hubungi admin BKK untuk menautkan akun Anda ke klinik.
        </p>
        <Link href="/dashboard/klinik" className="mt-4 inline-block text-sm text-[#0F4C5C] underline">&larr; Kembali ke dashboard</Link>
      </div>
    );
  }
  return <InputKlinikShell klinik={klinik.map((k) => ({ id: k.id, nama: k.nama_klinik }))} awal={bagian} />;
}
