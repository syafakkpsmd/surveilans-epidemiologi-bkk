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
  /**
   * Opsional. Default: formatJson=true (perilaku lama, dipakai semua modul
   * Analisis/Prediksi AI yang butuh output {ringkasan,anomali,rekomendasi}).
   * Set formatJson=false untuk teks bebas/naratif (mis. laporan docx).
   */
  opsi?: {
    formatJson?: boolean;
    maxOutputTokens?: number;
    maxPromptChars?: number;
  };
};

/** Semua adapter mengembalikan teks respons AI mentah (belum di-parse JSON). */
export type FungsiProviderAi = (input: InputProviderAi) => Promise<string>;
