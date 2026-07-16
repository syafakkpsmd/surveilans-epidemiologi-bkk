"use client";

import dynamic from "next/dynamic";

const PetaWilker = dynamic(() => import("@/components/peta/PetaWilker"), {
  ssr: false,
  loading: () => (
    <div className="h-[75vh] w-full rounded-xl border flex items-center justify-center text-gray-400">
      Memuat peta...
    </div>
  ),
});

export default function PetaWilkerClient({ isAdmin }: { isAdmin: boolean }) {
  return <PetaWilker isAdmin={isAdmin} />;
}