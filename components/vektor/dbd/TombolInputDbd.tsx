'use client';
// components/vektor/dbd/TombolInputDbd.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/vektor/diare/Dialog';
import { gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';
import FormSurveiDbd from './FormSurveiDbd';
import FormPengendalianDbd from './FormPengendalianDbd';
import UnggahDbd from './UnggahDbd';

type Dialogan = null | 'survei' | 'pengendalian' | 'unggah';

export default function TombolInputDbd({ wilayahAwal }: { wilayahAwal: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialogan>(null);
  const [info, setInfo] = useState<string | null>(null);

  const tutup = () => setDialog(null);
  const buka = (d: Dialogan) => {
    setInfo(null);
    setDialog(d);
  };

  function selesai(pesan: string) {
    setDialog(null);
    setInfo(pesan);
    router.refresh();
  }

  return (
    <section aria-label="Input data DBD" className="flex flex-wrap items-center justify-end gap-3 w-full">
      <span className="text-sm font-medium text-slate-700">Input data</span>
      <button onClick={() => buka('survei')} className={gayaTombol}>Tambah Survei</button>
      <button onClick={() => buka('pengendalian')} className={gayaTombol}>Tambah Pengendalian</button>
      <button onClick={() => buka('unggah')} className={gayaTombolPutih}>Unggah Excel</button>
      
      {/* ml-auto dihapus agar tidak saling bentrok dengan justify-end */}
      <Link
        href="/dashboard/data/vektor/dbd"
        className="rounded text-sm text-teal-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ml-2"
      >
        Kelola data (edit dan hapus)
      </Link>
      
      {info && <p role="status" className="basis-full text-sm text-emerald-800 text-right">{info}</p>}

      <Dialog buka={dialog === 'survei'} judul="Tambah survei DBD" onTutup={tutup}>
        {dialog === 'survei' && (
          <FormSurveiDbd baris={null} wilayahAwal={wilayahAwal} onSelesai={selesai} onBatal={tutup} />
        )}
      </Dialog>

      <Dialog buka={dialog === 'pengendalian'} judul="Pengendalian DBD" onTutup={tutup}>
        {dialog === 'pengendalian' && (
          <FormPengendalianDbd baris={null} wilayahAwal={wilayahAwal} onSelesai={selesai} onBatal={tutup} />
        )}
      </Dialog>

      <Dialog buka={dialog === 'unggah'} judul="Unggah Excel survei DBD" onTutup={tutup}>
        {dialog === 'unggah' && <UnggahDbd onData={() => router.refresh()} onTutup={tutup} />}
      </Dialog>
    </section>
  );
}