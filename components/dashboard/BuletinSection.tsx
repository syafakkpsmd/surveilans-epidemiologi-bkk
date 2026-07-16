"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FormBuletin } from "@/components/dashboard/FormBuletin";
import { BuletinViewer } from "@/components/dashboard/BuletinViewer";

type BuletinItem = {
  id: string;
  tahun: number;
  nama_kegiatan: string;
  tipe_link: string;
  link_url: string;
  minggu_ke?: number;
};

function ambilNomorUrut(item: BuletinItem, fallback: number) {
  if (typeof item.minggu_ke === "number") return item.minggu_ke;
  const match = item.nama_kegiatan.match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export function BuletinSection({
  data,
  isPetugasAtauAdmin,
}: {
  data: BuletinItem[];
  isPetugasAtauAdmin: boolean;
}) {
  const daftarTerurut = useMemo(
    () =>
      [...data]
        .map((item, i) => ({ ...item, _nomor: ambilNomorUrut(item, i + 1) }))
        .sort((a, b) => a._nomor - b._nomor),
    [data]
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(
    daftarTerurut[daftarTerurut.length - 1]?.id
  );
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [itemDiedit, setItemDiedit] = useState<BuletinItem | null>(null);
  const [tampilkanGateLogin, setTampilkanGateLogin] = useState(false);

  const selectedItem =
    daftarTerurut.find((item) => item.id === selectedId) ??
    daftarTerurut[daftarTerurut.length - 1];

  function handleKlikInputBuletin() {
    if (!isPetugasAtauAdmin) {
      setTampilkanGateLogin(true);
      return;
    }
    setTampilkanGateLogin(false);
    setItemDiedit(null); // pastikan bukan mode edit
    setFormTerbuka((v) => !v);
  }

  function handleKlikEdit(item: BuletinItem) {
    setItemDiedit(item);
    setFormTerbuka(true);
    // scroll ke atas biar form kelihatan
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function tutupForm() {
    setFormTerbuka(false);
    setItemDiedit(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={handleKlikInputBuletin}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          {formTerbuka ? "Tutup Form" : "Input Buletin"}
        </button>

        {formTerbuka && isPetugasAtauAdmin && (
          <div className="mt-4">
            <FormBuletin
              dataAwal={itemDiedit ?? undefined}
              onSukses={tutupForm}
            />
          </div>
        )}

        {tampilkanGateLogin && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Untuk mengakses ini, Anda harus masuk sebagai petugas/admin.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Login
              </Link>
              <button
                onClick={() => setTampilkanGateLogin(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItem ? (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold mb-4 text-center">
            {selectedItem.nama_kegiatan}
          </h2>
          {selectedItem.tipe_link === "canva" ? (
            <BuletinViewer url={selectedItem.link_url} title={selectedItem.nama_kegiatan} />
          ) : (
            <a
              href={selectedItem.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Buka Link
            </a>
          )}
        </section>
      ) : (
        <p className="text-slate-500 text-sm">Belum ada buletin yang ditambahkan.</p>
      )}

      {daftarTerurut.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          <div className="px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Daftar Buletin</h3>
          </div>
          {daftarTerurut.map((item) => {
            const aktif = item.id === selectedItem?.id;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-5 py-3 transition ${
                  aktif ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => setSelectedId(item.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      aktif ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item._nomor}
                  </span>
                  <span className={`text-sm ${aktif ? "font-medium text-blue-700" : "text-slate-700"}`}>
                    {item.nama_kegiatan}
                  </span>
                </button>

                {isPetugasAtauAdmin && (
                  <button
                    onClick={() => handleKlikEdit(item)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                  >
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}