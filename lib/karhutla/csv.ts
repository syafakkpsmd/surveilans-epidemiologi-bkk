export interface KolomCsv {
  key: string;
  label: string;
}

/**
 * Generate CSV dari array objek lalu trigger download di browser.
 * Client-side murni (pakai Blob + object URL), tidak perlu request ke server.
 */
export function unduhCsv(namaFile: string, kolom: KolomCsv[], data: Record<string, unknown>[]) {
  const header = kolom.map((k) => `"${k.label}"`).join(',');

  const baris = data.map((row) =>
    kolom
      .map((k) => {
        const v = row[k.key];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(',')
  );

  const csv = [header, ...baris].join('\r\n');

  // \uFEFF (BOM) supaya Excel otomatis kenali encoding UTF-8 (penting untuk karakter non-ASCII)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile.endsWith('.csv') ? namaFile : `${namaFile}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}