import { getPengguna } from '@/lib/auth/session';
import TombolInputVektor from '@/components/vektor/TombolInputVektor';

export default async function VektorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tombol Input Data hanya untuk admin/petugas (server action menolak peran lain juga).
  const user = await getPengguna();
  const bolehInput = user?.role === 'admin' || user?.role === 'petugas';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {bolehInput && (
        <div className="mb-4 flex justify-end">
          <TombolInputVektor />
        </div>
      )}
      {children}
    </div>
  );
}