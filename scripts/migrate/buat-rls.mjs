// Bangkitkan lib/db/rls-policy.generated.ts dari 103 policy RLS di schema-dump/supabase_schema.json.
// Jalankan: node scripts/migrate/buat-rls.mjs
// Setiap policy diterjemahkan ke salah satu aturan: semua | login | role[...] | admin | diri | tolak.
// Policy yang tidak dikenali menjadi 'tolak' (gagal tertutup) dan DICETAK supaya ditinjau manual.
import { readFileSync, writeFileSync } from 'node:fs';

const dump = JSON.parse(readFileSync('schema-dump/supabase_schema.json', 'utf8'));
const rapikan = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const daftarRole = (s) => String(s).replace(/[{}]/g, '').split(',').map((x) => x.trim()).filter(Boolean);

function terjemah(teks, tabel) {
  const q = rapikan(teks);
  if (q === '' || q === 'true') return { t: 'semua' };
  if (/^\(?auth\.role\(\) = 'authenticated'(::text)?\)?$/.test(q)) return { t: 'login' };
  if (/^is_admin\(\)$/.test(q)) return { t: 'admin' };
  if (/^\(+id = \(* ?(SELECT )?auth\.uid\(\)( AS uid)?\)+$/i.test(q)) return { t: 'diri' };
  if (/^\(?\(id = auth\.uid\(\)\) OR is_admin\(\)\)?$/.test(q)) return { t: 'diri_atau_admin' };
  let m = /^\(EXISTS \( SELECT 1 FROM profiles( p)? WHERE \(\(\w+\.id = auth\.uid\(\)\) AND \(\w+\.role = '([a-z_]+)'(::text)?\)\)\)\)$/.exec(q);
  if (m) return { t: 'role', roles: [m[2]] };
  m = /^\(EXISTS \( SELECT 1 FROM profiles( p)? WHERE \(\(\w+\.id = auth\.uid\(\)\) AND \(\w+\.role = ANY \(ARRAY\[([^\]]+)\]\)\)\)\)\)$/.exec(q);
  if (m) return { t: 'role', roles: [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) };
  return { t: 'tolak', asal: `${tabel}: ${q}` };
}

const hasil = {};
const tak = [];
for (const p of dump.policy_rls) {
  const roles = daftarRole(p.roles);
  const cmds = p.cmd === 'ALL' ? ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] : [p.cmd];
  for (const cmd of cmds) {
    // SELECT/DELETE memakai USING (qual); INSERT memakai WITH CHECK; UPDATE memakai keduanya (USING menentukan baris).
    const sumber = cmd === 'INSERT' ? p.with_check : p.qual;
    const aturan = terjemah(sumber, p.tablename);
    if (aturan.t === 'tolak') tak.push(`${p.tablename} ${cmd} "${p.policyname}": ${aturan.asal}`);
    delete aturan.asal;
    ((hasil[p.tablename] ??= {})[cmd] ??= []).push({ untuk: roles, ...aturan });
  }
}
const tabelDump = new Set((dump.kolom ?? []).map((k) => k.table_name ?? k.tabel).filter(Boolean));
const badan = `// DIBANGKITKAN oleh scripts/migrate/buat-rls.mjs dari schema-dump/supabase_schema.json. JANGAN diedit manual.
// Setiap entri = policy RLS Supabase (permissive, digabung dengan OR). 'untuk' = role Postgres yang dikenai policy:
// 'anon' (belum login), 'authenticated' (sudah login) atau 'public' (keduanya).
export type AturanRls =
  | { untuk: string[]; t: 'semua' | 'login' | 'admin' | 'diri' | 'diri_atau_admin' | 'tolak' }
  | { untuk: string[]; t: 'role'; roles: string[] };
export type PerintahRls = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
export const POLICY_RLS: Record<string, Partial<Record<PerintahRls, AturanRls[]>>> =
${JSON.stringify(hasil, null, 2)};
`;
const ringkas = badan
  .replace(/\{\s+"untuk": (\[[^\]]*\]),\s+"t": "(\w+)"\s+\}/g, (_, u, t) => `{ untuk: ${u.replace(/\s+/g, ' ')}, t: '${t}' }`)
  .replace(/\{\s+"untuk": (\[[^\]]*\]),\s+"t": "role",\s+"roles": (\[[^\]]*\])\s+\}/g, (_, u, r) => `{ untuk: ${u.replace(/\s+/g, ' ')}, t: 'role', roles: ${r.replace(/\s+/g, ' ')} }`)
  .replace(/"([A-Za-z_]+)":/g, '$1:')
  .replace(/"/g, "'");
writeFileSync('lib/db/rls-policy.generated.ts', ringkas);
console.log(`Tabel dengan policy: ${Object.keys(hasil).length}`);
console.log(tak.length ? 'TIDAK DIKENALI (jadi tolak):\n' + tak.join('\n') : 'Semua policy dikenali.');
