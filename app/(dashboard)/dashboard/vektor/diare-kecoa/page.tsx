// ================================================================
// SEGMEN 11 — app/(dashboard)/dashboard/vektor/diare-kecoa/page.tsx
// ================================================================

import HalamanDiare from '@/components/vektor/HalamanDiare';

export default function VektorDiareKecoaPage({
  searchParams,
}: {
  searchParams: Promise<{ wilker?: string; tahun?: string }>;
}) {
  return <HalamanDiare jenis="kecoa" searchParams={searchParams} />;
}