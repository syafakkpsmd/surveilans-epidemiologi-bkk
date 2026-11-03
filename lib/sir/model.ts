// Model matematika SIR — tidak ada dependency Supabase di sini, murni fungsi

export interface TitikSIR {
  hari: number;
  S: number;
  I: number;
  R: number;
  [key: string]: number; // tambahan ini bikin kompatibel dengan tipe Json Supabase
}

export interface ParameterPenyakit {
  r0Default: number;
  serialIntervalHari: number;
}

/**
 * Turunkan beta (laju transmisi) dan gamma (laju recovery) dari R0 dan serial interval.
 * gamma = 1 / serial interval (asumsi umum epidemiologi)
 * beta = R0 * gamma
 */
export function hitungBetaGamma(r0: number, serialIntervalHari: number) {
  const gamma = 1 / serialIntervalHari;
  const beta = r0 * gamma;
  return { beta, gamma };
}

/**
 * Solve SIR pakai RK4 (lebih stabil dari Euler biasa untuk dt=1 hari)
 * N = total populasi, dt dalam hari, totalHari = panjang simulasi
 */
export function solveSIR(
  N: number,
  S0: number,
  I0: number,
  R0Awal: number,
  beta: number,
  gamma: number,
  totalHari: number,
  dt: number = 0.5
): TitikSIR[] {
  const hasil: TitikSIR[] = [];
  let S = S0, I = I0, R = R0Awal;
  const langkah = Math.ceil(totalHari / dt);

  const turunan = (S: number, I: number) => {
    const dS = (-beta * S * I) / N;
    const dI = (beta * S * I) / N - gamma * I;
    const dR = gamma * I;
    return { dS, dI, dR };
  };

  hasil.push({ hari: 0, S, I, R });

  for (let langkahKe = 1; langkahKe <= langkah; langkahKe++) {
    const k1 = turunan(S, I);
    const k2 = turunan(S + (dt / 2) * k1.dS, I + (dt / 2) * k1.dI);
    const k3 = turunan(S + (dt / 2) * k2.dS, I + (dt / 2) * k2.dI);
    const k4 = turunan(S + dt * k3.dS, I + dt * k3.dI);

    S += (dt / 6) * (k1.dS + 2 * k2.dS + 2 * k3.dS + k4.dS);
    I += (dt / 6) * (k1.dI + 2 * k2.dI + 2 * k3.dI + k4.dI);
    R += (dt / 6) * (k1.dR + 2 * k2.dR + 2 * k3.dR + k4.dR);

    // clamp biar tidak negatif karena floating point
    S = Math.max(0, S); I = Math.max(0, I); R = Math.max(0, R);

    const hariSaatIni = langkahKe * dt;
    // simpan snapshot per hari bulat saja, biar output tidak terlalu besar
    if (Math.abs(hariSaatIni - Math.round(hariSaatIni)) < dt / 2) {
      hasil.push({ hari: Math.round(hariSaatIni), S, I, R });
    }
  }

  return hasil;
}

/**
 * Simulasi kapal: dua skenario paralel (dengan isolasi vs tanpa isolasi)
 */
export function simulasiKapal(params: {
  totalAbk: number;
  abkBergejala: number;
  parameterPenyakit: ParameterPenyakit;
  r0Override?: number;
  efektivitasIsolasiPersen: number;
  totalHari?: number;
}) {
  const { totalAbk, abkBergejala, parameterPenyakit, r0Override, efektivitasIsolasiPersen, totalHari = 21 } = params;

  const r0 = r0Override ?? parameterPenyakit.r0Default;
  const { beta, gamma } = hitungBetaGamma(r0, parameterPenyakit.serialIntervalHari);

  const S0 = totalAbk - abkBergejala;
  const I0 = abkBergejala;

  // skenario tanpa isolasi: beta penuh
  const kurvaTanpaIsolasi = solveSIR(totalAbk, S0, I0, 0, beta, gamma, totalHari);

  // skenario dengan isolasi: beta dikurangi efektivitas isolasi
  const betaTerisolasi = beta * (1 - efektivitasIsolasiPersen / 100);
  const kurvaDenganIsolasi = solveSIR(totalAbk, S0, I0, 0, betaTerisolasi, gamma, totalHari);

  const rEfektifTanpaIsolasi = r0 * (S0 / totalAbk);
  const rEfektifDenganIsolasi = (betaTerisolasi / gamma) * (S0 / totalAbk);

  return {
    kurvaTanpaIsolasi,
    kurvaDenganIsolasi,
    rEfektifTanpaIsolasi,
    rEfektifDenganIsolasi,
    betaDipakai: beta,
    gammaDipakai: gamma,
  };
}

