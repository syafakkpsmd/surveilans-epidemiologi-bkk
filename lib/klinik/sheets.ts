// lib/klinik/sheets.ts
import { google } from 'googleapis';
import path from 'path';

function getGoogleAuth(scopes: string[]) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    // Produksi (Vercel) — kredensial dari environment variable
    return new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes,
    });
  }

  // Fallback lokal — kredensial dari file (tidak ikut ter-deploy, hanya untuk dev)
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'credentials.json'),
    scopes,
  });
}

// Auth client & Sheets/Drive client dibuat SEKALI per proses (module-level singleton),
// bukan setiap kali dipanggil. Sebelumnya setiap fetch spreadsheet yang cache-nya
// kosong ikut menukar token OAuth baru ke Google terlebih dulu — kerja ganda yang
// menambah latensi dan request tak perlu, apalagi saat 5-20 klinik di-fetch beruntun.
let authDrive: ReturnType<typeof getGoogleAuth> | null = null;
let authSheets: ReturnType<typeof getGoogleAuth> | null = null;
let clientDrive: ReturnType<typeof google.drive> | null = null;
let clientSheets: ReturnType<typeof google.sheets> | null = null;

function getDriveClient() {
  if (!clientDrive) {
    authDrive = getGoogleAuth(['https://www.googleapis.com/auth/drive.readonly']);
    clientDrive = google.drive({ version: 'v3', auth: authDrive });
  }
  return clientDrive;
}

function getSheetsClient() {
  if (!clientSheets) {
    authSheets = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    clientSheets = google.sheets({ version: 'v4', auth: authSheets });
  }
  return clientSheets;
}

export async function listFilesInFolder() {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, size)',
  });
  return response.data.files ?? [];
}

const CACHE_TTL_MS = 60 * 60 * 1000;

type HasilWorkbook = Awaited<ReturnType<typeof readKlinikWorkbook>>;
type EntriCache = {
  data: HasilWorkbook;
  diambilPada: number; // kapan data ini terakhir BERHASIL diambil dari Google
};

const cacheWorkbook = new Map<string, EntriCache>();

/**
 * Ambil data workbook klinik, dengan strategi stale-while-revalidate:
 * - Cache masih segar (< 15 menit)  -> langsung kembalikan, TIDAK panggil Google sama sekali.
 * - Cache sudah basi (> 15 menit)   -> coba ambil data baru.
 *      - Kalau BERHASIL  -> perbarui cache, kembalikan data baru.
 *      - Kalau GAGAL (mis. 429)  -> jangan lempar error; kembalikan data LAMA yang basi
 *        itu (lebih baik data agak lawas daripada dashboard error/lambat), sambil
 *        mencatat warning ke log supaya kelihatan di Vercel Logs klinik mana yang gagal
 *        diperbarui.
 * - Tidak ada cache sama sekali (pertama kali / baru cold start) -> tidak ada yang bisa
 *   di-fallback, error dilempar apa adanya ke pemanggil (dataset.ts sudah menangani ini
 *   per-klinik supaya tidak menjatuhkan seluruh dashboard).
 */
export async function readKlinikWorkbookCached(spreadsheetId: string) {
  const cached = cacheWorkbook.get(spreadsheetId);
  const masihSegar = cached && Date.now() - cached.diambilPada < CACHE_TTL_MS;
  if (masihSegar) return cached!.data;

  try {
    const data = await readKlinikWorkbook(spreadsheetId);
    cacheWorkbook.set(spreadsheetId, { data, diambilPada: Date.now() });
    return data;
  } catch (err) {
    if (cached) {
      const umurMenit = Math.round((Date.now() - cached.diambilPada) / 60000);
      console.warn(
        `[readKlinikWorkbookCached] Gagal perbarui ${spreadsheetId} (${(err as Error).message}). ` +
        `Memakai cache lama berumur ~${umurMenit} menit sebagai fallback.`
      );
      return cached.data;
    }
    // Tidak ada cache sama sekali untuk di-fallback — lempar apa adanya.
    throw err;
  }
}

const SHEET_TABS = [
  'Data ICV / e-ICV',
  'Data Faskes',
  'Stok E-ICV',
  'Stok ICV',
  'Stok Vaksin MM',
  'Stok Vaksin YF',
  'Stok Vaksin Polio',
  'Stok Vaksin Flu',
  'REKAP STOK',
] as const;

// Baca semua tab sekaligus dalam 1 request (hemat quota API)
export async function readKlinikWorkbook(spreadsheetId: string) {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.batchGet(
    {
      spreadsheetId,
      ranges: [...SHEET_TABS],
      valueRenderOption: 'UNFORMATTED_VALUE', // angka mentah, rumus tetap ke-resolve jadi hasil akhir
    },
    {
      // Retry bawaan gaxios sebelumnya TANPA batas atas (maxRetryDelay & totalTimeout
      // default-nya nyaris tak terhingga) — saat kena 429, satu request bisa menunggu
      // backoff yang terus membesar sampai puluhan detik. Di-cap eksplisit di sini:
      // maksimal 2x percobaan ulang, delay antar-percobaan dibatasi <= 3 detik. Kalau
      // dalam 2x percobaan masih gagal, biarkan gagal cepat — readKlinikWorkbookCached
      // di atas akan menangkapnya dan fallback ke data cache lama.
      retryConfig: {
        retry: 2,
        retryDelayMultiplier: 2,
        maxRetryDelay: 3000,
        totalTimeout: 15000,
      },
    }
  );

  const [icv, faskes, stokEicv, stokIcv, stokMM, stokYF, stokPolio, stokFlu, rekap] =
    res.data.valueRanges ?? [];

  return {
    icv: parseIcvSheet(icv?.values ?? []),
    faskes: faskes?.values ?? [],       // masih raw, tunggu konfirmasi struktur
    stokEicv: parseStokEicv(stokEicv?.values ?? []),
    stokIcv: parseStokUmum(stokIcv?.values ?? []),
    stokMM: parseStokUmum(stokMM?.values ?? []),
    stokYF: parseStokUmum(stokYF?.values ?? []),
    stokPolio: parseStokUmum(stokPolio?.values ?? []),
    stokFlu: parseStokUmum(stokFlu?.values ?? []),
    rekapStok: rekap?.values ?? [],     // masih raw, tunggu konfirmasi struktur
  };
}

// "Data ICV / e-ICV": kolom A = label bulan (diabaikan), header sebenarnya mulai kolom B
// lib/klinik/sheets.ts — ganti fungsi parseIcvSheet
function parseIcvSheet(rows: any[][]) {
  if (rows.length < 2) return [];
  const header = rows[0].slice(1);
  return rows.slice(1)
    .map((row) => {
      const cells = row.slice(1);
      return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? null]));
    })
    .filter((row) => row['Nama'] && String(row['Nama']).trim() !== ''); // buang baris kosong
}

// Tab "Stok ICV/YF/MM/Polio/Flu" — pola kolom sama persis
function parseStokUmum(rows: any[][]) {
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(header.map((h, i) => [h, row[i] ?? null]))
  );
}

// "Stok E-ICV" kolomnya lebih sedikit (tidak ada Vaksin Rusak dsb), tapi pola generic-nya sama
function parseStokEicv(rows: any[][]) {
  return parseStokUmum(rows);
}