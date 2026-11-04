"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { searchIcd, type IcdHit } from "@/app/actions/icd";

export interface IcdValue {
  kode: string;
  nama: string;
}

interface IcdSearchProps {
  label: string;
  value: IcdValue | null;
  onChange: (value: IcdValue | null) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const DEBOUNCE_MS = 250;

/** Komponen tunggal pencarian ICD-10: diagnosa wajib dipilih dari daftar (tanpa teks bebas). */
export default function IcdSearch({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Ketik kode atau nama penyakit…",
}: IcdSearchProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<IcdHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

  // Debounce pencarian; abaikan respons usang.
  useEffect(() => {
    if (value) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      const res = await searchIcd(q);
      if (seq !== requestSeq.current) return;
      setLoading(false);
      if (res.ok) {
        setHits(res.data);
        setError(null);
        setActive(res.data.length ? 0 : -1);
      } else {
        setHits([]);
        setError(res.error);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, value]);

  // Tutup dropdown saat klik di luar komponen.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const select = useCallback(
    (hit: IcdHit) => {
      onChange({ kode: hit.kode, nama: hit.nama });
      setQuery("");
      setHits([]);
      setOpen(false);
    },
    [onChange],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      const hit = hits[active];
      if (hit) {
        e.preventDefault();
        select(hit);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-mono font-semibold text-emerald-800">{value.kode}</span>
            <span className="mx-1.5 text-emerald-400">•</span>
            <span className="text-slate-800">{value.nama}</span>
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-emerald-100"
              aria-label={`Hapus diagnosa ${label}`}
            >
              Ganti
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-required={required}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {open && query.trim().length >= 2 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {loading && <li className="px-3 py-2 text-sm text-slate-500">Mencari…</li>}
              {!loading && error && <li className="px-3 py-2 text-sm text-red-600">{error}</li>}
              {!loading && !error && hits.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500">
                  Tidak ada diagnosa yang cocok. Pilih dari daftar ICD-10; teks bebas tidak diizinkan.
                </li>
              )}
              {!loading &&
                hits.map((hit, i) => (
                  <li
                    key={hit.kode}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(hit);
                    }}
                    className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-emerald-50" : ""}`}
                  >
                    <span className="font-mono font-semibold text-emerald-800">{hit.kode}</span>
                    <span className="ml-2 text-slate-800">{hit.nama}</span>
                    {hit.kategori && <span className="ml-2 text-xs text-slate-400">{hit.kategori}</span>}
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
      {/* Input tersembunyi agar validasi form native mengenali kolom wajib. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value?.kode ?? ""}
          onChange={() => undefined}
          className="pointer-events-none absolute left-0 top-full h-0 w-0 opacity-0"
        />
      )}
    </div>
  );
}