import { labelRentang } from "./periode";
import type { BahanLaporan, DataModul, HasilModul, OpsiPresentasi, Slide, SlideBlok, Tabel } from "./types";

export const INSTANSI = "Balai Kekarantinaan Kesehatan Kelas I Samarinda";
const BARIS_PER_SLIDE = 12;
const MAKS_TEMUAN = 4;
const TINGGI_AREA = 500;
const MIN_VISUAL = 250;

function pecah<T>(arr: T[], maks: number): T[][] {
  const n = Math.max(1, Math.ceil(arr.length / maks));
  const ukuran = Math.ceil(arr.length / n);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += ukuran) out.push(arr.slice(i, i + ukuran));
  return out;
}

export function potong(s: string, maks: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > maks ? `${t.slice(0, maks - 1).trimEnd()}...` : t;
}

function tinggiTabel(t: Tabel, padat: boolean): number {
  const judul = t.judul ? 28 : 0;
  const panjang = t.baris.some((r) => r.some((c) => c.length > 60));
  if (padat) return judul + 34 + t.baris.length * (panjang ? 46 : 30) + 14;
  const tBaris = t.baris.length > 8 ? 35 : panjang ? 60 : 44;
  return judul + 40 + t.baris.length * tBaris + 19;
}

const bTabel = (t: Tabel): SlideBlok => ({ tipe: "tabel", ...t });

function pasanganVisual(d: DataModul): SlideBlok[] {
  const donat = d.donat ?? [];
  const batang = d.batangMendatar ?? [];

  const n = Math.max(donat.length, batang.length);
  const out: SlideBlok[] = [];
  for (let i = 0; i < n; i++) {
    const kiri = donat[i];
    const kanan = batang[i];
    if (kiri && kanan) {
      out.push({ tipe: "dua_kolom", kiri: { tipe: "donat", ...kiri }, kanan: { tipe: "batang_mendatar", ...kanan }, rasioKiri: 0.4 });
    } else if (kiri) {
      out.push({ tipe: "donat", ...kiri });
    } else if (kanan) {
      out.push({ tipe: "batang_mendatar", ...kanan });
    }
  }
  return out;
}

