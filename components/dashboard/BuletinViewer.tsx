'use client';

export function BuletinViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="w-full h-[600px] bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <iframe
        src={url}
        title={title}
        width="100%"
        height="100%"
        allowFullScreen
        className="border-none"
      />
    </div>
  );
}