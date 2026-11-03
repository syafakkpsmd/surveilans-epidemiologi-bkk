"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export default function DropdownMultiSelect({
  label,
  opsi,
  terpilih,
  onToggle,
  onPilihSemua,
  onKosongkan,
  warnaAktif = "bg-purple-600 text-white border-purple-600",
}: {
  label: string;
  opsi: string[];
  terpilih: string[];
  onToggle: (item: string) => void;
  onPilihSemua?: () => void;
  onKosongkan?: () => void;
  warnaAktif?: string;
}) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickLuar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false);
    }
    document.addEventListener("mousedown", handleClickLuar);
    return () => document.removeEventListener("mousedown", handleClickLuar);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {label}
        {terpilih.length > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${warnaAktif}`}>
            {terpilih.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${buka ? "rotate-180" : ""}`} />
      </button>

      {buka && (
        <div className="absolute z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
            <button
              onClick={onPilihSemua}
              className="text-[11px] font-medium text-purple-600 hover:underline"
            >
              Pilih semua
            </button>
            <button
              onClick={onKosongkan}
              className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600"
            >
              <X size={11} /> Kosongkan
            </button>
          </div>
          {opsi.map((item) => {
            const aktif = terpilih.includes(item);
            return (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-50"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    aktif ? "border-purple-600 bg-purple-600" : "border-gray-300"
                  }`}
                >
                  {aktif && <Check size={11} className="text-white" />}
                </span>
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={() => onToggle(item)}
                  className="hidden"
                />
                <span className="truncate text-gray-700">{item}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}