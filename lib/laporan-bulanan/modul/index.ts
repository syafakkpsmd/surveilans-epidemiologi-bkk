import "server-only";
import type { ModulLaporan } from "../types";
import { modulAedes } from "./aedes";
import { modulAnopheles } from "./anopheles";
import { modulCop } from "./cop";
import { modulDiareKecoa, modulDiareLalat } from "./diare";
import { modulHiv } from "./hiv";
import { modulKlinik } from "./klinik";
import { modulKarhutla } from "./karhutla";
import { modulLaluLintas } from "./lalu-lintas";
import { modulMalaria } from "./malaria";
import { modulPab } from "./pab";
import { modulPengawasanKlinik } from "./pengawasan-klinik";
import { modulPesawat } from "./pesawat";
import { modulPieGlobal } from "./pie-global";
import { modulPieNasional } from "./pie-nasional";
import { modulPhqc } from "./phqc";
import { modulRatGuard } from "./ratguard";
import { modulSkdr } from "./skdr";
import { modulStokVaksin } from "./stok-vaksin";
import { modulTb } from "./tb";
import { modulTikus } from "./tikus";
import { modulTpp } from "./tpp";
import { modulTtu } from "./ttu";

/**
 * Daftar modul yang masuk Laporan Bulanan, sesuai urutan tampil.
 * Modul baru: buat satu file di folder ini lalu tambahkan di sini.
 * Nama `kelompok` mengikuti kelompok menu samping (Faktor Risiko, Vektor, Surveilans, Klinik Binaan BKK);
 * modul yang sekelompok otomatis menjadi satu bagian di laporan Word.
 */
export const DAFTAR_MODUL: ModulLaporan[] = [
  // Faktor Risiko
  modulCop,
  modulPhqc,
  modulRatGuard,
  modulPesawat,
  modulLaluLintas,
  // Vektor
  modulAedes,
  modulAnopheles,
  modulTikus,
  modulDiareLalat,
  modulDiareKecoa,
  // Surveilans (urutan mengikuti menu samping)
  modulMalaria,
  modulTb,
  modulHiv,
  modulTpp,
  modulTtu,
  modulPab,
  modulPieNasional,
  modulPieGlobal,
  modulSkdr,
  modulKarhutla,
  // Klinik Binaan BKK
  modulKlinik,
  modulPengawasanKlinik,
  modulStokVaksin,
];
