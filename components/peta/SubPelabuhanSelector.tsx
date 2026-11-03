"use client";

import { Fasilitas } from "@/lib/data/fasilitas";

export default function SubPelabuhanSelector({
  fasilitas,
  activeId,
  onSelect,
}: {
  fasilitas: Fasilitas[];
  activeId: string | null;
  onSelect: (f: Fasilitas) => void;
}) {
  if (fasilitas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {fasilitas.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border ${
            activeId === f.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {f.nama} <span className="opacity-60">({f.tipe})</span>
        </button>
      ))}
    </div>
  );
}