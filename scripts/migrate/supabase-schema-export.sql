-- Ekspor SKEMA Supabase (tanpa data) sebagai SATU hasil JSON.
-- Cara pakai:
--   1. Supabase Dashboard -> SQL Editor -> New query -> tempel seluruh isi file ini -> Run
--   2. Klik sel hasil "skema_supabase", salin seluruh isinya (Copy),
--      tempel ke file baru schema-dump/supabase_schema.json di VS Code, lalu simpan.
-- Aman: hanya membaca katalog sistem, tidak mengubah apa pun dan tidak memuat isi tabel.
select jsonb_pretty(jsonb_build_object(
  'kolom', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from (
      select table_name, ordinal_position, column_name, data_type, udt_name,
             character_maximum_length, numeric_precision, numeric_scale,
             is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position) c),
  'constraint', (select coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb) from (
      select conrelid::regclass::text as tabel, conname, contype::text as tipe,
             pg_get_constraintdef(oid) as definisi
      from pg_constraint
      where connamespace = 'public'::regnamespace
      order by 1, 3, 2) k),
  'indeks', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from (
      select tablename, indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
      order by 1, 2) i),
  'view', (select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb) from (
      select table_name, view_definition
      from information_schema.views
      where table_schema = 'public'
      order by 1) v),
  'matview', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from (
      select matviewname, definition
      from pg_matviews
      where schemaname = 'public'
      order by 1) m),
  'fungsi', (select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) from (
      select p.proname, pg_get_functiondef(p.oid) as definisi
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind in ('f', 'p')
      order by 1) f),
  'policy_rls', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
      select tablename, policyname, cmd, roles::text as roles, qual, with_check
      from pg_policies
      where schemaname = 'public'
      order by 1, 2) r),
  'trigger', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
      select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
      from information_schema.triggers
      where trigger_schema = 'public'
      order by 1, 2) t),
  'perkiraan_jumlah_baris', (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) from (
      select relname as tabel, n_live_tup as perkiraan_baris
      from pg_stat_user_tables
      where schemaname = 'public'
      order by 1) n),
  'jumlah_akun_auth', (select count(*) from auth.users)
)) as skema_supabase;
