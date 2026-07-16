import type { FungsiProviderAi } from '../types';

/**
 * Adapter untuk provider mana pun yang kompatibel format Chat
 * Completions ala OpenAI -- mis. xAI (console.x.ai), Groq
 * (console.groq.com, ada tier gratis), OpenRouter, dan lain-lain.
 * Admin cukup isi base_url + model + api_key yang sesuai, TIDAK perlu
 * kode baru tiap ganti provider.
 *
 * `baseUrl` WAJIB diisi Admin, contoh:
 *   - Groq        : https://api.groq.com/openai/v1
 *   - xAI         : https://api.x.ai/v1
 *   - OpenRouter  : https://openrouter.ai/api/v1
 */
export const panggilOpenAiCompatible: FungsiProviderAi = async ({
  apiKey,
  model,
  baseUrl,
  prompt,
}) => {
  if (!baseUrl) {
    throw new Error(
      "Provider tipe 'openai_compatible' butuh base_url (mis. https://api.groq.com/openai/v1). Lengkapi dulu di halaman Atur AI."
    );
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Provider AI (openai_compatible) gagal (HTTP ${response.status}): ${detail.slice(0, 500)}`
    );
  }

  const data = await response.json();
  const teks: string | undefined = data?.choices?.[0]?.message?.content;

  if (!teks) {
    throw new Error('Provider AI (openai_compatible) mengembalikan respons tanpa teks.');
  }

  return teks;
};
