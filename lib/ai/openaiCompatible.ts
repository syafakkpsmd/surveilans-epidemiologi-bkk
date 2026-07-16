// lib/ai/providers/openaiCompatible.ts
//
// Adapter GENERIK untuk provider mana pun yang endpoint-nya mengikuti
// format OpenAI Chat Completions API (/chat/completions).
// Mencakup: Groq, OpenRouter, xAI (Grok), Together AI, DeepSeek, dan
// provider lain yang mengklaim "OpenAI-compatible".
//
// TIDAK PERLU adapter baru tiap ganti provider dalam kategori ini —
// Admin cukup ganti base_url + model + api_key lewat form pengaturan.

export interface AIProviderInput {
  apiKey: string;
  model: string;
  baseUrl?: string;
  prompt: string;
}

export interface AIProviderResult {
  teks: string;
  providerDipakai: string;
}

const HTTP_RETRYABLE = new Set([500, 502, 503, 429, 529]);
const JEDA_MS = [3000, 8000, 15000];
const MAX_RETRY = 3;

export async function panggilOpenAICompatible({
  apiKey,
  model,
  baseUrl,
  prompt,
}: AIProviderInput): Promise<AIProviderResult> {
  if (!apiKey) {
    throw new Error('API key belum diset. Hubungi Admin untuk konfigurasi di /admin/pengaturan-ai.');
  }
  if (!baseUrl) {
    throw new Error('base_url belum diset untuk provider openai_compatible ini.');
  }

  // Normalisasi: hilangkan trailing slash, supaya tidak jadi "//chat/completions"
  const base = baseUrl.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'Kamu adalah epidemiolog ahli. Balas HANYA dengan objek JSON murni tanpa markdown code fence.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  };

  let resp: Response | null = null;
  let kodeStatus = 0;
  let teksRespon = '';

  for (let percobaan = 0; percobaan < MAX_RETRY; percobaan++) {
    if (percobaan > 0) {
      await new Promise((r) => setTimeout(r, JEDA_MS[percobaan - 1]));
    }

    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    kodeStatus = resp.status;
    teksRespon = await resp.text();

    if (kodeStatus === 200) break;
    if (!HTTP_RETRYABLE.has(kodeStatus)) break;
  }

  if (kodeStatus !== 200) {
    throw new Error(`Provider HTTP ${kodeStatus}: ${teksRespon.slice(0, 200)}`);
  }

  const data = JSON.parse(teksRespon);
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const teksHasilMentah: string = data.choices?.[0]?.message?.content || '{}';
  const teksHasil = teksHasilMentah.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  return { teks: teksHasil, providerDipakai: `${model}` };
}