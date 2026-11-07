"use client";
import type { WilkerPeta } from '@/lib/wilayah-kerja/peta';

export default function WilkerSelector({
  opsi,
  selected,
  onSelect,
}: {
  opsi: WilkerPeta[];
  selected: string | null;
  onSelect: (kode: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
          !selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Semua Wilker
      </button>
      {opsi.map((w) => (
        <button
          key={w.kode}
          onClick={() => onSelect(w.kode)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
            selected === w.kode ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {w.jenis === "Kantor" ? `🏢 ${w.nama}` : w.nama}
        </button>
      ))}
    </div>
  );
}