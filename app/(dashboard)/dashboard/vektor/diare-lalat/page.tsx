// ================================================================
// SEGMEN 11 — app/(dashboard)/dashboard/vektor/diare-lalat/page.tsx
// ================================================================

import HalamanDiare from '@/components/vektor/HalamanDiare';

export default function VektorDiareLalatPage({
  searchParams,
}: {
  searchParams: Promise<{
    wilker?: string;
    tahun?: string;
    mode?: string;
    mgDari?: string;
    mgSampai?: string;
    bulanDari?: string;
    bulanSampai?: string;
  }>;
}) {
  return <HalamanDiare jenis="lalat" searchParams={searchParams} />;
}