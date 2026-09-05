// lib/klinik/sheets.ts
import { google } from 'googleapis';
import path from 'path';
import { unstable_cache } from 'next/cache';

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

function getDriveClient() {
  const auth = getGoogleAuth(['https://www.googleapis.com/auth/drive.readonly']);
  return google.drive({ version: 'v3', auth });
}

function getSheetsClient() {
  const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
  return google.sheets({ version: 'v4', auth });
}

export async function listFilesInFolder() {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, size)',
  });
  return response.data.files ?? [];
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheWorkbook = new Map<string, { data: Awaited<ReturnType<typeof readKlinikWorkbook>>; kedaluwarsa: number }>();

export async function readKlinikWorkbookCached(spreadsheetId: string) {
  const cached = cacheWorkbook.get(spreadsheetId);
  if (cached && cached.kedaluwarsa > Date.now()) return cached.data;

  const data = await readKlinikWorkbook(spreadsheetId);
  cacheWorkbook.set(spreadsheetId, { data, kedaluwarsa: Date.now() + CACHE_TTL_MS });
  return data;
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

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [...SHEET_TABS],
    valueRenderOption: 'UNFORMATTED_VALUE', // angka mentah, rumus tetap ke-resolve jadi hasil akhir
  });

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