/**
 * Estimasi risiko ke TKBM: kontak sesaat (bukan mixing terus-menerus kayak kapal),
 * jadi dihitung sebagai probabilitas infeksi per kontak, bukan SIR penuh.
 * p = 1 - exp(-beta * durasiJam/24 * (I_saat_kontak/N) * (1 - efektivitasApd))
 */
export function estimasiRisikoTkbm(params: {
  jumlahTkbm: number;
  durasiKontakJam: number;
  penggunaanApdPersen: number;
  iSaatKontak: number; // ambil dari kurva kapal, hari ke-0 = jumlah abk bergejala saat sandar
  totalAbk: number;
  beta: number;
}) {
  const { jumlahTkbm, durasiKontakJam, penggunaanApdPersen, iSaatKontak, totalAbk, beta } = params;
  const efektivitasApd = penggunaanApdPersen / 100;
  const proporsiInfeksius = iSaatKontak / totalAbk;
  const durasiHari = durasiKontakJam / 24;

  const pInfeksiPerOrang =
    1 - Math.exp(-beta * durasiHari * proporsiInfeksius * (1 - efektivitasApd));

  const estimasiTkbmTerinfeksi = jumlahTkbm * pInfeksiPerOrang;

  return { pInfeksiPerOrang, estimasiTkbmTerinfeksi };
}

export function buatRekomendasiKebijakan(params: {
  rEfektifDenganIsolasi: number;
  rEfektifTanpaIsolasi: number;
  estimasiTkbmTerinfeksi: number;
  estimasiPetugasKesehatanTerinfeksi: number;
  estimasiPetugasNonKesehatanTerinfeksi: number;
  masaInkubasiHari: number;
  risikoRelatifKota: string;
}): string {
  const {
    rEfektifDenganIsolasi,
    rEfektifTanpaIsolasi,
    estimasiTkbmTerinfeksi,
    estimasiPetugasKesehatanTerinfeksi,
    estimasiPetugasNonKesehatanTerinfeksi,
    masaInkubasiHari,
    risikoRelatifKota,
  } = params;
  const poin: string[] = [];

  if (rEfektifTanpaIsolasi > 1 && rEfektifDenganIsolasi > 1) {
    poin.push("Isolasi saat ini TIDAK CUKUP menekan R efektif di bawah 1 — rekomendasikan karantina penuh kapal, tunda proses bongkar muat sampai evaluasi ulang.");
  } else if (rEfektifTanpaIsolasi > 1 && rEfektifDenganIsolasi <= 1) {
    poin.push("Isolasi efektif menekan R efektif di bawah 1 — lanjutkan isolasi ketat ABK bergejala, pantau ketat kepatuhan.");
  } else {
    poin.push("R efektif sudah di bawah 1 bahkan tanpa isolasi tambahan — risiko penularan lanjutan di kapal relatif rendah, tetap lakukan pemantauan standar.");
  }

  if (estimasiTkbmTerinfeksi >= 1) {
    poin.push(`Estimasi ${estimasiTkbmTerinfeksi.toFixed(1)} TKBM berisiko tertular — pantau gejala selama ${masaInkubasiHari} hari.`);
  }

  const totalPetugasBerisiko = estimasiPetugasKesehatanTerinfeksi + estimasiPetugasNonKesehatanTerinfeksi;
  if (totalPetugasBerisiko >= 0.5) {
    poin.push(`Estimasi ${estimasiPetugasKesehatanTerinfeksi.toFixed(2)} petugas kesehatan dan ${estimasiPetugasNonKesehatanTerinfeksi.toFixed(2)} petugas non-kesehatan BKK berisiko tertular dari kontak pemeriksaan — pastikan APD petugas sesuai standar dan pantau gejala selama ${masaInkubasiHari} hari.`);
  }

  poin.push(risikoRelatifKota);

  return poin.join(" ");
}

// ==================== KAPAL: risiko petugas BKK & risiko relatif kota ====================

export function estimasiRisikoPetugas(params: {
  jumlahPetugasKesehatan: number;
  jumlahPetugasNonKesehatan: number;
  durasiKontakJam: number;
  penggunaanApdPersen: number;
  iSaatKontak: number;
  totalPopulasiSumber: number;
  beta: number;
}) {
  const { jumlahPetugasKesehatan, jumlahPetugasNonKesehatan, durasiKontakJam, penggunaanApdPersen, iSaatKontak, totalPopulasiSumber, beta } = params;

  const efektivitasApd = penggunaanApdPersen / 100;
  const proporsiInfeksius = totalPopulasiSumber > 0 ? iSaatKontak / totalPopulasiSumber : 0;
  const durasiHari = durasiKontakJam / 24;

  const pInfeksiPerOrang = 1 - Math.exp(-beta * durasiHari * proporsiInfeksius * (1 - efektivitasApd));

  return {
    pInfeksiPerOrang,
    estimasiPetugasKesehatanTerinfeksi: jumlahPetugasKesehatan * pInfeksiPerOrang,
    estimasiPetugasNonKesehatanTerinfeksi: jumlahPetugasNonKesehatan * pInfeksiPerOrang,
  };
}

