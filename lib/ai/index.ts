import type { PengaturanAi } from '@/types/database.types';
import { panggilGemini } from './providers/gemini';
import { panggilOpenAiCompatible } from './providers/openaiCompatible';
import type { FungsiProviderAi } from './types';

const ADAPTER_PER_TIPE: Record<PengaturanAi['tipe_provider'], FungsiProviderAi> = {
  gemini: panggilGemini,
  openai_compatible: panggilOpenAiCompatible,
};

const INSTRUKSI_JSON = `

WAJIB: balas HANYA dengan satu objek JSON valid (tanpa teks pembuka/penutup, tanpa code fence) berisi tepat tiga key bertipe string: "ringkasan", "anomali", "rekomendasi".`;

/**
 * Groq (dan provider OpenAI-compatible lain) menolak response_format
 * json_object dengan HTTP 400 kalau teks prompt tidak memuat kata
 * "json". Sebagian prompt (terutama prediksi) belum menyebutnya, jadi
 * dijamin di sini. Key keluaran juga ikut dicek supaya Gemini tidak
 * membalas dengan struktur bebas.
 */
function pastikanInstruksiJson(prompt: string): string {
  const sudahLengkap =
    /json/i.test(prompt) &&
    prompt.includes('ringkasan') &&
    prompt.includes('anomali') &&
    prompt.includes('rekomendasi');
  return sudahLengkap ? prompt : prompt + INSTRUKSI_JSON;
}

// Default untuk semua panggilan. Prediksi/analisis menghasilkan 3 bagian
// panjang, 1024 token terlalu kecil dan membuat JSON terpotong.
const OPSI_DEFAULT = { maxOutputTokens: 4096, maxPromptChars: 24000 };

export async function panggilAI(
  pengaturan: PengaturanAi,
  prompt: string,
  opsi?: { formatJson?: boolean; maxOutputTokens?: number; maxPromptChars?: number }
): Promise<string> {
  const adapter = ADAPTER_PER_TIPE[pengaturan.tipe_provider];

  if (!adapter) {
    throw new Error(`Tipe provider AI tidak dikenal: ${pengaturan.tipe_provider}`);
  }

  return adapter({
    apiKey: pengaturan.api_key,
    model: pengaturan.model,
    baseUrl: pengaturan.base_url,
    prompt: pastikanInstruksiJson(prompt),
    opsi: { ...OPSI_DEFAULT, ...opsi },
  });
}