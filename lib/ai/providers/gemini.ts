import type { FungsiProviderAi } from '../types';

export const maxDuration = 30; // detik

const HTTP_RETRYABLE = new Set([500, 502, 503, 429, 529]);
const MAX_RETRY = 3; // Dikurangi agar tidak menghabiskan maxDuration Vercel (30 detik)

/**
 * Jeda dinamis dengan Exponential Backoff + Jitter khusus HTTP 429
 */
function hitungJedaMs(percobaan: number, isRateLimit: boolean): number {
  if (isRateLimit) {
    // Jika 429 (Rate Limit), jeda harus lebih panjang (6s, 12s, dst) agar kuota RPM reset
    const base = Math.pow(2, percobaan + 1) * 3000; // 6000ms, 12000ms...
    const jitter = Math.random() * 1000;
    return base + jitter;
  }
  // Error server biasa (500/503)
  return Math.pow(2, percobaan) * 1000 + Math.random() * 500;
}

/**
 * Sanitasi prompt secukupnya tanpa merusak karakter unicode / struktur teks
 */
function bersihkanPrompt(teks: string): string {
  if (!teks) return '';
  return teks
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]/g, '') // Hapus kontrol karakter tersembunyi
    .trim();
}

/**
 * Perbaiki JSON yang terpotong jika kena MAX_TOKENS
 */
function perbaikiJsonTerpotong(teks: string): string {
  let t = teks.trim().replace(/,\s*$/, '');
  const quoteCount = (t.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) t = t + '"';

  const stack: string[] = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '{') stack.push('}');
    else if (t[i] === '[') stack.push(']');
    else if (t[i] === '}' || t[i] === ']') stack.pop();
  }
  while (stack.length > 0) t = t + stack.pop();
  return t;
}

export const panggilGemini: FungsiProviderAi = async ({ apiKey, model, prompt }) => {
  if (!apiKey) {
    throw new Error('API key Gemini belum diset. Hubungi Admin untuk konfigurasi di /admin/pengaturan-ai.');
  }

  const promptBersih = bersihkanPrompt(prompt);
  const promptFinal = promptBersih.length > 8000 ? promptBersih.slice(0, 8000) + '...' : promptBersih;

  // Nama model default fallback jika param kosong
  const namaModel = model || 'gemini-1.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    namaModel
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptFinal }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      // 'thinkingConfig' DIBUANG agar kompatibel dengan seluruh seri Gemini 1.5/2.0 Flash
    },
  };

  let response: Response | null = null;
  let kodeStatus = 0;
  let bodyTeks = '';

  for (let percobaan = 0; percobaan < MAX_RETRY; percobaan++) {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    kodeStatus = response.status;

    if (kodeStatus === 200) {
      bodyTeks = await response.text();
      break;
    }

    bodyTeks = await response.text().catch(() => '');

    // Jika error tidak bisa di-retry (misal 400 Bad Request, 403 Invalid Key), hentikan loop
    if (!HTTP_RETRYABLE.has(kodeStatus)) {
      break;
    }

    // Jika masih ada sisa percobaan, tunggu dengan jeda terukur
    if (percobaan < MAX_RETRY - 1) {
      const isRateLimit = kodeStatus === 429;
      const jeda = hitungJedaMs(percobaan, isRateLimit);
      await new Promise((r) => setTimeout(r, jeda));
    }
  }

  if (kodeStatus !== 200) {
    if (kodeStatus === 429) {
      throw new Error(
        `Gemini API mencapai batas kuota gratis (429 Too Many Requests). Silakan tunggu 15-30 detik sebelum menekan tombol analisis lagi.`
      );
    }
    throw new Error(`Gemini API gagal (HTTP ${kodeStatus}): ${bodyTeks.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = JSON.parse(bodyTeks);
  } catch (e) {
    throw new Error('Gagal melakukan parsing respons JSON dari Gemini API.');
  }

  if (data.error) {
    throw new Error(data.error.message || 'Gemini mengembalikan error tanpa pesan.');
  }

  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini API tidak mengembalikan kandidat jawaban.');
  }

  const finishReason: string = candidates[0]?.finishReason || '';
  if (finishReason === 'SAFETY') {
    throw new Error('Gemini API memblokir respons karena filter keamanan.');
  }

  let teks: string | undefined = candidates[0]?.content?.parts?.[0]?.text;

  if (!teks) {
    throw new Error('Gemini API mengembalikan respons kosong.');
  }

  // Bersihkan markdown code block jika Gemini membungkusnya dalam ```json ... ```
  teks = teks.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

  if (finishReason === 'MAX_TOKENS') {
    teks = perbaikiJsonTerpotong(teks);
  }

  return teks;
};