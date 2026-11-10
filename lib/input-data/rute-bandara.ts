// lib/input-data/rute-bandara.ts
// Kode rute SKLT dari Sinkarkes ("AAP-SUB", "AAP - CGK - SUB") -> nama tujuan. MURNI.
// Aturan: kode asal (AAP = APT Pranoto) dilewati; yang dipakai kode PERTAMA SETELAH asal
// (AAP-CGK-PLM = Cengkareng). Kode yang belum terdaftar disimpan apa adanya (huruf besar).
// Isian yang sudah berupa nama (mis. hasil edit petugas: "Surabaya") dibiarkan.
export const KODE_ASAL = 'AAP';

export const NAMA_BANDARA: Record<string, string> = {
  // Kode dari Anda (prioritas)
  SUB: 'Surabaya', BDJ: 'Banjarmasin', YIA: 'Yogyakarta', CGK: 'Cengkareng', LNU: 'Malinau',
  MHU: 'Muara Wahau', RTU: 'Maratua', BEJ: 'Kalimarau', LPU: 'Long Ampung', GHS: 'Melak', DTD: 'Datah Dawai',
  // Kalimantan
  BPN: 'Balikpapan', SRI: 'Samarinda (Temindung)', TRK: 'Tarakan', BXT: 'Bontang', TSX: 'Tanjung Selor',
  NNX: 'Nunukan', LBW: 'Long Bawan', PNK: 'Pontianak', PKY: 'Palangka Raya', SMQ: 'Sampit',
  PKN: 'Pangkalan Bun', KTG: 'Ketapang', SQG: 'Sintang', BTW: 'Batulicin',
  // Jawa
  HLP: 'Jakarta (Halim)', BDO: 'Bandung', SRG: 'Semarang', SOC: 'Solo', JOG: 'Yogyakarta',
  MLG: 'Malang', KJT: 'Kertajati', BWX: 'Banyuwangi', CBN: 'Cirebon',
  // Sumatera
  KNO: 'Medan (Kualanamu)', PLM: 'Palembang', PDG: 'Padang', PKU: 'Pekanbaru', BTH: 'Batam',
  TNJ: 'Tanjung Pinang', DJB: 'Jambi', BKS: 'Bengkulu', TKG: 'Bandar Lampung', BTJ: 'Banda Aceh',
  PGK: 'Pangkal Pinang', TJQ: 'Tanjung Pandan', DUM: 'Dumai', SBG: 'Sabang',
  // Sulawesi
  UPG: 'Makassar', MDC: 'Manado', PLW: 'Palu', KDI: 'Kendari', GTO: 'Gorontalo', LUW: 'Luwuk',
  MJU: 'Mamuju', BUW: 'Baubau',
  // Bali dan Nusa Tenggara
  DPS: 'Denpasar', LOP: 'Lombok', BMU: 'Bima', LBJ: 'Labuan Bajo', KOE: 'Kupang', MOF: 'Maumere',
  ENE: 'Ende', WGP: 'Waingapu', TMC: 'Tambolaka', SWQ: 'Sumbawa Besar',
  // Maluku dan Papua
  AMQ: 'Ambon', TTE: 'Ternate', DJJ: 'Jayapura', SOQ: 'Sorong', MKW: 'Manokwari', BIK: 'Biak',
  TIM: 'Timika', MKQ: 'Merauke',
};

export function namaTujuanDariRute(rute: string | number | null | undefined): string | null {
  if (rute == null) return null;
  const teks = String(rute).trim();
  if (!teks) return null;
  const kode = teks.toUpperCase().split(/\s*[-–—/>]+\s*|\s+/).filter(Boolean);
  if (!kode.length || !kode.every((k) => /^[A-Z]{3}$/.test(k))) return teks; // sudah berupa nama
  const tujuan = kode.find((k) => k !== KODE_ASAL) ?? kode[0];
  return NAMA_BANDARA[tujuan] ?? tujuan;
}