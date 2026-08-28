// components/ui/ModalSederhana.tsx
'use client';

export default function ModalSederhana({
  judul, onTutup, children,
}: { judul: string; onTutup: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-white">{judul}</h3>
          <button onClick={onTutup} className="text-white/80 hover:text-white text-sm">
            Tutup ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}