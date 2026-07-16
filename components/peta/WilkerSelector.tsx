"use client";

const WILKER_LIST = [
  { kode: "WK01", nama: "Samarinda" },
  { kode: "WK02", nama: "Tanjung Santan" },
  { kode: "WK03", nama: "Tanjung Laut" },
  { kode: "WK04", nama: "Lhok Tuan" },
  { kode: "WK05", nama: "Sangatta" },
  { kode: "WK06", nama: "Sangkulirang" },
  { kode: "WK07", nama: "Bandara APT Pranoto" },
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