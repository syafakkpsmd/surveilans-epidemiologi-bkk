'use client';

import { useState } from 'react';

type WilayahIspa = {
  id: string;
  label: string;
  kode_wilker: string;
  zona: string | null;
  dari_poliklinik?: boolean | null;
};

export function BarisWilayahIspa({
  wilayah,
  perbaruiWilayahIspa,
  hapusWilayahIspa,
}: {
  wilayah: WilayahIspa;
  perbaruiWilayahIspa: (id: string, formData: FormData) => Promise<void>;
  hapusWilayahIspa: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await perbaruiWilayahIspa(wilayah.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-control border border-teal px-3 py-2"
      >
        <input name="label" defaultValue={wilayah.label} required
          className="rounded-control border border-border px-2 py-1 text-sm" />
        <input name="kode_wilker" defaultValue={wilayah.kode_wilker} required
          className="rounded-control border border-border px-2 py-1 text-sm" />
        <input name="zona" defaultValue={wilayah.zona ?? ''} placeholder="Zona (opsional)"
          className="rounded-control border border-border px-2 py-1 text-sm" />
        <label className="sm:col-span-3 flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" name="dari_poliklinik" defaultChecked={!!wilayah.dari_poliklinik} />
          Kasus ISPA dihitung otomatis dari Kunjungan Poliklinik (wajib mengisi zona)
        </label>
        <div className="sm:col-span-3 flex justify-end gap-3">
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
    <div className="flex items-center justify-between rounded-control border border-border px-3 py-2">
      <span className="text-sm text-ink">
        {wilayah.label}{' '}
        <span className="text-xs text-muted">
          ({wilayah.kode_wilker}{wilayah.zona ? `::${wilayah.zona}` : ''})
        </span>
        {wilayah.dari_poliklinik && (
          <span className="ml-2 rounded bg-teal/10 px-2 py-0.5 text-xs text-teal">data dari poliklinik</span>
        )}
      </span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs font-medium text-teal hover:underline">
          Edit
        </button>
        <form action={hapusWilayahIspa.bind(null, wilayah.id)}>
          <button type="submit" className="text-xs font-medium text-risiko-merah hover:underline">
            Hapus
          </button>
        </form>
      </div>
    </div>
  );
}