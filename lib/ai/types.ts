/**
 * Interface yang sama dipakai oleh SEMUA adapter provider AI (Gemini,
 * openai_compatible, dan provider lain kalau ditambah nanti), supaya
 * lib/ai/index.ts bisa memilih adapter tanpa peduli detail provider.
 */
export type InputProviderAi = {
  apiKey: string;
  model: string;
  /** Wajib untuk 'openai_compatible' (mis. https://api.groq.com/openai/v1). Diabaikan oleh adapter Gemini. */
  baseUrl?: string | null;
  prompt: string;
};

/** Semua adapter mengembalikan teks respons AI mentah (belum di-parse JSON). */
export type FungsiProviderAi = (input: InputProviderAi) => Promise<string>;