export function hitungRisikoRelatifKota(estimasiKasusPotensial: number, populasiKotaSekitar: number | null | undefined): string {
  if (!populasiKotaSekitar || populasiKotaSekitar === 0) {
    return "Data populasi kota untuk wilayah ini belum tersedia — risiko relatif tidak dapat dihitung.";
  }
  const proporsi = estimasiKasusPotensial / populasiKotaSekitar;
  if (proporsi < 0.000001) {
    return `Risiko sangat kecil dibanding populasi area layanan (~${populasiKotaSekitar.toLocaleString("id-ID")} jiwa).`;
  } else if (proporsi < 0.00001) {
    return `Risiko kecil namun tetap perlu dipantau, mengingat populasi area layanan ~${populasiKotaSekitar.toLocaleString("id-ID")} jiwa.`;
  }
  return `Risiko signifikan relatif terhadap populasi area layanan (~${populasiKotaSekitar.toLocaleString("id-ID")} jiwa) — perlu tindak lanjut prioritas.`;
}

// ==================== PESAWAT: kontak erat radius kursi & risiko ground crew ====================

export function estimasiKontakEratPesawat(params: {
  totalPenumpang: number;
  jumlahBergejala: number;
  radiusKontakBaris: number;
  rataRataKursiPerBaris?: number;
}) {
  const { totalPenumpang, jumlahBergejala, radiusKontakBaris, rataRataKursiPerBaris = 6 } = params;

  const kursiTerdampakPerKasus = (radiusKontakBaris * 2 + 1) * rataRataKursiPerBaris;
  const estimasiKontakErat = Math.min(
    totalPenumpang,
    jumlahBergejala * kursiTerdampakPerKasus
  );

  return { estimasiKontakErat };
}

export function estimasiRisikoGroundCrew(params: {
  jumlahGroundCrew: number;
  durasiKontakJam: number;
  penggunaanApdPersen: number;
  jumlahBergejala: number;
  totalPenumpang: number;
  r0: number;
  serialIntervalHari: number;
}) {
  const { jumlahGroundCrew, durasiKontakJam, penggunaanApdPersen, jumlahBergejala, totalPenumpang, r0, serialIntervalHari } = params;
  const { beta } = hitungBetaGamma(r0, serialIntervalHari);
  const efektivitasApd = penggunaanApdPersen / 100;
  const proporsiInfeksius = totalPenumpang > 0 ? jumlahBergejala / totalPenumpang : 0;
  const durasiHari = durasiKontakJam / 24;

  const pInfeksiPerOrang = 1 - Math.exp(-beta * durasiHari * proporsiInfeksius * (1 - efektivitasApd));

  return {
    pInfeksiPerOrang,
    estimasiGroundCrewTerinfeksi: jumlahGroundCrew * pInfeksiPerOrang,
  };
}

export function buatRekomendasiKebijakanPesawat(params: {
  estimasiKontakErat: number;
  estimasiGroundCrewTerinfeksi: number;
  masaInkubasiHari: number;
  adaKotaTujuanLanjutan: boolean;
}): string {
  const { estimasiKontakErat, estimasiGroundCrewTerinfeksi, masaInkubasiHari, adaKotaTujuanLanjutan } = params;
  const poin: string[] = [];

  poin.push(`Estimasi ${estimasiKontakErat} penumpang masuk kategori kontak erat (radius kursi) — rekomendasikan pemantauan gejala selama ${masaInkubasiHari} hari sejak kedatangan.`);

  if (estimasiGroundCrewTerinfeksi >= 1) {
    poin.push(`Ground crew berisiko (estimasi ${estimasiGroundCrewTerinfeksi.toFixed(1)} orang) — rekomendasikan APD tambahan dan pemantauan gejala.`);
  }

  if (adaKotaTujuanLanjutan) {
    poin.push("Terdapat penumpang dengan penerbangan lanjutan — rekomendasikan notifikasi segera ke wilker/dinkes kota tujuan untuk tindak lanjut contact tracing.");
  }

  return poin.join(" ");
}