// components/klinik/KartuRekap.tsx
'use client';

type RingkasanKartu = {
  total_layanan: number; laki_laki: number; perempuan: number;
  meningitis: number; flu: number; polio: number; yellow_fever: number;
};

export function KartuRekap({ data }: { data: RingkasanKartu }) {
  const kartu = [
    { label: 'Total Layanan', nilai: data.total_layanan },
    { label: 'Laki-laki', nilai: data.laki_laki },
    { label: 'Perempuan', nilai: data.perempuan },
    { label: 'Meningitis', nilai: data.meningitis },
    { label: 'Flu', nilai: data.flu },
    { label: 'Polio', nilai: data.polio },
    { label: 'Yellow Fever', nilai: data.yellow_fever },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {kartu.map((k) => (
        <div key={k.label} className="rounded-xl bg-white p-4 shadow-xs border border-gray-100">
          <p className="text-xs font-medium text-gray-500">{k.label}</p>
          <p className="text-2xl font-bold text-[#0F2A38] mt-1">{k.nilai.toLocaleString('id-ID')}</p>
        </div>
      ))}
    </div>
  );
}