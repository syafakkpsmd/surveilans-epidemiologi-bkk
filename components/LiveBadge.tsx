export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risiko-hijau opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-risiko-hijau" />
      </span>
      LIVE
    </span>
  );
}
