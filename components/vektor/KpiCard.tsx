type KpiCardProps = {
  label: string;
  value: string | number;
  keterangan?: string;
  warna?: 'default' | 'bahaya' | 'aman';
};

export default function KpiCard({ label, value, keterangan, warna = 'default' }: KpiCardProps) {
  const warnaTeks =
    warna === 'bahaya' ? 'text-[#B71C1C]' : warna === 'aman' ? 'text-[#1B5E20]' : 'text-[#0F2A38]';

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warnaTeks}`}>{value}</p>
      {keterangan && <p className="mt-1 text-xs text-gray-400">{keterangan}</p>}
    </div>
  );
}