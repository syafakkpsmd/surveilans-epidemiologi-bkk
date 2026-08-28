'use client';

import { useState } from 'react';

type LokasiUdara = {
  id: string;
  lokasi_induk: string;
  sub_lokasi: string | null;
};

export function BarisLokasiUdara({
  lokasi,
  perbaruiLokasiUdara,
  hapusLokasiUdara,
}: {
  lokasi: LokasiUdara;
  perbaruiLokasiUdara: (id: string, formData: FormData) => Promise<void>;
  hapusLokasiUdara: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await perbaruiLokasiUdara(lokasi.id, formData);
          setEditing(false);
        }}
        className="ml-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-control border border-teal px-3 py-2"
      >
        <input name="lokasi_induk" defaultValue={lokasi.lokasi_induk} required
          className="rounded-control border border-border px-2 py-1 text-sm" />
        <input name="sub_lokasi" defaultValue={lokasi.sub_lokasi ?? ''} placeholder="Sub-lokasi (opsional)"
          className="rounded-control border border-border px-2 py-1 text-sm" />
        <div className="sm:col-span-2 flex justify-end gap-3">
          <button type="button" onClick={() => setEditing(false)}
            className="text-xs font-medium text-muted hover:underline">
            Batal
          </button>
          <button type="submit" className="text-xs font-medium text-teal hover:underline">
            Simpan
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-control border border-border px-3 py-2 ml-3">
      <span className="text-sm text-ink">{lokasi.sub_lokasi ?? '(tanpa sub-lokasi)'}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs font-medium text-teal hover:underline">
          Edit
        </button>
        <form action={hapusLokasiUdara.bind(null, lokasi.id)}>
          <button type="submit" className="text-xs font-medium text-risiko-merah hover:underline">
            Hapus
          </button>
        </form>
      </div>
    </div>
  );
}