function slideModulOk(d: DataModul, subjudul: string): Slide[] {
  const slides: Slide[] = [];
  const temuan = (d.temuan ?? []).slice(0, MAKS_TEMUAN).map((t) => potong(t, 150));
  const tabelKecil = !d.tren && d.tabel && d.tabel.baris.length <= 6 ? d.tabel : undefined;
  const donatSampingGrafik = d.kunci === "poliklinik" && d.donat && d.donat.length === 2 ? d.donat[0] : undefined;

  /* ---- Slide 1: angka utama, grafik, temuan ---- */
  const blok: SlideBlok[] = [];
  if (d.kartu.length > 0) blok.push({ tipe: "statistik", items: d.kartu.slice(0, 4) });

  if (d.tren) {
    const grafik: SlideBlok = { tipe: "grafik", ...d.tren };
        if (donatSampingGrafik) {
      blok.push({ tipe: "dua_kolom", kiri: grafik, kanan: { tipe: "donat", ...donatSampingGrafik }, rasioKiri: 0.62 });
    } else {
      blok.push(temuan.length > 0 ? { tipe: "dua_kolom", kiri: grafik, kanan: { tipe: "poin", items: temuan }, rasioKiri: 0.62 } : grafik);
    }
  } else {
    if (tabelKecil) blok.push(bTabel(tabelKecil));
    if (temuan.length > 0) blok.push({ tipe: "poin", items: temuan });
  }
  if (blok.length === 0) blok.push({ tipe: "teks", teks: "Tidak ada ringkasan yang dapat ditampilkan." });
  slides.push({ kunci: `modul-${d.kunci}`, tipe: "isi", judul: d.judul, subjudul, blok });

  /* ---- Slide rincian: tabel utama + elemen visual ---- */
  const tambahan = d.tabelTambahan ?? [];
  const visual = pasanganVisual(d);
  let tambahanSisa = tambahan;
  let visualTerpakai = 0;
  const tabel = d.tabel;

  if (tabel && !tabelKecil) {
    // Larva: 12 bulan + 1 baris total = 13 baris, harus tetap satu slide
    const perSlide = d.kunci === "anopheles-larva" ? 13 : BARIS_PER_SLIDE;
    const halaman = pecah(tabel.baris, perSlide);
    halaman.forEach((baris, i) => {
      const terakhir = i === halaman.length - 1;
      const utama: Tabel = { ...tabel, baris };
      let isiSlide: SlideBlok[] = [bTabel(utama)];

      if (terakhir) {
        const utamaPadat: Tabel = { ...utama, padat: true };

        // LAYOUT KHUSUS LALU LINTAS ORANG (Tabel Padat + 2 Donat di Bawah Berdampingan)
        if (d.kunci === "lalu-lintas" && d.donat && d.donat.length === 2) {
          isiSlide = [
            bTabel(utamaPadat),
            {
              tipe: "dua_kolom",
              kiri: { tipe: "donat", ...d.donat[0] },  // Donat 1: Kedatangan
              kanan: { tipe: "donat", ...d.donat[1] }, // Donat 2: Keberangkatan
              rasioKiri: 0.5,
            },
          ];
          visualTerpakai = 2; // Menandai kedua donat sudah terpakai
        }
        // LAYOUT KHUSUS COP (2 Donat + 1 Batang Mendatar)
        else if (d.kunci === "cop" && d.donat && d.donat.length === 2 && d.batangMendatar && d.batangMendatar.length === 1) {
          isiSlide = [
            {
              tipe: "dua_kolom",
              kiri: bTabel(utamaPadat),
              kanan: { tipe: "donat", ...d.donat[0] }, // Donat RBA
              rasioKiri: 0.58,
            },
            {
              tipe: "dua_kolom",
              kiri: { tipe: "donat", ...d.donat[1] }, // Status Daerah Asal
              kanan: { tipe: "batang_mendatar", ...d.batangMendatar[0] }, // Negara Kedatangan
              rasioKiri: 0.45,
            },
          ];
          visualTerpakai = 2;
        } 
        // LAYOUT KHUSUS PHQC (2 Donat + 1 Batang Mendatar)
        else if (d.kunci === "phqc" && d.donat && d.donat.length === 2 && d.batangMendatar && d.batangMendatar.length === 1) {
          isiSlide = [
            {
              tipe: "dua_kolom",
              kiri: bTabel(utamaPadat),
              kanan: { tipe: "donat", ...d.donat[0] }, // Donat 1: Tujuan Berlayar
              rasioKiri: 0.58,
            },
            {
              tipe: "dua_kolom",
              kiri: { tipe: "donat", ...d.donat[1] }, // Donat 2: Risk-Based Assessment (RBA)
              kanan: { tipe: "batang_mendatar", ...d.batangMendatar[0] }, // Batang: Pelabuhan Tujuan
              rasioKiri: 0.45,
            },
          ];
          visualTerpakai = 2;
        } 
                // LAYOUT KHUSUS LARVA ANOPHELES (Tabel kiri, 2 Donat bertumpuk di kanan)
        else if (d.kunci === "anopheles-larva" && d.donat && d.donat.length === 2) {
          isiSlide = [
            {
              tipe: "dua_kolom",
              kiri: bTabel(utamaPadat),
              kanan: {
                tipe: "tumpuk",
                items: [
                  { tipe: "donat", ...d.donat[0] },
                  { tipe: "donat", ...d.donat[1] },
                ],
              },
              rasioKiri: 0.55,
            },
          ];
          visualTerpakai = 2;
        }
                // LAYOUT KHUSUS POLIKLINIK (Tabel kiri; Donat Usia + Batang Kategori Pasien bertumpuk di kanan)
        else if (d.kunci === "poliklinik" && d.donat && d.donat.length === 2 && d.batangMendatar && d.batangMendatar.length === 1) {
          isiSlide = [
            {
              tipe: "dua_kolom",
              kiri: bTabel(utamaPadat),
              kanan: {
                tipe: "tumpuk",
                items: [
                  { tipe: "donat", ...d.donat[1] },
                  { tipe: "batang_mendatar", ...d.batangMendatar[0] },
                ],
              },
              rasioKiri: 0.5,
            },
          ];
          visualTerpakai = 2;
        }
        else {
          // Logika Bawaan Modul Lain
          const tinggiUtama = tinggiTabel(utamaPadat, true);
          if (visual.length > 0 && TINGGI_AREA - tinggiUtama >= MIN_VISUAL) {
            const ikut: Tabel[] = [];
            let ruang = TINGGI_AREA - tinggiUtama - MIN_VISUAL;
            for (const t of tambahan) {
              const tp: Tabel = { ...t, padat: true };
              const h = tinggiTabel(tp, true);
              if (h > ruang) break;
              ikut.push(tp);
              ruang -= h;
            }
            isiSlide = [bTabel(utamaPadat), ...ikut.map(bTabel), visual[0]];
            visualTerpakai = 1;
            tambahanSisa = tambahan.slice(ikut.length);
          } else if (tambahan.length > 0) {
            const padat: Tabel[] = [utamaPadat, ...tambahan.map((t) => ({ ...t, padat: true }))];
            const total = padat.reduce((a, t) => a + tinggiTabel(t, true), 0);
            if (total <= TINGGI_AREA) {
              isiSlide = padat.map(bTabel);
              tambahanSisa = [];
            }
          }
        }
      }

      slides.push({
        kunci: `modul-${d.kunci}-rincian-${i}`,
        tipe: "isi",
        judul: `${d.judul}${halaman.length > 1 ? ` (${i + 1} dari ${halaman.length})` : ""}`,
        subjudul,
        blok: isiSlide,
      });
    });
  }

  /* Tabel tambahan yang tidak muat bersama tabel utama */
  tambahanSisa.forEach((t, ti) => {
    const halaman = pecah(t.baris, BARIS_PER_SLIDE);
    halaman.forEach((baris, i) => {
      slides.push({
        kunci: `modul-${d.kunci}-tambahan-${ti}-${i}`,
        tipe: "isi",
        judul: `${d.judul}: ${t.judul ?? "rincian tambahan"}${halaman.length > 1 ? ` (${i + 1} dari${halaman.length})` : ""}`,
        subjudul,
        blok: [bTabel({ ...t, judul: undefined, padat: undefined, baris })],
      });
    });
  });

  /* Visual yang belum tertampung */
  const visualSisa = visual.slice(visualTerpakai);
  visualSisa.forEach((b, i) => {
    slides.push({
      kunci: `modul-${d.kunci}-visual-${i}`,
      tipe: "isi",
      judul: `${d.judul}: ringkasan visual${visualSisa.length > 1 ? ` (${i + 1} dari${visualSisa.length})` : ""}`,
      subjudul,
      blok: [b],
    });
  });

  return slides;
}

