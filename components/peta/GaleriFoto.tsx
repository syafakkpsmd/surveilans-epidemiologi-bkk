"use client";

import { useEffect, useState } from "react";
import { getFotoByFasilitas, FasilitasFoto } from "@/lib/data/fasilitas";

export default function GaleriFoto({ fasilitasId }: { fasilitasId: string }) {
  const [foto, setFoto] = useState<FasilitasFoto[]>([]);

  useEffect(() => {
    getFotoByFasilitas(fasilitasId).then(setFoto);
  }, [fasilitasId]);

  if (foto.length === 0) {
    return <p className="text-xs text-gray-400">Belum ada foto.</p>;
  }

  const kantor = foto.filter((f) => f.kategori === "kantor");
  const pelabuhan = foto.filter((f) => f.kategori === "pelabuhan");
  const kegiatan = foto.filter((f) => f.kategori === "kegiatan");

  return (
    <div className="space-y-3">
      {kantor.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Foto Kantor</p>
          <div className="flex gap-2 overflow-x-auto">
            {kantor.map((f) => (
              <img key={f.id} src={f.url} alt={f.caption ?? ""} className="h-20 w-28 object-cover rounded-md shrink-0" />
            ))}
          </div>
        </div>
      )}
      {pelabuhan.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Foto Pelabuhan</p>
          <div className="flex gap-2 overflow-x-auto">
            {pelabuhan.map((f) => (
              <img key={f.id} src={f.url} alt={f.caption ?? ""} className="h-20 w-28 object-cover rounded-md shrink-0" />
            ))}
          </div>
        </div>
      )}
      {kegiatan.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Foto Kegiatan</p>
          <div className="flex gap-2 overflow-x-auto">
            {kegiatan.map((f) => (
              <img key={f.id} src={f.url} alt={f.caption ?? ""} className="h-20 w-28 object-cover rounded-md shrink-0" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}