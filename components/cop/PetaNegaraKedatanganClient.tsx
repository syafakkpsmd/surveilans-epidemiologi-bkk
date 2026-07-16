"use client";

import dynamic from "next/dynamic";

// Bungkus PetaNegaraKedatangan (yang pakai react-leaflet) sebagai
// Client Component dengan ssr:false, supaya library-nya tidak
// pernah dievaluasi di server (leaflet butuh `window`).
const PetaNegaraKedatangan = dynamic(
  () => import("./PetaNegaraKedatangan").then((mod) => mod.PetaNegaraKedatangan),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted">
        Memuat peta...
      </div>
    ),
  }
);

export default PetaNegaraKedatangan;