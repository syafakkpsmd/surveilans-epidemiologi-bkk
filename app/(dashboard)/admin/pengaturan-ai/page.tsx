import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/get-user-role';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { tambahProvider, updateProvider, hapusProvider } from './actions';

export default async function PengaturanAiPage() {
  // PENTING: pengecekan role di sini BUKAN satu-satunya lapisan
  // proteksi -- setiap Server Action di actions.ts juga memverifikasi
  // ulang role='admin' sendiri (defense in depth). Kalau bukan admin
  // yang mengetik URL ini langsung, redirect ke /dashboard (BUKAN 500).
  const role = await getUserRole();
  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = createServiceRoleClient();
  const { data: daftarProvider } = await supabase
    .from('pengaturan_ai')
    .select('*')
    .order('id', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <a
          href="/dashboard"
          className="mb-2 inline-block text-sm font-medium text-teal hover:underline"
        >
          ← Kembali ke Dashboard Utama
        </a>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Khusus Admin
        </p>
        <h1 className="text-2xl font-bold text-ink">Atur Provider Analisis AI</h1>
        <p className="mt-1 text-sm text-muted">
          Hanya satu provider yang boleh aktif dalam satu waktu. Provider aktif
          dipakai untuk semua permintaan Analisis AI (Petugas &amp; Admin).
        </p>
      </div>

      {(daftarProvider ?? []).map((p) => (
        <form
          key={p.id}
          autoComplete="off"
          action={updateProvider.bind(null, p.id)}
          className="rounded-card border border-border bg-surface p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span
              className={
                p.aktif
                  ? 'rounded-pill bg-risiko-hijau/15 px-3 py-1 text-xs font-semibold text-risiko-hijau'
                  : 'rounded-pill bg-border/60 px-3 py-1 text-xs font-semibold text-muted'
              }
            >
              {p.aktif ? 'Aktif' : 'Nonaktif'}
            </span>
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
                defaultValue={p.nama_tampilan}
                required
                autoComplete="off"
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </Field>

            <Field label="Tipe provider">
              <select
                name="tipe_provider"
                defaultValue={p.tipe_provider}
                className="w-full rounded-control border border-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal"
              >
                <option value="gemini">Gemini (Google AI Studio)</option>
                <option value="openai_compatible">Kompatibel OpenAI (Groq, xAI, OpenRouter, dll)</option>
              </select>
            </Field>

            <Field label="Model">
              <input
                name="model"
                defaultValue={p.model}
                required
                placeholder="mis. gemini-2.0-flash"
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
            <input type="checkbox" name="aktif" defaultChecked={p.aktif} className="h-4 w-4" />
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
                placeholder="mis. gemini-2.0-flash"
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
            <input type="checkbox" name="aktif" className="h-4 w-4" />
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