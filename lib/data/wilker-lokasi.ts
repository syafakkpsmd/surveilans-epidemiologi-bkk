export interface Fasilitas {
  nama: string;
  tipe: "pelabuhan" | "bandara";
  lat: number;
  lng: number;
}

export interface WilkerLokasi {
  kode: string; // WK01–WK07
  nama: string;
  pusat: { lat: number; lng: number };
  zoomDetail: number;
  fasilitas: Fasilitas[];
}

// ⚠️ Semua lat/lng di bawah ini PLACEHOLDER — ganti dengan koordinat asli
// (ambil dari Google Maps: klik kanan lokasi → koordinat muncul otomatis)
export const WILKER_LOKASI: WilkerLokasi[] = [
  {
    kode: "WK01",
    nama: "Pelabuhan Samarinda",
    pusat: { lat: -0.524446, lng: 117.171145 },
    zoomDetail: 13,
    fasilitas: [
      { nama: "Pelabuhan Umum", tipe: "pelabuhan", lat: -0.505660, lng: 117.151706 },
      { nama: "Pelabuhan TPK Palaran", tipe: "pelabuhan", lat: -0.570786, lng: 117.207468 },
      { nama: "Pelabuhan Muara Berau", tipe: "pelabuhan", lat: -0.290107, lng: 117.606742 },
      { nama: "Pelabuhan Salikimuara Badak", tipe: "pelabuhan", lat: -0.402272, lng: 117.429541 },
    ],
  },
  {
    kode: "WK02",
    nama: "Pelabuhan Tanjung Santan",
    pusat: { lat: -0.088145, lng: 117.444977 },
    zoomDetail: 14,
    fasilitas: [
      { nama: "Pelabuhan Tanjung Santan", tipe: "pelabuhan", lat: -0.088145, lng: 117.444977 },
    ],
  },
  {
    kode: "WK03",
    nama: "Pelabuhan Tanjung Laut",
    pusat: { lat: 0.139117, lng: 117.494074 },
    zoomDetail: 13,
    fasilitas: [
      { nama: "Pelabuhan PT. Badak LNG", tipe: "pelabuhan", lat: 0.102942, lng: 117.477918 },
      { nama: "Pelabuhan Umum", tipe: "pelabuhan", lat: 0.115138, lng: 117.492629 },
      { nama: "Pelabuhan Indominco", tipe: "pelabuhan", lat: 0.028404, lng: 117.515840 },
      { nama: "Bandara PT. Badak LNG", tipe: "bandara", lat: 0.119406, lng: 117.472822 },
    ],
  },
  {
    kode: "WK04",
    nama: "Pelabuhan Lhok Tuan",
    pusat: { lat: 0.165029, lng: 117.487204 },
    zoomDetail: 13,
    fasilitas: [
      { nama: "Pelabuhan Umum", tipe: "pelabuhan", lat: 0.165029, lng: 117.487204 },
      { nama: "Pelabuhan PT. PKT", tipe: "pelabuhan", lat: 0.173596, lng: 117.496941 },
      { nama: "Pelabuhan PT. KPI", tipe: "pelabuhan", lat: 0.179853, lng: 117.488537 },
    ],
  },
  {
    kode: "WK05",
    nama: "Pelabuhan Sangatta",
    pusat: { lat: 0.533478, lng: 117.5566483 },
    zoomDetail: 13,
    fasilitas: [
      { nama: "Pelabuhan TBCT", tipe: "pelabuhan", lat: 0.529576, lng: 117.645222 },
      { nama: "Pelabuhan Umum", tipe: "pelabuhan", lat: 0.535536, lng: 117.643032 },
      { nama: "Pelabuhan PT. Indexim", tipe: "pelabuhan", lat: 0.813120, lng: 117.871091 },
      { nama: "Bandara PT. KPC", tipe: "bandara", lat: 0.558745, lng: 117.641639 },
    ],
  },
  {
    kode: "WK06",
    nama: "Pelabuhan Sangkulirang",
    pusat: { lat: 1.987437, lng: 117.985921 },
    zoomDetail: 13,
    fasilitas: [
      { nama: "Pelabuhan Umum", tipe: "pelabuhan", lat: 1.987437, lng: 117.985921 },
      { nama: "Pelabuhan Maloy", tipe: "pelabuhan", lat: 1.919460, lng: 117.987284 },
      { nama: "Pelabuhan PT. GAM", tipe: "pelabuhan", lat: 1.142573, lng: 117.882876 },
    ],
  },
  {
    kode: "WK07",
    nama: "Bandara APT Pranoto",
    pusat: { lat: -0.3746, lng: 117.2506 },
    zoomDetail: 15,
    fasilitas: [
      { nama: "Bandara APT Pranoto", tipe: "bandara", lat: -0.3746, lng: 117.2506 },
    ],
  },
];

export const PUSAT_SAMARINDA: [number, number] = [-0.5022, 117.1536];
export const ZOOM_OVERVIEW = 9;