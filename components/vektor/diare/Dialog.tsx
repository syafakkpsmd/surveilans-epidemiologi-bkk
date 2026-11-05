'use client';
// components/vektor/diare/Dialog.tsx
import { useEffect, useRef } from 'react';

export default function Dialog({
  buka, judul, onTutup, children,
}: { buka: boolean; judul: string; onTutup: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);

  return (
    <dialog
      ref={ref}
      onClose={onTutup}
      aria-labelledby="judul-dialog"
      className="w-full max-w-lg rounded-lg p-0 shadow-xl backdrop:bg-black/40"
    >
      {buka && (
        <div className="space-y-4 p-5">
          <h2 id="judul-dialog" className="text-lg font-semibold text-slate-900">{judul}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}