function slideModul(h: HasilModul, subjudul: string, rentang: string): Slide[] {
  if (h.status === "ok") return slideModulOk(h.data, subjudul);
  if (h.status === "kosong") {
    return [
      {
        kunci: `modul-${h.kunci}`,
        tipe: "isi",
        judul: h.judul,
        subjudul,
        blok: [{ tipe: "teks", teks: `Belum ada data ${h.judul} untuk periode ${rentang}.`, nada: "muted" }],
      },
    ];
  }
  return [
    {
      kunci: `modul-${h.kunci}`,
      tipe: "isi",
      judul: h.judul,
      subjudul,
      blok: [{ tipe: "teks", teks: "Data modul ini tidak dapat dimuat saat laporan dibuat. Periksa koneksi sumber data lalu buat ulang laporan.", nada: "warn" }],
    },
  ];
}

export function buildSlides(
  bahan: BahanLaporan,
  opsi: OpsiPresentasi,
  sisipan: Slide[] = [],
  judulRapat = "Rapat Bulanan Tim Kerja Surveilans dan Penindakan Pelanggaran Kekarantinaan Kesehatan"
): Slide[] {
  const rentang = labelRentang(bahan.tahun, bahan.bulanAkhir);
  const slides: Slide[] = [];

  slides.push({
    kunci: "sampul",
    tipe: "sampul",
    judul: judulRapat,
    subjudul: `Data ${rentang}`,
    blok: [{ tipe: "teks", teks: INSTANSI }],
  });

  slides.push(...sisipan);

  for (const h of bahan.hasil) {
    if (opsi.modulDikecualikan.includes(h.kunci)) continue;
    const kelompok = h.kelompok;
    slides.push(...slideModul(h, `${kelompok} | ${rentang}`, rentang));
  }

  const catatan = opsi.catatan
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (catatan.length > 0) {
    slides.push({
      kunci: "catatan",
      tipe: "isi",
      judul: "Isu untuk diputuskan",
      blok: [{ tipe: "poin", items: catatan.slice(0, 8) }],
    });
  }

  if (opsi.penutup) {
    slides.push({
      kunci: "penutup",
      tipe: "sampul",
      judul: "Diskusi dan arahan pimpinan",
      subjudul: `Data ${rentang}`,
      blok: [{ tipe: "teks", teks: "Terima kasih" }],
    });
  }
  return slides;
}