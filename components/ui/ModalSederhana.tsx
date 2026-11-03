// components/ui/ModalSederhana.tsx
'use client';

export default function ModalSederhana({
  judul, onTutup, children,
}: { judul: string; onTutup: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onTutup}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">{judul}</h3>
          <button
            onClick={onTutup}
            className="rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Tutup ✕
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}