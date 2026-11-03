import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function RegisterBerhasilPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF1F4] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-[10px] shadow-sm border border-black/5 p-8 space-y-4">
          <CheckCircle2 className="mx-auto text-green-600" size={48} />
          <h1 className="text-lg font-semibold text-[#0F2A38]">Pendaftaran Berhasil</h1>
          <p className="text-sm text-[#0F2A38]/70">
            Akun Anda telah terdaftar dan sedang menunggu persetujuan Admin.
            Anda akan bisa login setelah akun disetujui.
          </p>

          <div className="pt-2 space-y-2">
            <Link
              href="/dashboard"
              className="block w-full rounded-[8px] bg-[#0F2A38] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F4C5C] transition-colors"
            >
              Lanjutkan sebagai Tamu
            </Link>
            <Link
              href="/login"
              className="block w-full text-sm text-[#0F4C5C] hover:underline"
            >
              Kembali ke halaman Masuk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}