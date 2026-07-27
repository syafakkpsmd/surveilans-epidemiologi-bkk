"use client";
import dynamic from "next/dynamic";

// Bungkus GlobalEmergingNegaraMap (yang pakai react-leaflet) sebagai
// Client Component dengan ssr:false, supaya library-nya tidak
// pernah dievaluasi di server (leaflet butuh `window`).
const GlobalEmergingNegaraMap = dynamic(
  () => import("./GlobalEmergingNegaraMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-[10px] bg-white text-sm text-gray-500 shadow-sm">
        Memuat peta...
      </div>
    ),
  }
);
export default GlobalEmergingNegaraMap;