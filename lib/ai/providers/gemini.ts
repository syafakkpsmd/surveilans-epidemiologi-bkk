import type { FungsiProviderAi } from '../types';

/**
 * Adapter untuk Gemini (Google AI Studio -- ada tier gratis).
 * Dokumentasi: https://ai.google.dev/api/generate-content
 *
 * Endpoint SELALU generativelanguage.googleapis.com -- karena itu
 * `baseUrl` tidak dipakai di sini (beda dengan adapter
 * openai_compatible yang base_url-nya memang bervariasi per provider).
 *
 * Pola retry & sanitasi teks diadaptasi dari fungsi callGeminiAPI_ di
 * GAS Code.gs (EPIC-AI BKK Kelas I Samarinda) yang sudah teruji stabil
 * di produksi -- Gemini API cukup sering membalas 503/429 pada jam
 * sibuk, jadi retry dengan backoff bukan opsional.
 */

const HTTP_RETRYABLE = new Set([500, 502, 503, 429, 529]);
const JEDA_MS = [5000, 12000, 25000, 45000, 60000];
const MAX_RETRY = 5;

/**
 * Bersihkan teks dari karakter yang bisa merusak payload JSON:
 * newline/tab -> spasi, karakter non-printable ASCII -> spasi,
 * kutip ganda -> kutip tunggal, backslash -> slash.
 */
function bersihkanTeks(teks: string): string {
  return String(teks ?? '')
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 10 || code === 13 || code === 9) return ' ';
      if (code < 32 || code > 126) return ' ';
      if (code === 34) return "'";
      if (code === 92) return '/';
      return ch;
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Perbaiki JSON yang terpotong karena MAX_TOKENS tercapai -- tutup
 * kutip yang belum ditutup, tutup kurung kurawal/siku yang masih
 * terbuka.
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

  const promptBersih = bersihkanTeks(prompt);
  const promptFinal =
    promptBersih.length > 6000 ? promptBersih.slice(0, 6000) + '...' : promptBersih;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptFinal }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let response: Response | null = null;
  let kodeStatus = 0;
  let bodyTeks = '';

  for (let percobaan = 0; percobaan < MAX_RETRY; percobaan++) {
    if (percobaan > 0) {
      await new Promise((r) => setTimeout(r, JEDA_MS[percobaan - 1]));
    }

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
    if (!HTTP_RETRYABLE.has(kodeStatus)) {
      bodyTeks = await response.text().catch(() => '');
      break;
    }
    // retryable -> lanjut percobaan berikutnya
  }

  if (kodeStatus !== 200) {
    throw new Error(`Gemini API gagal (HTTP ${kodeStatus}): ${bodyTeks.slice(0, 500)}`);
  }

  const data = JSON.parse(bodyTeks);
  if (data.error) throw new Error(data.error.message || 'Gemini mengembalikan error tanpa pesan.');

  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini API tidak mengembalikan kandidat jawaban.');
  }

  const finishReason: string = candidates[0]?.finishReason || '';
  if (finishReason === 'SAFETY') {
    throw new Error('Gemini API memblokir respons karena safety filter.');
  }

  let teks: string | undefined = candidates[0]?.content?.parts?.[0]?.text;

  if (!teks) {
    throw new Error('Gemini API mengembalikan respons tanpa teks (mungkin diblokir safety filter).');
  }

  teks = teks.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  if (finishReason === 'MAX_TOKENS') {
    teks = perbaikiJsonTerpotong(teks);
  }

  return teks;
};

