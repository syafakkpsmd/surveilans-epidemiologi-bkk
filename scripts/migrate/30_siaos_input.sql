-- scripts/migrate/30_siaos_input.sql
-- Menyiapkan tabel siaos untuk input langsung dan unggah Excel (modul input-data, lib/input-data/modul-siaos.ts).
-- Hanya MENAMBAH kolom/indeks/nilai bawaan dan tidak mengubah atau menghapus data. Aman dijalankan berulang.
--   node --env-file=.env.local scripts/migrate/jalankan-sql-pg.mjs scripts/migrate/30_siaos_input.sql
--
--   sumber   : asal baris. 'migrasi' = data lama (sinkron Google Sheets), 'input' = form, 'upload' = unggah Excel
--   batch_id : penanda satu unggahan; dipakai untuk membatalkan unggahan itu dari menu Riwayat
--   id       : hasil migrasi tidak punya nilai bawaan, sedangkan modul input tidak mengisi id sendiri
ALTER TABLE siaos ADD COLUMN IF NOT EXISTS sumber   varchar(20) NOT NULL DEFAULT 'migrasi';
ALTER TABLE siaos ADD COLUMN IF NOT EXISTS batch_id varchar(64);

CREATE INDEX IF NOT EXISTS idx_siaos_batch   ON siaos (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_siaos_tanggal ON siaos (tanggal);

-- id terisi otomatis, dimulai SETELAH id terbesar yang ada (tidak menyentuh id lama). Dilewati bila sudah ada nilai bawaan/identity.
DO $$
DECLARE
  bawaan   text;
  identitas text;
  mulai    bigint;
BEGIN
  SELECT column_default, is_identity INTO bawaan, identitas
    FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'siaos' AND column_name = 'id';
  IF bawaan IS NULL AND identitas = 'NO' THEN
    SELECT COALESCE(MAX(id), 0) + 1 INTO mulai FROM siaos;
    CREATE SEQUENCE IF NOT EXISTS siaos_id_seq;
    PERFORM setval('siaos_id_seq', mulai, false);
    ALTER SEQUENCE siaos_id_seq OWNED BY siaos.id;
    ALTER TABLE siaos ALTER COLUMN id SET DEFAULT nextval('siaos_id_seq');
  END IF;
END $$;