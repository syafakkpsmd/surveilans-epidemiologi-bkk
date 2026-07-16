// ================================================================
// SEGMEN 11 — app/(dashboard)/dashboard/vektor/diare-lalat/page.tsx
// ================================================================

import HalamanDiare from '@/components/vektor/HalamanDiare';

export default function VektorDiareLalatPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  return <HalamanDiare jenis="lalat" searchParams={searchParams} />;
}