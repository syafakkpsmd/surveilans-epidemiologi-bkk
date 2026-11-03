import { updatePassword } from '@/lib/auth/actions';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF1F4] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#0F2A38] text-center mb-6">
          Atur Kata Sandi Baru
        </h1>
        <form
          action={updatePassword}
          className="bg-white rounded-[10px] shadow-sm border border-black/5 p-6 space-y-4"
        >
          {error ? (
            <div className="rounded-[8px] bg-[#D62839]/10 border border-[#D62839]/30 px-3 py-2 text-sm text-[#D62839]">
              {error}
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-[#0F2A38]">
              Kata sandi baru
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-[8px] bg-[#0F2A38] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F4C5C]"
          >
            Simpan Kata Sandi
          </button>
        </form>
      </div>
    </main>
  );
}