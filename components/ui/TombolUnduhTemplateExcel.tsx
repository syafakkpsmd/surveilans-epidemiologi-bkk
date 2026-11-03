'use client';

import * as XLSX from 'xlsx';

interface Props {
  namaFile: string;
  namaSheet: string;
  headerKolom: string[];
  contohBaris?: (string | number)[];
  label?: string;
}

export default function TombolUnduhTemplateExcel({
  namaFile,
  namaSheet,
  headerKolom,
  contohBaris,
  label = 'Unduh Template Excel',
}: Props) {
  function unduhTemplate() {
    const data = contohBaris ? [headerKolom, contohBaris] : [headerKolom];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Lebar kolom otomatis mengikuti panjang header
    worksheet['!cols'] = headerKolom.map((h) => ({ wch: Math.max(h.length + 4, 12) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet);
    XLSX.writeFile(workbook, namaFile);
  }

  return (
    <button
      onClick={unduhTemplate}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      📥 {label}
    </button>
  );
}