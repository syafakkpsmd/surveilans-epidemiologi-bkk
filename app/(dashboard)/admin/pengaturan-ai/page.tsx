import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { tambahProvider, updateProvider, hapusProvider } from './actions';

// 1. Tipe data eksplisit untuk mencegah error "Property 'urutan_prioritas' does not exist"
interface PengaturanAiRow {
  id: number;
  nama_tampilan: string;
  tipe_provider: string;
  model: string;
  base_url: string | null;
  api_key: string;
  urutan_prioritas?: number | null;
  aktif: boolean;
  dibuat_pada?: string;
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export default async function PengaturanAiPage() {
  const role = await getUserRole();
  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = createServiceRoleClient();
  const { data: daftarProviderMentah } = await supabase
    .from('pengaturan_ai')
    .select('*')
    .order('id', { ascending: false });

  // Cast ke tipe eksplisit PengaturanAiRow[]
  const daftarProvider = ((daftarProviderMentah as unknown as PengaturanAiRow[]) ?? [])
    .slice()
    .sort((a, b) => {
      const pa = a.urutan_prioritas ?? 999;
      const pb = b.urutan_prioritas ?? 999;
      return pa - pb;
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        {/* Fix baris 36: Tag Link lengkap */}
        <Link
          href="/dashboard"
          className="mb-2 inline-block text-sm font-medium text-teal hover:underline"
        >
          ← Kembali ke Dashboard Utama
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Khusus Admin
        </p>
        <h1 className="text-2xl font-bold text-ink">Atur Provider Analisis AI</h1>
        <p className="mt-1 text-sm text-muted">
          Boleh lebih dari satu provider aktif sekaligus. Sistem akan mencoba
          provider dengan Urutan Prioritas terkecil dulu (1 = dicoba pertama);
          kalau gagal (misalnya kena limit kuota), otomatis dicoba provider
          prioritas berikutnya secara berurutan.
        </p>
      </div>

      {daftarProvider.map((p) => (
        <form
          key={p.id}
          autoComplete="off"
          action={updateProvider.bind(null, p.id)}
          className="rounded-card border border-border bg-surface p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={
                  p.aktif
                    ? 'rounded-pill bg-risiko-hijau/15 px-3 py-1 text-xs font-semibold text-risiko-hijau'
                    : 'rounded-pill bg-border/60 px-3 py-1 text-xs font-semibold text-muted'
                }
              >
                {p.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
              {p.aktif && (
                <span className="rounded-pill bg-navy/10 px-3 py-1 text-xs font-semibold text-navy">
                  Prioritas {p.urutan_prioritas ?? 1}
                </span>
              )}
            </div>
            <button
              type="submit"
              formAction={hapusProvider.bind(null, p.id)}
              className="text-xs font-medium text-risiko-merah hover:underline"
            >
              Hapus
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama tampilan">
              <input
                name="nama_tampilan"
                defaultValue={p.nama_tampilan ?? ''}
                required
                autoComplete="off"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Tipe provider">
              <select
                name="tipe_provider"
                defaultValue={p.tipe_provider ?? 'gemini'}
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              >
                <option value="gemini">Gemini (Google AI Studio)</option>
                <option value="openai_compatible">Kompatibel OpenAI (Groq, xAI, OpenRouter, dll)</option>
              </select>
            </Field>

            <Field label="Model">
              <input
                name="model"
                defaultValue={p.model ?? ''}
                required
                placeholder="mis. gemini-1.5-flash"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Base URL (khusus tipe Kompatibel OpenAI)">
              <input
                name="base_url"
                defaultValue={p.base_url ?? ''}
                placeholder="https://api.groq.com/openai/v1"
                autoComplete="off"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Urutan Prioritas (1 = dicoba pertama)">
              <input
                name="urutan_prioritas"
                type="number"
                min={1}
                defaultValue={p.urutan_prioritas ?? 1}
                required
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="API key" className="sm:col-span-2">
              <input
                name="api_key"
                type="password"
                placeholder="•••• sudah diisi, isi ulang untuk mengganti"
                autoComplete="new-password"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="aktif" defaultChecked={Boolean(p.aktif)} className="h-4 w-4" />
            Jadikan provider aktif
          </label>

          <button
            type="submit"
            className="rounded-control bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Simpan Perubahan
          </button>
        </form>
      ))}

      <div className="rounded-card border border-dashed border-border bg-surface p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Tambah Provider Baru</h2>
        <form action={tambahProvider} autoComplete="off" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama tampilan">
              <input
                name="nama_tampilan"
                required
                placeholder="mis. Gemini Gratis"
                autoComplete="off"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Tipe provider">
              <select
                name="tipe_provider"
                defaultValue="gemini"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              >
                <option value="gemini">Gemini (Google AI Studio)</option>
                <option value="openai_compatible">Kompatibel OpenAI (Groq, xAI, OpenRouter, dll)</option>
              </select>
            </Field>

            <Field label="Model">
              <input
                name="model"
                required
                placeholder="mis. gemini-1.5-flash"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Base URL (khusus tipe Kompatibel OpenAI)">
              <input
                name="base_url"
                placeholder="https://api.groq.com/openai/v1"
                autoComplete="off"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Urutan Prioritas (1 = dicoba pertama)">
              <input
                name="urutan_prioritas"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="API key" className="sm:col-span-2">
              <input
                name="api_key"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="aktif" defaultChecked={true} className="h-4 w-4" />
            Jadikan provider aktif setelah disimpan
          </label>

          <button
            type="submit"
            className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal"
          >
            Tambah Provider
          </button>
        </form>
      </div>
    </div>
  );
}