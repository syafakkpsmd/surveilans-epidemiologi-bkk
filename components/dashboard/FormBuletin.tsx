'use client';
import { tambahBuletin, editBuletin } from "@/app/actions/buletin";

type DataAwal = {
  id: string;
  tahun: number;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
};

export function FormBuletin({
  dataAwal,
  onSukses,
}: {
  dataAwal?: DataAwal;
  onSukses?: () => void;
}) {
  const isEdit = !!dataAwal;
  const action = isEdit
    ? editBuletin.bind(null, dataAwal.id)
    : tambahBuletin;

  async function handleSubmit(formData: FormData) {
    await action(formData);
    onSukses?.();
  }

  return (
    <form action={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border">
      <h3 className="font-bold">{isEdit ? "Edit Buletin" : "Input Buletin Baru"}</h3>
      <input
        name="tahun"
        type="number"
        placeholder="Tahun"
        defaultValue={dataAwal?.tahun}
        className="w-full border p-2 rounded"
        required
      />
      <input
        name="nama_kegiatan"
        placeholder="Nama Kegiatan"
        defaultValue={dataAwal?.nama_kegiatan}
        className="w-full border p-2 rounded"
        required
      />
      <select
        name="tipe_link"
        defaultValue={dataAwal?.tipe_link ?? "canva"}
        className="w-full border p-2 rounded"
      >
        <option value="canva">Canva</option>
        <option value="looker">Looker Studio</option>
        <option value="lainnya">Lainnya</option>
      </select>
      <input
        name="link_url"
        placeholder="Link Embed"
        defaultValue={dataAwal?.link_url}
        className="w-full border p-2 rounded"
        required
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        {isEdit ? "Simpan Perubahan" : "Simpan Data"}
      </button>
    </form>
  );
}