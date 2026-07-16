import type { PengaturanAi } from '@/types/database.types';
import { panggilGemini } from './providers/gemini';
import { panggilOpenAiCompatible } from './providers/openaiCompatible';
import type { FungsiProviderAi } from './types';

const ADAPTER_PER_TIPE: Record<PengaturanAi['tipe_provider'], FungsiProviderAi> = {
  gemini: panggilGemini,
  openai_compatible: panggilOpenAiCompatible,
};

/**
 * Memanggil provider AI yang sedang aktif (baris `pengaturan_ai`)
 * dengan sebuah prompt, mengembalikan teks respons MENTAH (belum
 * di-parse JSON -- lihat lib/ai/prompt.ts untuk parsing ke bentuk
 * { ringkasan, anomali, rekomendasi }).
 */
export async function panggilAI(pengaturan: PengaturanAi, prompt: string): Promise<string> {
  const adapter = ADAPTER_PER_TIPE[pengaturan.tipe_provider];

  if (!adapter) {
    throw new Error(`Tipe provider AI tidak dikenal: ${pengaturan.tipe_provider}`);
  }

  return adapter({
    apiKey: pengaturan.api_key,
    model: pengaturan.model,
    baseUrl: pengaturan.base_url,
    prompt,
  });
}
