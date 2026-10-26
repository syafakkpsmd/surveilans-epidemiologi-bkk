"use client";
import { OPSI_WILKER_PETA } from '@/lib/wilayah-kerja';

const WILKER_LIST = [
  { kode: "INDUK", nama: "🏢 Kantor Induk BKK Kelas I Samarinda" },
  ...OPSI_WILKER_PETA,
];

export default function WilkerSelector({
  selected,
  onSelect,
}: {
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
      {WILKER_LIST.map((w) => (
        <button
          key={w.kode}
          onClick={() => onSelect(w.kode)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
            selected === w.kode ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {w.nama}
        </button>
      ))}
    </div>
  );
}